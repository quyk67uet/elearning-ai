import frappe
from frappe import _
import frappe.utils

def on_test_update(doc, method):
    """
    Hook handler when a Test document is updated
    
    Args:
        doc (Document): The Test document
        method (str): The method that triggered this hook
    """
    # Clear any cached data for this test
    frappe.cache().delete_key(f"test_questions_{doc.name}")
    
    # Log an audit message
    frappe.log_error(
        message=f"Test {doc.name} ({doc.title}) was updated by {frappe.session.user}",
        title="Test Updated"
    )

def after_test_created(doc, method):
    """
    Hook handler when a Test document is created
    
    Args:
        doc (Document): The Test document
        method (str): The method that triggered this hook
    """
    # Show a message to the user
    frappe.msgprint(_(f"Test '{doc.title}' created successfully!"))
    
    # You might want to notify certain users, e.g., educators or admins
    # about the new test
    if doc.owner != frappe.session.user:
        frappe.sendmail(
            recipients=[doc.owner],
            subject=_("New Test Created"),
            message=_(f"A new test '{doc.title}' has been created."),
            reference_doctype="Test",
            reference_name=doc.name
        )

def on_test_attempt_update(doc, method):
    """
    Hook handler when a Test Attempt document is updated
    
    Args:
        doc (Document): The Test Attempt document
        method (str): The method that triggered this hook
    """
    # You could track attempt progress here if needed
    if doc.status == "In Progress":
        # Maybe update some statistics or notify someone
        pass

def after_test_submitted(doc, method):
    """
    Hook handler when a Test Attempt is submitted (completed)
    
    Args:
        doc (Document): The Test Attempt document
        method (str): The method that triggered this hook
    """
    # Get related documents
    test = frappe.get_doc("Test", doc.test)
    student = frappe.get_doc("User", doc.student)
    
    # Check if this was a passing attempt
    passed = doc.final_score >= test.passing_score
    
    # Send email notification to the student
    if student.email:
        frappe.sendmail(
            recipients=[student.email],
            subject=_("Your Test Results: {0}").format(test.title),
            message=f"""
            <p>Hello {student.full_name or student.name},</p>
            <p>You have completed the test: <strong>{test.title}</strong></p>
            <p>Your score: <strong>{doc.final_score}%</strong></p>
            <p>Passing score: {test.passing_score}%</p>
            <p>{"Congratulations! You passed the test." if passed else "You did not pass the test. Please try again."}</p>
            <p>You can view your detailed results by logging into the system.</p>
            """,
            reference_doctype="Test Attempt",
            reference_name=doc.name
        )
    
    # You might want to update some statistics or records
    # For example, count number of attempts, update success rate, etc.

def export_test_data(test_id):
    """
    Utility function to export test data in a format suitable for backup/transfer
    
    Args:
        test_id (str): The ID of the Test document
        
    Returns:
        dict: Exportable test data structure
    """
    test_doc = frappe.get_doc("Test", test_id)
    
    # Create the export structure
    export_data = {
        "test": {
            "title": test_doc.title,
            "grade_level": test_doc.grade_level,
            "topic": test_doc.topic,
            "difficulty_level": test_doc.difficulty_level,
            "test_type": test_doc.test_type,
            "time_limit": test_doc.time_limit,
            "passing_score": test_doc.passing_score,
            "instructions": test_doc.instructions,
            "is_active": test_doc.is_active
        },
        "questions": []
    }
    
    # Get all questions with full details
    questions = test_doc.get_questions(hide_answers=False)
    
    for question in questions:
        question_doc = frappe.get_doc("Question", question["question_id"])
        
        question_data = {
            "content": question_doc.content,
            "question_type": question_doc.question_type,
            "cognitive_level": question_doc.cognitive_level,
            "marks": question_doc.marks,
            "explanation": question_doc.explanation,
            "hint": question_doc.hint,
            "image": question_doc.image,
            "options": []
        }
        
        # Add options for multiple choice questions
        if question_doc.question_type == "Multiple Choice":
            for option in question_doc.options:
                question_data["options"].append({
                    "label": option.label,
                    "content": option.content,
                    "is_correct": option.is_correct
                })
        
        export_data["questions"].append(question_data)
    
    return export_data 