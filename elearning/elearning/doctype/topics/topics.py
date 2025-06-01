import frappe
from frappe.model.document import Document
from frappe import _

def get_current_user():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user

class Topics(Document):
    # Standard DocType methods like validate, before_save, etc. go here if needed
    pass # Add methods inside the class as needed

@frappe.whitelist(allow_guest=True)
def find_all_active_topics():
    """
    Retrieves a list of all active topics, ordered by name.
    """
    user = get_current_user()
    
    if not user:
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    else:
        print(f"Authenticated user: {user}")

    try:
        topics_list = frappe.get_list(
            "Topics",
            filters={"is_active": 1},
            fields=["name", "topic_name", "grade_level", "description"], 
            order_by="name" 
        )

        return topics_list

    except Exception as e:
        frappe.log_error(f"Error fetching active topics: {e}", "Topic API Error")
        frappe.throw(_("An error occurred while fetching topics."), exc=e)