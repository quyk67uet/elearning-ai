# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

def get_current_user():
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)
	return user

class Flashcard(Document):
	pass

@frappe.whitelist(allow_guest=True)
def get_flashcards_for_topic(topic_id=None):
	"""
	Retrieves a list of flashcards filtered by topic.
	If no topic_id is provided, returns all flashcards.
	"""
	user = get_current_user()
	
	if not user:
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)

	try:
		filters = {}
		if topic_id:
			filters["topic"] = topic_id
		
		flashcards = frappe.get_list(
			"Flashcard",
			filters=filters,
			fields=["name", "topic", "question", "answer", "explanation", "flashcard_type", "hint"],
			order_by="name"
		)
		
		return flashcards
		
	except Exception as e:
		frappe.log_error(f"Error fetching flashcards: {e}", "Flashcard API Error")
		frappe.throw(_("An error occurred while fetching flashcards."), exc=e)

@frappe.whitelist(allow_guest=True)
def get_flashcards_for_type(topic_id=None, flashcard_type=None):
	"""
	Retrieves a list of flashcards filtered by topic and flashcard_type.
	Returns complete flashcard data including child tables for specific types.
	
	Args:
		topic_id (str): The topic ID to filter by
		flashcard_type (str): The flashcard type to filter by (optional)
		
	Returns:
		list: List of flashcards with complete data
	"""
	user = get_current_user()
	
	if not user:
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)

	try:
		filters = {}
		if topic_id:
			filters["topic"] = topic_id
		
		if flashcard_type and flashcard_type != "All":
			filters["flashcard_type"] = flashcard_type
		
		# Get basic flashcard data
		flashcards = frappe.get_list(
			"Flashcard",
			filters=filters,
			fields=["name", "topic", "flashcard_type", "question", "answer", "explanation", "hint", "solution_with_error"],
			order_by="name"
		)
		
		# For each flashcard, fetch additional data based on its type
		for flashcard in flashcards:
			# For "Ordering Steps" type, fetch the child table items
			if flashcard.get("flashcard_type") == "Ordering Steps":
				ordering_steps = frappe.get_all(
					"Ordering Step Item",
					filters={"parent": flashcard.get("name")},
					fields=["step_content", "correct_order"],
					order_by="correct_order"
				)
				flashcard["ordering_steps_items"] = ordering_steps
		
		return flashcards
		
	except Exception as e:
		frappe.log_error(f"Error fetching flashcards: {e}", "Flashcard API Error")
		frappe.throw(_("An error occurred while fetching flashcards."), exc=e)

@frappe.whitelist(allow_guest=True)
def get_flashcard_by_id(flashcard_id):
	"""
	Retrieves a single flashcard by its ID.
	"""
	user = get_current_user()
	
	if not user:
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)

	try:
		flashcard = frappe.get_doc("Flashcard", flashcard_id)
		result = {
			"name": flashcard.name,
			"topic": flashcard.topic,
			"flashcard_type": flashcard.flashcard_type,
			"question": flashcard.question,
			"answer": flashcard.answer,
			"explanation": flashcard.explanation
		}
		
		# Add optional fields if they exist
		if hasattr(flashcard, "hint") and flashcard.hint:
			result["hint"] = flashcard.hint
			
		if hasattr(flashcard, "solution_with_error") and flashcard.solution_with_error:
			result["solution_with_error"] = flashcard.solution_with_error
		
		# For "Ordering Steps" type, fetch the child table items
		if flashcard.flashcard_type == "Ordering Steps":
			ordering_steps = frappe.get_all(
				"Ordering Step Item",
				filters={"parent": flashcard.name},
				fields=["step_content", "correct_order"],
				order_by="correct_order"
			)
			result["ordering_steps_items"] = ordering_steps
		
		return result
		
	except Exception as e:
		frappe.log_error(f"Error fetching flashcard: {e}", "Flashcard API Error")
		frappe.throw(_("An error occurred while fetching the flashcard."), exc=e)
