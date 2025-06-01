# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
import random
from frappe.model.document import Document
from frappe import _
from datetime import datetime, timedelta

def get_current_user():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user

class UserFlashcardSetting(Document):
    def before_save(self):
        self.validate_user_topic()
    
    def validate_user_topic(self):
        # Check if user exists
        if not frappe.db.exists("User", self.user):
            frappe.throw(_("User {0} does not exist").format(self.user))
        
        # Check if topic exists
        if not frappe.db.exists("Topics", self.topic):
            frappe.throw(_("Topic {0} does not exist").format(self.topic))

@frappe.whitelist()
def get_user_flashcard_setting(topic_name):
    """
    Get user flashcard settings for a specific topic
    
    Args:
        topic_name (str): Name of the topic
        
    Returns:
        dict: User flashcard settings for the topic
    """
    user_id = get_current_user()
    
    # Check if topic exists
    if not frappe.db.exists("Topics", topic_name):
        frappe.throw(_("Topic does not exist"))

    # Find existing settings for this user and topic
    settings_list = frappe.get_all(
        "User Flashcard Setting",
        filters={"user": user_id, "topic": topic_name},
        fields=["name", "flashcard_arrange_mode", "flashcard_direction", "study_exam_flashcard_type_filter"]
    )
    
    if settings_list:
        # Return existing settings
        settings = settings_list[0]
        return {
            "success": True,
            "settings": {
                "flashcard_arrange_mode": settings.flashcard_arrange_mode,
                "flashcard_direction": settings.flashcard_direction,
                "study_exam_flashcard_type_filter": settings.study_exam_flashcard_type_filter
            }
        }
    else:
        # Return default settings
        return {
            "success": True,
            "settings": {
                "flashcard_arrange_mode": "chronological",
                "flashcard_direction": "front_first",
                "study_exam_flashcard_type_filter": "All"
            }
        }

@frappe.whitelist()
def save_user_flashcard_setting(topic_name, settings_data):
    """
    Save user flashcard settings for a specific topic
    
    Args:
        topic_name (str): Name of the topic
        settings_data (dict): Settings data to save
        
    Returns:
        dict: Saved user flashcard settings
    """
    user_id = get_current_user()
    
    # Check if topic exists
    if not frappe.db.exists("Topics", topic_name):
        frappe.throw(_("Topic does not exist"))
    
    # Validate settings_data format
    if not isinstance(settings_data, dict):
        try:
            import json
            settings_data = json.loads(settings_data)
        except Exception:
            frappe.throw(_("Invalid settings data format"))
    
    # Define default values
    defaults = {
        "flashcard_arrange_mode": "chronological",
        "flashcard_direction": "front_first",
        "study_exam_flashcard_type_filter": "All"
    }
    
    # Merge with provided settings
    merged_settings = {**defaults, **settings_data}
    
    # Find existing settings
    settings_list = frappe.get_all(
        "User Flashcard Setting",
        filters={"user": user_id, "topic": topic_name},
        fields=["name"]
    )
    
    if settings_list:
        # Update existing settings
        settings = frappe.get_doc("User Flashcard Setting", settings_list[0].name)
        settings.flashcard_arrange_mode = merged_settings.get("flashcard_arrange_mode")
        settings.flashcard_direction = merged_settings.get("flashcard_direction")
        settings.study_exam_flashcard_type_filter = merged_settings.get("study_exam_flashcard_type_filter")
        settings.save(ignore_permissions=True)
    else:
        # Create new settings
        settings = frappe.new_doc("User Flashcard Setting")
        settings.user = user_id
        settings.topic = topic_name
        settings.flashcard_arrange_mode = merged_settings.get("flashcard_arrange_mode")
        settings.flashcard_direction = merged_settings.get("flashcard_direction")
        settings.study_exam_flashcard_type_filter = merged_settings.get("study_exam_flashcard_type_filter")
        settings.insert(ignore_permissions=True)
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("Settings saved successfully"),
        "settings": {
            "flashcard_arrange_mode": settings.flashcard_arrange_mode,
            "flashcard_direction": settings.flashcard_direction,
            "study_exam_flashcard_type_filter": settings.study_exam_flashcard_type_filter
        }
    }

@frappe.whitelist()
def reset_srs_progress_for_topic(topic_name):
    """
    Reset SRS progress for a specific topic
    
    Args:
        topic_name (str): Name of the topic
        
    Returns:
        dict: Success message and count of deleted records
    """
    user_id = get_current_user()
    
    # Check if topic exists
    if not frappe.db.exists("Topics", topic_name):
        frappe.throw(_("Topic does not exist"))
    
    # Get all flashcards for this topic
    flashcards = frappe.get_all(
        "Flashcard",
        filters={"topic": topic_name},
        fields=["name"]
    )
    
    # Delete SRS progress records for these flashcards
    deleted_count = 0
    for flashcard in flashcards:
        srs_progress_list = frappe.get_all(
            "User SRS Progress",
            filters={"user": user_id, "flashcard": flashcard.name},
            fields=["name"]
        )
        
        for progress in srs_progress_list:
            frappe.delete_doc("User SRS Progress", progress.name, ignore_permissions=True)
            deleted_count += 1
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("SRS progress reset successfully"),
        "deleted_count": deleted_count
    } 