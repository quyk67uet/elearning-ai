# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, cint, flt, now, get_datetime, add_to_date
import json
import os
import google.generativeai as genai
import time
import re
import random

class UserExamAttempt(Document):
	def __init__(self, *args, **kwargs):
		super(UserExamAttempt, self).__init__(*args, **kwargs)
		self._original_completion_timestamp = None
		if self.get("name"):
			self._original_completion_timestamp = frappe.db.get_value("User Exam Attempt", self.name, "completion_timestamp")
	
	def validate(self):
		"""Validate exam attempt on saving"""
		self.validate_user()
		self.validate_topic()
		
	def validate_user(self):
		"""Ensure user exists"""
		if not frappe.db.exists("User", self.user):
			frappe.throw(_("User does not exist"))
	
	def validate_topic(self):
		"""Ensure topic exists"""
		if not frappe.db.exists("Topics", self.topic):
			frappe.throw(_("Topic does not exist"))
	
	def on_update(self):
		"""Actions to perform when the document is updated"""
		# Update statistics when completion_timestamp is set for the first time
		if self.completion_timestamp and not self._original_completion_timestamp:
			self.calculate_exam_statistics()
	
	def calculate_exam_statistics(self):
		"""Log completion of the exam attempt"""
		# Log completion for analytics
		frappe.logger().info(f"Exam completed: {self.name} by {self.user} for topic {self.topic}")
		
		# Get total number of questions for logging purposes
		total_questions = frappe.db.count("User Exam Attempt Detail", {"parent": self.name})
		frappe.logger().info(f"Total questions for attempt {self.name}: {total_questions}")
	
	def get_analytics(self):
		"""Return analytics data for this attempt"""
		analytics = {
			"total_questions": len(self.attempt_details) if self.attempt_details else 0,
			"completion_time": self.completion_timestamp,
			"topic": self.topic,
			"created": self.creation
		}
		
		# Add more analytics data as needed
		
		return analytics

def get_current_user():
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)
	return user

@frappe.whitelist()
def start_exam_attempt(topic_name):
	"""
	Start a new exam attempt for a specific topic
	
	Args:
		topic_name (str): Name of the topic
		
	Returns:
		dict: Information about the created exam attempt
	"""
	user_id = get_current_user()
	
	# Check if topic exists
	if not frappe.db.exists("Topics", topic_name):
		frappe.throw(_("Topic does not exist"))
	
	# Get user flashcard settings
	settings_list = frappe.get_all(
		"User Flashcard Setting",
		filters={"user": user_id, "topic": topic_name},
		fields=["flashcard_arrange_mode", "study_exam_flashcard_type_filter"]
	)
	
	flashcard_arrange_mode = "chronological"
	flashcard_type_filter = "All"
	
	if settings_list:
		flashcard_arrange_mode = settings_list[0].flashcard_arrange_mode
		flashcard_type_filter = settings_list[0].study_exam_flashcard_type_filter
	
	# Get flashcards for this topic
	filters = {"topic": topic_name}
	
	# Apply flashcard type filter if specified
	if flashcard_type_filter != "All":
		filters["flashcard_type"] = flashcard_type_filter
	
	flashcards = frappe.get_all(
		"Flashcard",
		filters=filters,
		fields=["name", "question", "answer", "explanation", "flashcard_type", "hint", "solution_with_error"]
	)
	
	if not flashcards:
		frappe.throw(_("No flashcards found for this topic"))
	
	# Process additional data for specific flashcard types
	for flashcard in flashcards:
		if flashcard.get("flashcard_type") == "Ordering Steps":
			ordering_steps = frappe.get_all(
				"Ordering Step Item",
				filters={"parent": flashcard.get("name")},
				fields=["step_content", "correct_order"],
				order_by="correct_order"
			)
			flashcard["ordering_steps_items"] = ordering_steps
	
	# Shuffle flashcards if random mode is selected
	if flashcard_arrange_mode == "random":
		random.shuffle(flashcards)
	
	# Create exam attempt
	attempt = frappe.new_doc("User Exam Attempt")
	attempt.user = user_id
	attempt.topic = topic_name
	attempt.start_time = now()
	attempt.insert(ignore_permissions=True)
	
	# Create exam attempt details for each flashcard
	for flashcard in flashcards:
		detail = frappe.new_doc("User Exam Attempt Detail")
		detail.parent = attempt.name
		detail.parenttype = "User Exam Attempt"
		detail.parentfield = "attempt_details"
		detail.flashcard = flashcard.name
		detail.user_answer = ""
		detail.is_correct = 0
		detail.is_skipped = 0
		detail.user_self_assessment = "Chưa hiểu"
		detail.ai_feedback = ""
		detail.insert(ignore_permissions=True)
	
	frappe.db.commit()
	
	return {
		"success": True,
		"message": _("Exam attempt started successfully"),
		"attempt": {
			"name": attempt.name,
			"topic": attempt.topic,
			"start_time": attempt.start_time,
			"flashcards": flashcards
		}
	}

@frappe.whitelist()
def submit_exam_answer_and_get_feedback(attempt_name, flashcard_name, user_answer, is_skipped=0):
	"""
	Submit answer for a flashcard in an exam attempt and get AI feedback
	
	Args:
		attempt_name (str): Name of the exam attempt
		flashcard_name (str): Name of the flashcard
		user_answer (str): User's answer
		is_skipped (int): Whether the question was skipped
		
	Returns:
		dict: Result with AI feedback
	"""
	user_id = get_current_user()
	
	# Check if attempt exists and belongs to user
	attempt = frappe.get_doc("User Exam Attempt", attempt_name)
	if attempt.user != user_id:
		frappe.throw(_("This exam attempt does not belong to you"))
	
	if attempt.completion_timestamp:
		frappe.throw(_("This exam attempt is already completed"))
	
	# Check if flashcard exists
	if not frappe.db.exists("Flashcard", flashcard_name):
		frappe.throw(_("Flashcard does not exist"))
	
	flashcard = frappe.get_doc("Flashcard", flashcard_name)
	
	# Find the detail record
	detail_list = frappe.get_all(
		"User Exam Attempt Detail",
		filters={"parent": attempt_name, "flashcard": flashcard_name},
		fields=["name"]
	)
	
	if not detail_list:
		frappe.throw(_("This flashcard is not part of the exam attempt"))
	
	detail = frappe.get_doc("User Exam Attempt Detail", detail_list[0].name)
	
	# Mark as skipped if requested
	if is_skipped:
		detail.user_answer = ""
		detail.save(ignore_permissions=True)
		frappe.db.commit()
		
		return {
			"success": True,
			"message": _("Question skipped"),
			"is_skipped": True,
			"ai_feedback_what_was_correct": "",
			"ai_feedback_what_was_incorrect": "",
			"ai_feedback_what_to_include": ""
		}
	
	# Save user answer
	detail.user_answer = user_answer
	
	# Generate AI feedback using Gemini
	ai_feedback = generate_ai_feedback(flashcard, user_answer)
	
	# Store feedback in the appropriate fields
	detail.ai_feedback_what_was_correct = ai_feedback.get("ai_feedback_what_was_correct", "")
	detail.ai_feedback_what_was_incorrect = ai_feedback.get("ai_feedback_what_was_incorrect", "")
	detail.ai_feedback_what_to_include = ai_feedback.get("ai_feedback_what_to_include", "")
	
	detail.save(ignore_permissions=True)
	frappe.db.commit()
	
	return {
		"success": True,
		"message": _("Answer submitted successfully"),
		"is_skipped": False,
		"ai_feedback_what_was_correct": detail.ai_feedback_what_was_correct,
		"ai_feedback_what_was_incorrect": detail.ai_feedback_what_was_incorrect,
		"ai_feedback_what_to_include": detail.ai_feedback_what_to_include
	}

@frappe.whitelist()
def submit_self_assessment_and_init_srs(attempt_name, flashcard_name, self_assessment_value):
	"""
	Submit self-assessment for a flashcard in an exam attempt and initialize SRS progress
	
	Args:
		attempt_name (str): Name of the exam attempt
		flashcard_name (str): Name of the flashcard
		self_assessment_value (str): Self-assessment value (one of: "Chưa hiểu", 
			"Mơ hồ", "Khá ổn", "Rất rõ")
		
	Returns:
		dict: Result of self-assessment and SRS initialization
	"""
	user_id = get_current_user()
	
	# Validate self_assessment_value
	valid_values = [
		"Chưa hiểu", 
		"Mơ hồ", 
		"Khá ổn", 
		"Rất rõ"
	]
	
	if self_assessment_value not in valid_values:
		frappe.throw(_("Invalid self-assessment value"))
	
	# Check if attempt exists and belongs to user
	attempt = frappe.get_doc("User Exam Attempt", attempt_name)
	if attempt.user != user_id:
		frappe.throw(_("This exam attempt does not belong to you"))
	
	# Uncomment nếu muốn ngăn không cho sửa self assessment sau khi hoàn thành exam
	# if attempt.completion_timestamp:
	# 	frappe.throw(_("This exam attempt is already completed"))
	
	# Check if flashcard exists
	if not frappe.db.exists("Flashcard", flashcard_name):
		frappe.throw(_("Flashcard does not exist"))
	
	# Find the detail record
	detail_list = frappe.get_all(
		"User Exam Attempt Detail",
		filters={"parent": attempt_name, "flashcard": flashcard_name},
		fields=["name"]
	)
	
	if not detail_list:
		frappe.throw(_("This flashcard is not part of the exam attempt"))
	
	detail = frappe.get_doc("User Exam Attempt Detail", detail_list[0].name)
	
	# Update self-assessment
	detail.user_self_assessment = self_assessment_value
	detail.save(ignore_permissions=True)
	
	# Initialize or update SRS progress based on self-assessment
	# Map self-assessment values to SRS initial values
	srs_values = {
		"Chưa hiểu": {
			"status": "learning",
			"interval_days": 0,  # Review immediately
			"ease_factor": 2.2,
			"repetitions": 0,
			"learning_step": 0
		},
		"Mơ hồ": {
			"status": "learning",
			"interval_days": 1,  # Review next day
			"ease_factor": 2.3,
			"repetitions": 0,
			"learning_step": 1
		},
		"Khá ổn": {
			"status": "review",
			"interval_days": 3,  # Review in 3 days
			"ease_factor": 2.5,
			"repetitions": 1,
			"learning_step": 0
		},
		"Rất rõ": {
			"status": "review",
			"interval_days": 7,  # Review in a week
			"ease_factor": 2.7,
			"repetitions": 1,
			"learning_step": 0
		}
	}
	
	# Get SRS values for this self-assessment
	srs_initial = srs_values.get(self_assessment_value)
	
	# Check if SRS progress already exists
	progress_list = frappe.get_all(
		"User SRS Progress",
		filters={"user": user_id, "flashcard": flashcard_name},
		fields=["name"]
	)
	
	now_dt = get_datetime(now())
	next_review = add_to_date(now_dt, days=int(srs_initial["interval_days"]))
	
	if progress_list:
		# Update existing progress
		progress = frappe.get_doc("User SRS Progress", progress_list[0].name)
		progress.status = srs_initial["status"]
		progress.interval_days = srs_initial["interval_days"]
		progress.ease_factor = srs_initial["ease_factor"]
		progress.repetitions = srs_initial["repetitions"]
		progress.learning_step = srs_initial["learning_step"]
		progress.last_review_timestamp = now_dt
		progress.next_review_timestamp = next_review
	else:
		# Create new progress
		progress = frappe.new_doc("User SRS Progress")
		progress.user = user_id
		progress.flashcard = flashcard_name
		progress.status = srs_initial["status"]
		progress.interval_days = srs_initial["interval_days"]
		progress.ease_factor = srs_initial["ease_factor"]
		progress.repetitions = srs_initial["repetitions"]
		progress.learning_step = srs_initial["learning_step"]
		progress.last_review_timestamp = now_dt
		progress.next_review_timestamp = next_review
	
	progress.save(ignore_permissions=True)
	frappe.db.commit()
	
	return {
		"success": True,
		"message": _("Self-assessment submitted and SRS progress initialized"),
		"self_assessment": self_assessment_value,
		"srs_progress": {
			"status": progress.status,
			"interval_days": progress.interval_days,
			"next_review": progress.next_review_timestamp
		}
	}

@frappe.whitelist()
def complete_exam_attempt(attempt_name):
	"""
	Complete an exam attempt
	
	Args:
		attempt_name (str): Name of the exam attempt
		
	Returns:
		dict: Result with attempt details
	"""
	user_id = get_current_user()
	
	# Check if attempt exists and belongs to user
	attempt = frappe.get_doc("User Exam Attempt", attempt_name)
	if attempt.user != user_id:
		frappe.throw(_("This exam attempt does not belong to you"))
	
	if attempt.completion_timestamp:
		frappe.throw(_("This exam attempt is already completed"))
	
	# Calculate time spent
	start_time = get_datetime(attempt.start_time)
	end_time = now_datetime()
	time_spent_seconds = (end_time - start_time).total_seconds()
	
	# Update attempt
	attempt.time_spent_seconds = time_spent_seconds
	attempt.completion_timestamp = now()
	attempt.save(ignore_permissions=True)
	
	# Log completion
	attempt.calculate_exam_statistics()
	
	# Count total questions
	total_questions = frappe.db.count("User Exam Attempt Detail", {"parent": attempt_name})
	
	return {
		"success": True,
		"message": _("Exam attempt completed successfully"),
		"attempt": {
			"name": attempt.name,
			"topic": attempt.topic,
			"start_time": attempt.start_time,
			"completion_timestamp": attempt.completion_timestamp,
			"time_spent_seconds": attempt.time_spent_seconds,
			"total_questions": total_questions
		}
	}

@frappe.whitelist()
def get_exam_attempt_details(attempt_name):
	"""
	Get details of an exam attempt
	
	Args:
		attempt_name (str): Name of the exam attempt
		
	Returns:
		dict: Detailed information about the exam attempt
	"""
	user_id = get_current_user()
	
	# Check if attempt exists and belongs to user
	attempt = frappe.get_doc("User Exam Attempt", attempt_name)
	if attempt.user != user_id:
		frappe.throw(_("This exam attempt does not belong to you"))
	
	# Get all flashcards
	detail_records = frappe.get_all(
		"User Exam Attempt Detail",
		filters={"parent": attempt_name},
		fields=["name", "flashcard", "user_answer", "ai_feedback_what_was_correct", "ai_feedback_what_was_incorrect", "ai_feedback_what_to_include", "user_self_assessment"]
	)
	
	# Get all flashcard details
	details = []
	for record in detail_records:
		flashcard = frappe.get_doc("Flashcard", record.flashcard)
		
		detail_data = {
			"name": record.name,
			"flashcard": record.flashcard,
			"question": flashcard.question,
			"answer": flashcard.answer,
			"explanation": flashcard.explanation,
			"flashcard_type": flashcard.flashcard_type,
			"user_answer": record.user_answer,
			"ai_feedback_what_was_correct": record.ai_feedback_what_was_correct,
			"ai_feedback_what_was_incorrect": record.ai_feedback_what_was_incorrect,
			"ai_feedback_what_to_include": record.ai_feedback_what_to_include,
			"user_self_assessment": record.user_self_assessment,
			"hint": flashcard.hint
		}
		
		# Add ordering steps if applicable
		if flashcard.flashcard_type == "Ordering Steps":
			ordering_steps = frappe.get_all(
				"Ordering Step Item",
				filters={"parent": flashcard.name},
				fields=["step_content", "correct_order"],
				order_by="correct_order"
			)
			detail_data["ordering_steps_items"] = ordering_steps
		
		details.append(detail_data)
	
	# Format time spent in a readable format
	time_spent_mins = int(attempt.time_spent_seconds / 60) if attempt.time_spent_seconds else 0
	time_spent_secs = int(attempt.time_spent_seconds % 60) if attempt.time_spent_seconds else 0
	formatted_time = f"{time_spent_mins}m {time_spent_secs}s"
	
	# Get topic name
	topic_name = frappe.db.get_value("Topics", attempt.topic, "topic_name")
	
	return {
		"success": True,
		"attempt": {
			"name": attempt.name,
			"topic": attempt.topic,
			"topic_name": topic_name,
			"start_time": attempt.start_time,
			"completion_timestamp": attempt.completion_timestamp,
			"total_questions": len(details),
			"time_spent_seconds": attempt.time_spent_seconds,
			"formatted_time": formatted_time,
			"details": details
		}
	}

@frappe.whitelist()
def get_user_exam_history(topic_name=None, limit=10, offset=0):
	"""
	Get user's exam history
	
	Args:
		topic_name (str, optional): Filter by topic name
		limit (int, optional): Limit number of results
		offset (int, optional): Offset for pagination
		
	Returns:
		dict: User's exam history
	"""
	user_id = get_current_user()
	
	# Build query using only columns that exist in the doctype
	if topic_name:
		query = """
			SELECT name, topic, start_time, completion_timestamp as end_time, 
			       time_spent_seconds
			FROM `tabUser Exam Attempt`
			WHERE user = %s 
			AND completion_timestamp IS NOT NULL
			AND topic = %s
			ORDER BY start_time DESC
			LIMIT %s OFFSET %s
		"""
		attempts = frappe.db.sql(query, (user_id, topic_name, cint(limit), cint(offset)), as_dict=True)
		
		# Count total records matching criteria
		count_query = """
			SELECT COUNT(*) as count
			FROM `tabUser Exam Attempt`
			WHERE user = %s 
			AND completion_timestamp IS NOT NULL
			AND topic = %s
		"""
		count_result = frappe.db.sql(count_query, (user_id, topic_name), as_dict=True)
		total_count = count_result[0].count if count_result else 0
	else:
		query = """
			SELECT name, topic, start_time, completion_timestamp as end_time, 
			       time_spent_seconds
			FROM `tabUser Exam Attempt`
			WHERE user = %s 
			AND completion_timestamp IS NOT NULL
			ORDER BY start_time DESC
			LIMIT %s OFFSET %s
		"""
		attempts = frappe.db.sql(query, (user_id, cint(limit), cint(offset)), as_dict=True)
		
		# Count total records matching criteria
		count_query = """
			SELECT COUNT(*) as count
			FROM `tabUser Exam Attempt`
			WHERE user = %s 
			AND completion_timestamp IS NOT NULL
		"""
		count_result = frappe.db.sql(count_query, (user_id,), as_dict=True)
		total_count = count_result[0].count if count_result else 0
	
	# Get topic names and count total questions
	topics = {}
	for attempt in attempts:
		if attempt.topic not in topics:
			topic_doc = frappe.get_doc("Topics", attempt.topic)
			topics[attempt.topic] = topic_doc.topic_name
		
		attempt["topic_name"] = topics[attempt.topic]
		
		# Count the number of questions for this attempt
		attempt["total_questions"] = frappe.db.count("User Exam Attempt Detail", {"parent": attempt.name})
		
		# Format time spent in a more readable format
		time_spent_mins = int(attempt.time_spent_seconds / 60)
		time_spent_secs = int(attempt.time_spent_seconds % 60)
		attempt["formatted_time"] = f"{time_spent_mins}m {time_spent_secs}s"
	
	return {
		"success": True,
		"total_count": total_count,
		"attempts": attempts
	}

def generate_ai_feedback(flashcard, user_answer):
	"""
	Generate AI feedback for a flashcard answer using Gemini API
	
	Args:
		flashcard (Document): Flashcard document
		user_answer (str): User's answer
		
	Returns:
		dict: AI feedback with three components:
			- ai_feedback_what_was_correct: What was correct in the answer
			- ai_feedback_what_was_incorrect: What was incorrect in the answer
			- ai_feedback_what_to_include: What could be included/improved
	"""
	try:
		# Check if Gemini API key is configured
		api_key = frappe.conf.get("gemini_api_key")
		if not api_key:
			api_key = frappe.db.get_single_value("Elearning Settings", "gemini_api_key")
			
		if not api_key:
			return {
				"ai_feedback_what_was_correct": "Chức năng phản hồi AI không khả dụng.",
				"ai_feedback_what_was_incorrect": "Vui lòng cấu hình Gemini API key trong site_config.json hoặc Elearning Settings.",
				"ai_feedback_what_to_include": "Liên hệ quản trị viên để được hỗ trợ."
			}
		
		# Initialize Gemini API
		genai.configure(api_key=api_key)
		model = genai.GenerativeModel('gemini-1.5-pro')
		
		# Create system prompt for AI feedback generation
		system_prompt = """
		Bạn là trợ lý AI giáo dục phân tích câu trả lời của học sinh.
		Hãy cung cấp phản hồi cụ thể, mang tính xây dựng về câu trả lời của học sinh so với câu trả lời đúng.
		
		Phản hồi của bạn nên được chia thành ba phần rõ ràng:
		1. Phần đúng: Nêu bật những khía cạnh cụ thể mà học sinh đã làm đúng
		2. Phần chưa đúng: Xác định những lỗi cụ thể hoặc hiểu sai
		3. Phần nên bổ sung: Đề xuất cải tiến cụ thể hoặc thông tin bổ sung
		
		Mỗi phần nên ngắn gọn (2-4 câu). Hãy cụ thể và mang tính giáo dục thay vì chỉ đơn thuần nêu đúng/sai.
		Phản hồi nên giúp học sinh hiểu khái niệm tốt hơn.
		
		Khi cần sử dụng công thức toán học, hãy sử dụng cú pháp LaTeX với \\( \\) cho công thức inline và \\[ \\] cho công thức standalone.
		Ví dụ: "Để tính đạo hàm, ta áp dụng công thức \\( f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} \\)"
		
		Nếu không thể tạo phản hồi do lỗi, hãy cung cấp thông báo lỗi đơn giản.
		
		QUAN TRỌNG: Phản hồi của bạn PHẢI bằng tiếng Việt.
		"""
		
		# Construct the user prompt based on flashcard type
		user_prompt = ""
		
		if flashcard.flashcard_type == "Concept/Theorem/Formula":
			user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi về khái niệm/định lý/công thức. Hãy đánh giá câu trả lời của học sinh so với đáp án đúng."""
		
		elif flashcard.flashcard_type == "Fill in the Blank":
			user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi điền vào chỗ trống. Hãy đánh giá câu trả lời của học sinh so với đáp án đúng."""
		
		elif flashcard.flashcard_type == "Ordering Steps":
			# For ordering steps, we construct a representation of the correct order
			correct_steps = frappe.get_all(
				"Ordering Step Item",
				filters={"parent": flashcard.name},
				fields=["step_content", "correct_order"],
				order_by="correct_order"
			)
			
			correct_steps_text = "\n".join([f"{idx+1}. {step.step_content}" for idx, step in enumerate(correct_steps)])
			user_prompt = f"""Câu hỏi: {flashcard.question}
Thứ tự các bước đúng:
{correct_steps_text}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi sắp xếp các bước theo thứ tự đúng. Hãy đánh giá câu trả lời của học sinh."""
		
		elif flashcard.flashcard_type == "What's the Next Step?":
			user_prompt = f"""Câu hỏi: {flashcard.question}
Bước tiếp theo đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi về bước tiếp theo trong giải quyết vấn đề. Hãy đánh giá liệu học sinh đã xác định đúng bước tiếp theo chưa."""
		
		elif flashcard.flashcard_type == "Short Answer/Open-ended":
			user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án mẫu: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi mở. Hãy đánh giá câu trả lời của học sinh so với đáp án mẫu, xem xét các cách tiếp cận thay thế hợp lệ."""
		
		elif flashcard.flashcard_type == "Identify the Error":
			user_prompt = f"""Câu hỏi: {flashcard.question}
Giải pháp có lỗi: {flashcard.solution_with_error}
Cách xác định lỗi đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi xác định lỗi. Hãy đánh giá liệu học sinh đã xác định đúng lỗi chưa."""
		
		else:  # Default for other types
			user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Hãy đánh giá câu trả lời của học sinh so với đáp án đúng."""
		
		# Configure generation parameters
		generation_config = {
			"temperature": 0.2,
			"top_p": 0.8,
			"top_k": 40,
			"max_output_tokens": 1024,
		}
		
		try:
			# Generate content with the model
			response = model.generate_content(
				[system_prompt, user_prompt],
				generation_config=generation_config
			)
			
			if response.text:
				# Parse the response into the three components
				feedback_text = response.text
				
				# Split into sections with section headers in Vietnamese
				what_was_correct = ""
				what_was_incorrect = ""
				what_to_include = ""
				
				# Simple parsing of sections (Vietnamese sections)
				if "Phần đúng" in feedback_text:
					sections = feedback_text.split("Phần")
					for section in sections:
						if section.strip().startswith("đúng"):
							next_heading_pos = section.find("Phần", 10)
							if next_heading_pos > 0:
								what_was_correct = section[5:next_heading_pos].strip()
							else:
								what_was_correct = section[5:].strip()
						
						elif section.strip().startswith("chưa đúng"):
							next_heading_pos = section.find("Phần", 10)
							if next_heading_pos > 0:
								what_was_incorrect = section[10:next_heading_pos].strip()
							else:
								what_was_incorrect = section[10:].strip()
				
				if "Phần nên bổ sung" in feedback_text:
					what_to_include_pos = feedback_text.find("Phần nên bổ sung")
					if what_to_include_pos > 0:
						what_to_include = feedback_text[what_to_include_pos + 16:].strip()
				
				# If Vietnamese sections not found, try with English headers as fallback
				if not what_was_correct and not what_was_incorrect and not what_to_include:
					if "What was correct" in feedback_text:
						sections = feedback_text.split("What was")
						for section in sections:
							if section.strip().startswith("correct"):
								next_heading_pos = section.find("What", 10)
								if next_heading_pos > 0:
									what_was_correct = section[8:next_heading_pos].strip()
								else:
									what_was_correct = section[8:].strip()
							
							elif section.strip().startswith("incorrect"):
								next_heading_pos = section.find("What", 10)
								if next_heading_pos > 0:
									what_was_incorrect = section[10:next_heading_pos].strip()
								else:
									what_was_incorrect = section[10:].strip()
					
					if "What to include" in feedback_text:
						what_to_include_pos = feedback_text.find("What to include")
						if what_to_include_pos > 0:
							what_to_include = feedback_text[what_to_include_pos + 15:].strip()
				
				# If sections still couldn't be parsed, try simple rule-based extraction
				if not what_was_correct and not what_was_incorrect and not what_to_include:
					lines = feedback_text.split("\n")
					current_section = None
					
					for line in lines:
						if "đúng" in line.lower() and not current_section:
							current_section = "correct"
							continue
						elif "chưa đúng" in line.lower() or "sai" in line.lower() and current_section == "correct":
							current_section = "incorrect"
							continue
						elif "bổ sung" in line.lower() or "cải thiện" in line.lower() and current_section == "incorrect":
							current_section = "include"
							continue
						
						if current_section == "correct" and line.strip():
							what_was_correct += line + "\n"
						elif current_section == "incorrect" and line.strip():
							what_was_incorrect += line + "\n"
						elif current_section == "include" and line.strip():
							what_to_include += line + "\n"
				
				# If all parsing attempts failed, use the full text
				if not what_was_correct and not what_was_incorrect and not what_to_include:
					return {
						"ai_feedback_what_was_correct": "Chúng tôi gặp khó khăn khi phân tích phản hồi AI.",
						"ai_feedback_what_was_incorrect": "Phản hồi đầy đủ: " + feedback_text,
						"ai_feedback_what_to_include": "Vui lòng thử lại hoặc kiểm tra định dạng câu trả lời của bạn."
					}
				
				# Trim and clean up
				what_was_correct = what_was_correct.strip()
				what_was_incorrect = what_was_incorrect.strip()
				what_to_include = what_to_include.strip()
				
				return {
					"ai_feedback_what_was_correct": what_was_correct or "Không có phần nào được xác định là đúng.",
					"ai_feedback_what_was_incorrect": what_was_incorrect or "Không có phần nào được xác định là chưa đúng.",
					"ai_feedback_what_to_include": what_to_include or "Không có đề xuất cụ thể cho việc cải thiện."
				}
			else:
				return {
					"ai_feedback_what_was_correct": "Chúng tôi nhận được phản hồi trống từ hệ thống AI.",
					"ai_feedback_what_was_incorrect": "Điều này có thể do lọc nội dung hoặc lỗi nội bộ.",
					"ai_feedback_what_to_include": "Vui lòng thử lại hoặc liên hệ hỗ trợ."
				}
		
		except Exception as api_error:
			frappe.log_error(f"Gemini API error: {str(api_error)}", "AI Feedback Generation Error")
			return {
				"ai_feedback_what_was_correct": "Chúng tôi gặp lỗi khi tạo phản hồi.",
				"ai_feedback_what_was_incorrect": f"Lỗi: {str(api_error)}",
				"ai_feedback_what_to_include": "Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
			}
	
	except Exception as e:
		frappe.log_error(f"AI feedback generation error: {str(e)}", "AI Feedback Generation Error")
		return {
			"ai_feedback_what_was_correct": "Chúng tôi gặp lỗi trong hệ thống phản hồi.",
			"ai_feedback_what_was_incorrect": f"Chi tiết lỗi: {str(e)}",
			"ai_feedback_what_to_include": "Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
		}

@frappe.whitelist()
def get_exam_attempt_time_by_month(year=None):
	"""Lấy dữ liệu thời gian làm bài thi theo tháng trong năm"""
	user = get_current_user()
	
	if not year:
		year = frappe.utils.getdate().year
	
	# Lấy dữ liệu từ User Exam Attempt
	query = """
		SELECT 
			MONTH(creation) as month,
			SUM(time_spent_seconds) as time_spent
		FROM `tabUser Exam Attempt` 
		WHERE user = %s 
		AND YEAR(creation) = %s
		AND completion_timestamp IS NOT NULL
		GROUP BY MONTH(creation)
	"""
	
	data = frappe.db.sql(query, (user, year), as_dict=True)
	
	# Chuyển đổi thành định dạng cần thiết
	result = {}
	for item in data:
		result[item.month] = item.time_spent
	
	# Tạo kết quả cho tất cả 12 tháng
	formatted_result = []
	for month in range(1, 13):
		formatted_result.append({
			"month": month,
			"month_name": frappe.utils.formatdate(f"{year}-{month:02d}-01", "MMM"),
			"time_spent": result.get(month, 0)
		})
	
	return formatted_result
