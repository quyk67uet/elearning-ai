import frappe
from frappe.model.document import Document
from frappe import _

def get_current_user():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user

# --- Test Document Class ---
class Test(Document):
    # Standard DocType methods like validate, before_save, etc. go here if needed
    # For example:
    # def validate(self):
    #     if self.time_limit_minutes is not None and self.time_limit_minutes <= 0:
    #         frappe.throw(_("Time Limit must be a positive number if set."))
    pass # Add methods inside the class as needed



@frappe.whitelist()
def find_all_active_tests(topic_id=None, grade_level=None, test_type=None):
    """
    Fetches a list of active tests, potentially filtered.
    """
    user = get_current_user()

    filters = {"is_active": 1}
    if topic_id:
        filters["topic"] = topic_id
    if grade_level:
        filters["grade_level"] = grade_level
    if test_type:
        filters["test_type"] = test_type

    tests_list = frappe.get_list(
        "Test",
        filters=filters,
        fields=["name", "title", "topic", "grade_level", "test_type", "time_limit_minutes", "instructions", "difficulty_level"],
        order_by="title asc",
    )

    # Add question count
    test_names = [t['name'] for t in tests_list]
    if test_names:
        counts = frappe.get_all(
            'Test Question Item',
            filters={'parent': ['in', test_names], 'parenttype': 'Test'},
            fields=['parent', 'count(name) as count'],
            group_by='parent',
            as_list=False
        )
        counts_dict = {c['parent']: c['count'] for c in counts}
        for test in tests_list:
            test["question_count"] = counts_dict.get(test.name, 0)
    else:
         for test in tests_list:
            test["question_count"] = 0

    return tests_list


@frappe.whitelist()
def get_test_details(test_id):
    """
    Retrieves details for a single test, including question count.
    """
    user = get_current_user()
    try:
        test_doc = frappe.get_doc("Test", test_id)
        # Add permission check if needed: frappe.has_permission("Test", "read", doc=test_doc)

        return {                
            "name": test_doc.name,
            "title": test_doc.title,
            "instructions": test_doc.instructions,
            "topic": test_doc.topic,
            "grade_level": test_doc.grade_level,
            "difficulty_level": test_doc.difficulty_level,
            "test_type": test_doc.test_type,
            "time_limit_minutes": test_doc.time_limit_minutes,
            "passing_score": test_doc.passing_score,
            "is_active": test_doc.is_active,
            "question_count": len(test_doc.get("questions", []))
        }
    except frappe.DoesNotExistError:
        frappe.throw(_("Test {0} not found").format(test_id), frappe.DoesNotExistError)


@frappe.whitelist()
def get_test_data(test_id):
    """
    Retrieves test metadata and sanitized questions for the test-taking UI.
    """
    user = get_current_user()
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    try:
        test_doc = frappe.get_doc("Test", test_id)
        # Consider uncommenting permission check if needed, though get_doc usually handles it
        # if not frappe.has_permission("Test", "read", doc=test_doc):
        #     frappe.throw(_("You do not have permission to access this test."), frappe.PermissionError)

        if not test_doc.is_active:
            frappe.throw(_("Test {0} is not currently active.").format(test_id), frappe.ValidationError)

        sanitized_questions = []
        for test_q_detail in test_doc.get("questions", []):
            try:
                q_doc = frappe.get_doc("Question", test_q_detail.question)
                
                formatted_options = None # Use a more descriptive name
                if q_doc.question_type == "Multiple Choice":
                    formatted_options = []
                    for idx, option_row in enumerate(q_doc.get("options", [])):
                        formatted_options.append({
                            "id": option_row.name,       
                            "text": option_row.option_text, 
                            "label": chr(65 + idx)      
                            # If options can have images, add: "image": option_row.image_field_name
                        })

            
                sanitized_questions.append({
                    "test_question_detail_id": test_q_detail.name, # ID of the Test Question Item row
                    "question_id": q_doc.name,                     # ID of the base Question doc
                    "content": q_doc.content,
                    "image": q_doc.image_url, # Or q_doc.image, ensure fieldname is correct
                    "question_type": q_doc.question_type,
                    "options": formatted_options, # Use the new list with IDs and labels
                    "hint": q_doc.hint,
                    "point_value": test_q_detail.points,
                    "question_order": test_q_detail.idx
                })
            except frappe.DoesNotExistError:
                frappe.log_error(f"Question {test_q_detail.question} linked in Test {test_id} (Test Question Item: {test_q_detail.name}) not found.", "TestDataError")
                continue # Skip this question if the base Question doc is missing

        return {
            "id": test_doc.name,
            "title": test_doc.title,
            "time_limit_minutes": test_doc.time_limit_minutes,
            "instructions": test_doc.instructions,
            "questions": sorted(sanitized_questions, key=lambda q: q.get("question_order", float('inf')))
        }

    except frappe.DoesNotExistError:
        frappe.throw(_("Test {0} not found").format(test_id), frappe.DoesNotExistError)
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "GetTestDataUnhandledError")
        frappe.throw(_("An error occurred while retrieving test data."))