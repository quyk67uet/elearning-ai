# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class UserExamAttemptDetail(Document):
	def before_save(self):
		"""Validate and process the record before saving"""
		self.validate_flashcard()
		self.set_parent_user_exam_attempt_data()
	
	def validate_flashcard(self):
		"""Ensure the flashcard exists"""
		if not frappe.db.exists("Flashcard", self.flashcard):
			frappe.throw("Flashcard does not exist")
	
	def set_parent_user_exam_attempt_data(self):
		"""Ensure the parent user_exam_attempt exists and update its data"""
		if self.parent and frappe.db.exists("User Exam Attempt", self.parent):
			# You can add logic here to update parent data if needed
			# For example, updating attempt statistics
			pass
