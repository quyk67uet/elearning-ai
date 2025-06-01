# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import now_datetime, getdate, add_days, get_datetime


class FlashcardSession(Document):
	pass


def get_current_user():
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)
	return user


@frappe.whitelist()
def start_flashcard_session(topic_id, mode="Basic"):
	"""Khởi tạo phiên học flashcard mới"""
	user = get_current_user()
	
	# Xử lý topic_id nếu là số
	if topic_id and topic_id.isdigit():
		# Tìm topic với ID là số này
		topics = frappe.get_all(
			"Topics",
			filters={"name": ["like", f"%{topic_id}"]},
			fields=["name"]
		)
		if topics:
			topic_id = topics[0].name
		else:
			# Thử tạo ID theo định dạng cũ
			formatted_topic_id = f"TOPIC-{int(topic_id):05d}"
			if frappe.db.exists("Topics", formatted_topic_id):
				topic_id = formatted_topic_id
	
	# Tạo session mới
	try:
		session = frappe.new_doc("Flashcard Session")
		session.user = user
		session.topic = topic_id
		session.start_time = now_datetime()
		session.mode = mode
		session.time_spent_seconds = 0
		session.insert(ignore_permissions=True)
		frappe.db.commit()
		
		return {"success": True, "session_id": session.name}
	except Exception as e:
		frappe.logger().error(f"Error creating flashcard session: {str(e)}")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def update_flashcard_session_time(session_id, time_spent_seconds):
	"""Cập nhật thời gian đã dành cho phiên học flashcard"""
	user = get_current_user()
	
	session = frappe.get_doc("Flashcard Session", session_id)
	if session.user != user:
		frappe.throw(_("Không có quyền cập nhật phiên học này"))
	
	session.time_spent_seconds += int(time_spent_seconds)
	session.save(ignore_permissions=True)
	frappe.db.commit()
	
	return {"success": True}


@frappe.whitelist()
def end_flashcard_session(session_id):
	"""Kết thúc phiên học flashcard"""
	user = get_current_user()
	
	session = frappe.get_doc("Flashcard Session", session_id)
	if session.user != user:
		frappe.throw(_("Không có quyền cập nhật phiên học này"))
	
	session.end_time = now_datetime()
	session.save(ignore_permissions=True)
	frappe.db.commit()
	
	return {"success": True}


@frappe.whitelist()
def get_flashcard_time_by_month(year=None):
	"""Lấy dữ liệu thời gian sử dụng flashcard theo tháng, phân loại theo mode"""
	user = get_current_user()
	
	if not year:
		year = getdate().year
	
	# Lấy dữ liệu từ Flashcard Session theo từng mode
	query = """
		SELECT 
			MONTH(start_time) as month,
			mode,
			SUM(time_spent_seconds) as time_spent
		FROM `tabFlashcard Session`
		WHERE user = %s AND YEAR(start_time) = %s
		GROUP BY MONTH(start_time), mode
	"""
	
	try:
		data = frappe.db.sql(query, (user, year), as_dict=True)
		
		# Log dữ liệu gốc để kiểm tra
		frappe.logger().debug(f"Flashcard session data for user {user}: {data}")
		frappe.logger().info(f"Raw flashcard time data: {data}")
		
		# Phân loại dữ liệu theo tháng và mode
		result = {}
		for item in data:
			month = item.month
			mode = item.mode
			time_spent = item.time_spent or 0  # Đảm bảo không có giá trị None
			
			if month not in result:
				result[month] = {
					"Basic": 0,
					"Exam": 0,
					"SRS": 0
				}
			
			result[month][mode] = time_spent
		
		# Tạo kết quả cho tất cả 12 tháng
		formatted_result = []
		for month in range(1, 13):
			month_data = result.get(month, {"Basic": 0, "Exam": 0, "SRS": 0})
			
			formatted_result.append({
				"month": month,
				"month_name": frappe.utils.formatdate(f"{year}-{month:02d}-01", "MMM"),
				"basic_time": month_data["Basic"] or 0,
				"exam_time": month_data["Exam"] or 0,
				"srs_time": month_data["SRS"] or 0,
				"study_time": (month_data["Basic"] or 0) + (month_data["SRS"] or 0),
				"test_time": month_data["Exam"] or 0
			})
		
		# Kiểm tra và log số lượng dữ liệu có time > 0
		non_zero_months = [m for m in formatted_result if m["basic_time"] > 0 or m["exam_time"] > 0 or m["srs_time"] > 0]
		frappe.logger().info(f"Found {len(non_zero_months)} months with non-zero time data for user {user}")
		
		return formatted_result
	except Exception as e:
		frappe.logger().error(f"Error in get_flashcard_time_by_month: {str(e)}")
		# Trả về dữ liệu trống nếu có lỗi
		formatted_result = []
		for month in range(1, 13):
			formatted_result.append({
				"month": month,
				"month_name": frappe.utils.formatdate(f"{year}-{month:02d}-01", "MMM"),
				"basic_time": 0,
				"exam_time": 0,
				"srs_time": 0,
				"study_time": 0,
				"test_time": 0
			})
		return formatted_result
