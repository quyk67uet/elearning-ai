# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, add_days, getdate, get_datetime
from datetime import datetime, timedelta
import random
import math

class UserSRSProgress(Document):
    def before_save(self):
        """Validate before saving"""
        self.validate_user_flashcard()
    
    def validate_user_flashcard(self):
        """Ensure user and flashcard exist"""
        if not frappe.db.exists("User", self.user):
            frappe.throw(_("User {0} does not exist").format(self.user))
        
        if not frappe.db.exists("Flashcard", self.flashcard):
            frappe.throw(_("Flashcard {0} does not exist").format(self.flashcard))

def get_current_user():
    """Get current authenticated user"""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user

@frappe.whitelist()
def get_due_srs_summary():
    """
    Get summary of SRS cards due for review and upcoming cards, grouped by topic
    
    Returns:
        dict: Number of due cards, upcoming cards and topic summaries
    """
    user_id = get_current_user()
    now = now_datetime()
    upcoming_days = 2  # Hiển thị thẻ sắp đến hạn trong 2 ngày tới
    upcoming_date = add_days(now, upcoming_days)
    
    # Get all SRS progress records that are due now
    due_records = frappe.get_all(
        "User SRS Progress",
        filters={
            "user": user_id,
            "next_review_timestamp": ["<=", now]
        },
        fields=["name", "flashcard", "next_review_timestamp"]
    )
    
    # Get upcoming SRS progress records
    upcoming_records = frappe.get_all(
        "User SRS Progress",
        filters={
            "user": user_id,
            "next_review_timestamp": [">", now],
            "next_review_timestamp": ["<=", upcoming_date]
        },
        fields=["name", "flashcard", "next_review_timestamp"]
    )
    
    all_records = due_records + upcoming_records
    
    if not all_records:
        return {
            "success": True,
            "due_count": 0,
            "upcoming_count": 0,
            "total_count": 0,
            "topics": []
        }
    
    # Get flashcard details to group by topic
    flashcard_names = [record.flashcard for record in all_records]
    
    flashcard_topics = frappe.get_all(
        "Flashcard",
        filters={"name": ["in", flashcard_names]},
        fields=["name", "topic"]
    )
    
    # Create a map of flashcard to topic
    flashcard_to_topic = {fc.name: fc.topic for fc in flashcard_topics}
    
    # Group by topic
    topic_data = {}
    for record in all_records:
        topic = flashcard_to_topic.get(record.flashcard)
        if not topic:
            continue
            
        if topic not in topic_data:
            topic_data[topic] = {
                "due_count": 0,
                "upcoming_count": 0,
                "cards": []
            }
            
        # Determine if it's due now or upcoming
        is_due = record.next_review_timestamp <= now
        
        if is_due:
            topic_data[topic]["due_count"] += 1
        else:
            topic_data[topic]["upcoming_count"] += 1
            
        topic_data[topic]["cards"].append({
            "id": record.name,
            "flashcard": record.flashcard,
            "next_review": record.next_review_timestamp,
            "is_due": is_due
        })
    
    # Get topic names
    topic_names = {}
    for topic_id in topic_data.keys():
        topic_name = frappe.db.get_value("Topics", topic_id, "topic_name")
        topic_names[topic_id] = topic_name
    
    # Format response
    topics = []
    for topic_id, data in topic_data.items():
        topics.append({
            "topic_id": topic_id,
            "topic_name": topic_names.get(topic_id, "Unknown Topic"),
            "due_count": data["due_count"],
            "upcoming_count": data["upcoming_count"],
            "total_count": data["due_count"] + data["upcoming_count"],
            "cards": sorted(data["cards"], key=lambda x: x["next_review"])
        })
    
    # Sort by total count (highest first)
    topics.sort(key=lambda x: x["total_count"], reverse=True)
    
    # Calculate counts
    due_count = sum(topic["due_count"] for topic in topics)
    upcoming_count = sum(topic["upcoming_count"] for topic in topics)
    total_count = due_count + upcoming_count
    
    return {
        "success": True,
        "due_count": due_count,
        "upcoming_count": upcoming_count,
        "total_count": total_count,
        "topics": topics
    }

@frappe.whitelist()
def get_srs_review_cards(topic_name):
    """
    Get flashcards due for review based on SRS algorithm
    
    Args:
        topic_name (str): Name of the topic
        
    Returns:
        dict: List of flashcards to review and stats
    """
    user_id = get_current_user()
    
    # Check if topic exists
    if not frappe.db.exists("Topics", topic_name):
        frappe.throw(_("Topic does not exist"))
    
    # Get user flashcard settings
    user_settings = get_user_flashcard_setting(user_id, topic_name)
    
    # Get all flashcards for this topic
    filters = {"topic": topic_name}
    
    # Apply flashcard type filter if specified
    if user_settings.get("study_exam_flashcard_type_filter") != "All":
        filters["flashcard_type"] = user_settings.get("study_exam_flashcard_type_filter")
    
    # Get all exam attempts for this topic and user
    exam_attempts = frappe.get_all(
        "User Exam Attempt", 
        filters={"user": user_id, "topic": topic_name},
        fields=["name"]
    )
    
    # If there are no exam attempts, return empty list with a specific message
    if not exam_attempts:
        return {
            "success": True,
            "cards": [],
            "stats": {
                "new": 0,
                "learning": 0,
                "review": 0,
                "lapsed": 0,
                "total": 0,
                "due": 0,
                "current_review": {
                    "new": 0,
                    "learning": 0,
                    "review": 0,
                    "lapsed": 0
                }
            },
            "no_exams": True,
            "message": _("No exam attempts found. Please complete some flashcards in Exam Mode first.")
        }
    
    # Get all self-assessed flashcards from exam attempts
    assessed_flashcards = []
    for attempt in exam_attempts:
        details = frappe.get_all(
            "User Exam Attempt Detail",
            filters={
                "parent": attempt.name,
                "user_self_assessment": ["!=", ""]  # Only include assessed cards
            },
            fields=["flashcard", "user_self_assessment"]
        )
        assessed_flashcards.extend(details)
    
    # If no self-assessed flashcards, return empty list with message
    if not assessed_flashcards:
        return {
            "success": True,
            "cards": [],
            "stats": {
                "new": 0,
                "learning": 0,
                "review": 0,
                "lapsed": 0,
                "total": 0,
                "due": 0,
                "current_review": {
                    "new": 0,
                    "learning": 0,
                    "review": 0,
                    "lapsed": 0
                }
            },
            "no_assessments": True,
            "message": _("No self-assessed flashcards found. Please complete and assess flashcards in Exam Mode first.")
        }
    
    # Get unique flashcard names from assessed cards
    assessed_flashcard_names = list(set([detail.flashcard for detail in assessed_flashcards]))
    
    # Add filter to only include assessed flashcards
    filters["name"] = ["in", assessed_flashcard_names]
    
    all_flashcards = frappe.get_all(
        "Flashcard", 
        filters=filters,
        fields=["name", "question", "answer", "explanation", "flashcard_type", "hint", "solution_with_error"]
    )
    
    # Process additional data for specific flashcard types
    for flashcard in all_flashcards:
        if flashcard.get("flashcard_type") == "Ordering Steps":
            ordering_steps = frappe.get_all(
                "Ordering Step Item",
                filters={"parent": flashcard.get("name")},
                fields=["step_content", "correct_order"],
                order_by="correct_order"
            )
            flashcard["ordering_steps_items"] = ordering_steps
    
    # Get all progress records for these flashcards
    existing_progress = frappe.get_all(
        "User SRS Progress",
        filters={"user": user_id, "flashcard": ["in", [card.name for card in all_flashcards]]},
        fields=["flashcard", "status", "next_review_timestamp", "interval_days", "ease_factor", "repetitions", "learning_step"]
    )
    
    # Create a map for easier access
    progress_map = {p.flashcard: p for p in existing_progress}
    
    # Categorize cards
    now = now_datetime()
    new_cards = []
    learning_cards = []
    review_cards = []
    lapsed_cards = []
    
    # Card counts
    total_counts = {
        "new": 0,
        "learning": 0,
        "review": 0,
        "lapsed": 0
    }
    
    # Cards due for review
    due_counts = {
        "new": 0,
        "learning": 0,
        "review": 0,
        "lapsed": 0
    }
    
    for card in all_flashcards:
        if card.name in progress_map:
            progress = progress_map[card.name]
            total_counts[progress.status] += 1
            
            # Check if due for review
            if get_datetime(progress.next_review_timestamp) <= now:
                card_with_progress = card.copy()
                card_with_progress["status"] = progress.status
                card_with_progress["interval_days"] = progress.interval_days
                card_with_progress["ease_factor"] = progress.ease_factor
                card_with_progress["repetitions"] = progress.repetitions
                card_with_progress["learning_step"] = progress.learning_step
                
                if progress.status == "learning":
                    learning_cards.append(card_with_progress)
                    due_counts["learning"] += 1
                elif progress.status == "review":
                    review_cards.append(card_with_progress)
                    due_counts["review"] += 1
                elif progress.status == "lapsed":
                    lapsed_cards.append(card_with_progress)
                    due_counts["lapsed"] += 1
        else:
            # New card
            card_with_status = card.copy()
            card_with_status["status"] = "new"
            new_cards.append(card_with_status)
            total_counts["new"] += 1
    
    # Shuffle new cards for variety
    random.shuffle(new_cards)
    
    # Use all new cards instead of limiting them
    limited_new_cards = new_cards
    due_counts["new"] = len(limited_new_cards)
    
    # Apply card arrangement mode
    if user_settings.get("flashcard_arrange_mode") == "random":
        random.shuffle(learning_cards)
        random.shuffle(review_cards)
        random.shuffle(lapsed_cards)
    
    # Order: learning -> lapsed -> review -> new
    result_cards = learning_cards + lapsed_cards + review_cards + limited_new_cards
    
    # Total cards due
    total_due = sum(due_counts.values())
    
    # Check for upcoming cards in the next 2 days
    upcoming_days = 2
    upcoming_date = add_days(now, upcoming_days)
    
    # Get count of upcoming cards 
    upcoming_cards_count = frappe.db.count(
        "User SRS Progress",
        filters={
            "user": user_id,
            "flashcard": ["in", [card.name for card in all_flashcards]],
            "next_review_timestamp": [">", now],
            "next_review_timestamp": ["<=", upcoming_date]
        }
    )
    
    # Return stats and cards
    return {
        "success": True,
        "cards": result_cards,
        "stats": {
            **total_counts,
            "total": sum(total_counts.values()),
            "due": total_due,
            "upcoming": upcoming_cards_count,
            "current_review": due_counts
        }
    }

@frappe.whitelist()
def update_srs_progress(flashcard_name, user_rating):
    """
    Update SRS progress based on user rating
    
    Args:
        flashcard_name (str): Name of the flashcard
        user_rating (str): User's rating (e.g., "correct", "wrong")
        
    Returns:
        dict: Updated SRS progress info
    """
    user_id = get_current_user()
    
    # Check if flashcard exists
    if not frappe.db.exists("Flashcard", flashcard_name):
        frappe.throw(_("Flashcard does not exist"))
    
    # Map user ratings to internal ratings
    rating_map = {
        "wrong": "again",  # User got it wrong
        "again": "again",  # User got it wrong
        "hard": "hard",    # Remembered with difficulty
        "correct": "good", # User got it right
        "good": "good",    # User got it right
        "easy": "easy"     # User got it perfectly
    }
    
    # Standardize the rating
    internal_rating = rating_map.get(user_rating, "again")
    
    # Quality scores for SM-2 algorithm (0-5)
    quality_scores = {
        "again": 0,  # Complete blackout
        "hard": 1,   # Correct but with serious difficulty
        "good": 3,   # Correct with some difficulty
        "easy": 5    # Perfect recall
    }
    
    quality = quality_scores.get(internal_rating, 0)
    
    # Get current timestamp
    now = now_datetime()
    
    # Default values for a new SRS progress
    defaults = {
        "status": "new",
        "interval_days": 0,
        "ease_factor": 2.5,
        "repetitions": 0,
        "learning_step": 0,
        "last_review_timestamp": now,
        "next_review_timestamp": now
    }
    
    # Find existing progress or create new
    progress_list = frappe.get_all(
        "User SRS Progress",
        filters={"user": user_id, "flashcard": flashcard_name},
        fields=["name"]
    )
    
    if progress_list:
        # Update existing progress
        progress = frappe.get_doc("User SRS Progress", progress_list[0].name)
    else:
        # Create new progress
        progress = frappe.new_doc("User SRS Progress")
        progress.user = user_id
        progress.flashcard = flashcard_name
        for key, value in defaults.items():
            setattr(progress, key, value)
    
    # Current values
    status = progress.status
    interval = progress.interval_days
    ease_factor = progress.ease_factor
    repetitions = progress.repetitions
    learning_step = progress.learning_step
    
    # Update based on the SM-2 algorithm and card status
    if status == "new" or status == "learning":
        # Initial learning phase
        if internal_rating == "again":  # Failed
            status = "learning"
            learning_step = 0
            interval = 0  # Review again in the same session
        elif internal_rating == "hard":  # Hard but passed
            learning_step += 1
            if learning_step >= 2:  # Move to review after passing twice
                status = "review"
                repetitions = 1
                interval = 1  # First interval is 1 day
            else:
                status = "learning"
                interval = 0.5  # 12 hours
        elif internal_rating == "good":  # Good
            learning_step += 1
            if learning_step >= 2:  # Move to review after passing twice
                status = "review"
                repetitions = 1
                interval = 1  # First interval is 1 day
            else:
                status = "learning"
                interval = 0.25  # 6 hours
        elif internal_rating == "easy":  # Easy
            status = "review"
            repetitions = 1
            interval = 3  # Skip to 3 days for easy cards
    
    elif status == "review" or status == "lapsed":
        # Regular review phase (SM-2 algorithm)
        if internal_rating == "again":  # Failed review
            status = "lapsed"
            repetitions = 0
            learning_step = 0
            interval = 0  # Relearn immediately
        else:
            # Update ease factor based on quality
            ease_factor = max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
            
            if internal_rating == "hard":
                # Hard cards get a shorter interval
                interval = max(1, interval * 1.2)
            elif internal_rating == "good":
                # Standard interval increase
                if repetitions == 0:
                    interval = 1
                elif repetitions == 1:
                    interval = 3
                else:
                    interval = interval * ease_factor
            elif internal_rating == "easy":
                # Easy cards get a longer interval
                if repetitions == 0:
                    interval = 3
                else:
                    interval = interval * ease_factor * 1.3
            
            repetitions += 1
            status = "review"
    
    # Update progress
    progress.status = status
    progress.interval_days = interval
    progress.ease_factor = ease_factor
    progress.repetitions = repetitions
    progress.learning_step = learning_step
    progress.last_review_timestamp = now
    
    # Calculate next review time based on interval
    if interval < 1:
        # Less than a day (convert to hours)
        hours = int(interval * 24)
        progress.next_review_timestamp = now + timedelta(hours=hours)
    else:
        # Days
        progress.next_review_timestamp = now + timedelta(days=int(interval))
    
    # Save the progress
    progress.save(ignore_permissions=True)
    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("SRS progress updated successfully"),
        "progress": {
            "status": progress.status,
            "interval_days": progress.interval_days,
            "next_review": progress.next_review_timestamp,
            "ease_factor": progress.ease_factor,
            "repetitions": progress.repetitions
        }
    }

def get_user_flashcard_setting(user_id, topic_name):
    """
    Helper function to get user flashcard settings
    
    Args:
        user_id (str): User ID
        topic_name (str): Topic name
        
    Returns:
        dict: User flashcard settings
    """
    settings_list = frappe.get_all(
        "User Flashcard Setting",
        filters={"user": user_id, "topic": topic_name},
        fields=["flashcard_arrange_mode", "flashcard_direction", "study_exam_flashcard_type_filter"]
    )
    
    if settings_list:
        return {
            "flashcard_arrange_mode": settings_list[0].flashcard_arrange_mode,
            "flashcard_direction": settings_list[0].flashcard_direction,
            "study_exam_flashcard_type_filter": settings_list[0].study_exam_flashcard_type_filter
        }
    else:
        return {
            "flashcard_arrange_mode": "chronological",
            "flashcard_direction": "front_first",
            "study_exam_flashcard_type_filter": "All"
        }

@frappe.whitelist()
def get_srs_time_by_month(year=None):
    """Lấy dữ liệu thời gian học SRS theo tháng trong năm"""
    user = get_current_user()
    
    if not year:
        year = getdate().year
    
    # Lấy dữ liệu từ User SRS Progress, tính tổng thời gian đã học theo tháng
    query = """
        SELECT 
            MONTH(last_review_timestamp) as month,
            SUM(total_time_spent_seconds) as time_spent
        FROM `tabUser SRS Progress` 
        WHERE user = %s 
        AND YEAR(last_review_timestamp) = %s
        GROUP BY MONTH(last_review_timestamp)
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
