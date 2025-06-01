import requests
import frappe
import json
from frappe.model.document import Document
from frappe.utils import now, get_datetime, time_diff_in_seconds
from elearning.elearning.doctype.test.test import get_test_data
from frappe import _ 
import re

def get_current_user():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user

class TestAttempt(Document):
    pass


@frappe.whitelist()
def get_test_attempt_status(test_id):
    user = get_current_user()
    latest_attempt = frappe.get_list(
        "Test Attempt",
        filters={"test": test_id, "user": user},
        fields=["name", "status"],
        order_by="start_time desc",
        limit=1
    )
    if not latest_attempt:
        return {"status": "not_started"}
    else:
        status = latest_attempt[0].status
        valid_statuses = ["In Progress", "Completed", "To be graded", "Graded"]
        if status not in valid_statuses:
             frappe.logger(__name__).warning(f"Unexpected status '{status}' found for attempt {latest_attempt[0].name}")
             return {"status": "Completed"} 
        return {"status": status}


@frappe.whitelist(methods=["POST"])
def start_or_resume_test_attempt(test_id):
    user = get_current_user()
    logger = frappe.logger("start_or_resume_test_attempt")

    if not frappe.db.exists("Test", test_id):
        logger.error(f"Test {test_id} not found for user {user}.")
        frappe.throw(_("Test {0} not found").format(test_id), frappe.DoesNotExistError)

    test_doc_meta = frappe.get_cached_value("Test", test_id, ["is_active", "title", "time_limit_minutes", "instructions"], as_dict=True)
    if not test_doc_meta:
        logger.error(f"Could not retrieve metadata for Test {test_id}.")
        frappe.throw(_("Test {0} not found").format(test_id), frappe.DoesNotExistError)
    if not test_doc_meta.is_active:
        logger.warning(f"Attempt to start inactive Test {test_id} by user {user}.")
        frappe.throw(_("Test {0} is not active.").format(test_id), frappe.ValidationError)

    existing_attempt = frappe.get_list(
        "Test Attempt",
        filters={"test": test_id, "user": user, "status": "In Progress"},
        fields=["name", "start_time", "remaining_time_seconds", "last_viewed_question"],
        limit=1
    )

    attempt_doc = None
    if existing_attempt:
        attempt_id = existing_attempt[0].name
        attempt_doc = frappe.get_doc("Test Attempt", attempt_id)
        logger.info(f"Resuming attempt {attempt_id} for test {test_id}, user {user}")
    else:
        logger.info(f"Starting new attempt for test {test_id}, user {user}")
        attempt_doc = frappe.new_doc("Test Attempt")
        attempt_doc.test = test_id
        attempt_doc.user = user
        attempt_doc.status = "In Progress"
        attempt_doc.start_time = now()
        if test_doc_meta.time_limit_minutes and test_doc_meta.time_limit_minutes > 0:
             attempt_doc.remaining_time_seconds = test_doc_meta.time_limit_minutes * 60

        try:
            attempt_doc.insert(ignore_permissions=True)
            frappe.db.commit() 
            attempt_id = attempt_doc.name
            logger.info(f"New Test Attempt {attempt_id} created for Test {test_id}, user {user}.")
        except Exception as e:
            frappe.db.rollback()
            logger.error(f"Failed to create new Test Attempt for test {test_id}, user {user}. Error: {e}", exc_info=True)
            frappe.throw(_("Could not start the test attempt. Please try again."))

    test_data_for_taking = get_test_data(test_id) 

    saved_answers_dict = {}
    if attempt_doc and attempt_doc.get("answers"):
         for answer_detail in attempt_doc.answers:
             # In 'Attempt Answer Item', 'question' field stores the base Question.name
             # 'test_question_item' field stores the Test Question Item.name (e.g. r0bv2trdu1)
             # We need to use the value in 'test_question_item' as the key for saved_answers_dict
             # if it's populated.
             key_for_saved_answers = getattr(answer_detail, 'test_question_item', None)
             if key_for_saved_answers:
                 saved_answers_dict[key_for_saved_answers] = {
                     "userAnswer": answer_detail.user_answer,
                     "timeSpentSeconds": getattr(answer_detail, 'time_spent_seconds', 0) 
                 }
             else:
                # Fallback or logging if test_question_item is not set in saved answer
                logger.warning(f"Saved answer item {answer_detail.name} in attempt {attempt_doc.name} is missing 'test_question_item' link.")


    time_elapsed_seconds = 0
    if existing_attempt and attempt_doc.start_time : # ensure start_time is not None
        time_elapsed_seconds = time_diff_in_seconds(now(), get_datetime(attempt_doc.start_time))

    return {
        "attempt": {
            "id": attempt_doc.name,
            "status": attempt_doc.status,
            "start_time": attempt_doc.start_time,
            "remaining_time_seconds": attempt_doc.remaining_time_seconds,
            "last_viewed_question_id": attempt_doc.last_viewed_question, 
        },
        "test": {
            "id": test_id,
            "title": test_doc_meta.title,
            "time_limit_minutes": test_doc_meta.time_limit_minutes,
            "instructions": test_doc_meta.instructions,
        },
        "questions": test_data_for_taking.get("questions", []),
        "saved_answers": saved_answers_dict, # Keyed by test_question_item.name (e.g. r0bv2trdu1)
        "time_elapsed_seconds": time_elapsed_seconds 
    }

@frappe.whitelist(allow_guest=True) 
def submit_test_attempt(attempt_id, submission_data):
    user = get_current_user()
    logger = frappe.logger("submit_test_attempt")

    try:
        submission_data_dict = json.loads(submission_data)
        answers_input = submission_data_dict.get("answers", {}) # keys are test_question_detail_id
        time_left = submission_data_dict.get("timeLeft")
        last_viewed_test_q_detail_id = submission_data_dict.get("lastViewedTestQuestionId")
    except json.JSONDecodeError:
        logger.error(f"Invalid submission_data JSON format for attempt {attempt_id}.", exc_info=True)
        frappe.throw(_("Invalid submission data format."), frappe.ValidationError)
    except Exception as e:
        logger.error(f"Could not parse submission_data for attempt {attempt_id}. Error: {e}", exc_info=True)
        frappe.throw(_("Could not parse submission data."), frappe.ValidationError)

    try:
        attempt_doc = frappe.get_doc("Test Attempt", attempt_id)
    except frappe.DoesNotExistError:
        logger.error(f"Test Attempt {attempt_id} not found during submission.")
        frappe.throw(_("Test Attempt {0} not found.").format(attempt_id), frappe.DoesNotExistError)

    if attempt_doc.user != user: # Critical check
        logger.warning(f"User {user} tried to submit attempt {attempt_id} owned by {attempt_doc.user}.")
        frappe.throw(_("You are not permitted to submit this attempt."), frappe.PermissionError)
    if attempt_doc.status != "In Progress":
        logger.warning(f"Attempt to submit Test Attempt {attempt_id} which is not 'In Progress' (Status: {attempt_doc.status}).")
        frappe.throw(_("This attempt cannot be submitted (Status: {0}).").format(attempt_doc.status), frappe.ValidationError)

    try:
        test_doc = frappe.get_doc("Test", attempt_doc.test)
    except frappe.DoesNotExistError:
        logger.error(f"Test {attempt_doc.test} (linked to Attempt {attempt_id}) not found during submission.", "SubmitError")
        frappe.throw(_("Associated Test not found."), frappe.DoesNotExistError)

    test_q_details_map = {tqd.name: {"question": tqd.question, "points": tqd.points} for tqd in test_doc.questions}

    total_score = 0
    total_possible_score = 0
    attempt_doc.answers = [] # Clear existing answers before adding final ones

    for test_q_item_id, answer_data in answers_input.items(): 
        user_answer = answer_data.get("userAnswer")
        time_spent = answer_data.get("timeSpent")

        if test_q_item_id not in test_q_details_map:
            logger.warning(f"Skipping answer for unknown Test Question Item ID {test_q_item_id} in attempt {attempt_id}")
            continue

        q_info = test_q_details_map[test_q_item_id]
        question_name = q_info["question"] 
        point_value = q_info["points"] or 1
        total_possible_score += point_value

        is_correct = False
        points_awarded = 0

        try:
            q_doc = frappe.get_doc("Question", question_name)
            if q_doc.question_type == "Multiple Choice":
                 correct_option_id = None
                 for option in q_doc.options:
                     if option.is_correct:
                         correct_option_id = option.name 
                         break
                 if user_answer is not None and correct_option_id is not None and str(user_answer).strip() == str(correct_option_id).strip():
                     is_correct = True
            elif q_doc.question_type == "Self Write": 
                 if user_answer is not None and q_doc.answer_key and \
                    str(user_answer).strip().lower() == str(q_doc.answer_key).strip().lower():
                     is_correct = True
            
            if is_correct:
                points_awarded = point_value
            total_score += points_awarded

            attempt_doc.append("answers", {
                "question": question_name,
                "test_question_item": test_q_item_id, 
                "user_answer": str(user_answer) if user_answer is not None else None,
                "is_correct": is_correct,
                "points_awarded": points_awarded,
                "submitted_at": now(),
                "time_spent_seconds": time_spent
            })
            logger.info(f"Processed answer for Test Question Item {test_q_item_id} in attempt {attempt_id}. Correct: {is_correct}, Points: {points_awarded}")

        except frappe.DoesNotExistError:
            logger.error(f"Base Question {question_name} not found during grading for attempt {attempt_id} (Test Question Item: {test_q_item_id})")
            attempt_doc.append("answers", {
                "question": question_name,
                "test_question_item": test_q_item_id,
                "user_answer": str(user_answer) if user_answer is not None else None,
                "is_correct": None, 
                "points_awarded": 0,
                "submitted_at": now(),
                "time_spent_seconds": time_spent
            })
        except Exception as e:
            logger.error(f"Error grading question {question_name} (Test Question Item: {test_q_item_id}) for attempt {attempt_id}: {e}", exc_info=True)
            attempt_doc.append("answers", {
                "question": question_name,
                "test_question_item": test_q_item_id,
                "user_answer": str(user_answer) if user_answer is not None else None,
                "is_correct": None,
                "points_awarded": 0,
                "submitted_at": now(),
                "time_spent_seconds": time_spent
            })

    attempt_doc.final_score = total_score
    attempt_doc.status = "Completed" 
    attempt_doc.end_time = now()
    attempt_doc.remaining_time_seconds = time_left if time_left is not None else 0

    if last_viewed_test_q_detail_id and last_viewed_test_q_detail_id in test_q_details_map:
        attempt_doc.last_viewed_question = test_q_details_map[last_viewed_test_q_detail_id]["question"]
    else:
        attempt_doc.last_viewed_question = None

    attempt_doc.is_passed = False
    if total_possible_score > 0 and test_doc.passing_score is not None:
         score_percentage = (total_score / total_possible_score) * 10
         if score_percentage >= test_doc.passing_score:
             attempt_doc.is_passed = True
    elif test_doc.passing_score == 0: 
         attempt_doc.is_passed = True

    try:
        attempt_doc.save(ignore_permissions=True) 
        frappe.db.commit()
        logger.info(f"Test Attempt {attempt_id} submitted and saved successfully. Score: {total_score}/{total_possible_score}")
    except Exception as e:
        frappe.db.rollback()
        logger.error(f"Failed to save submitted Test Attempt {attempt_id}. Error: {e}", exc_info=True)
        frappe.throw(_("Could not save the submitted test attempt. Please try again."))

    generate_and_save_feedback_with_llm(attempt_doc)
    
    return {
        "status": attempt_doc.status,
        "score": attempt_doc.final_score,
        "passed": attempt_doc.is_passed,
        "attemptId": attempt_doc.name
    }

@frappe.whitelist(methods=["PATCH"])
def save_attempt_progress(attempt_id, progress_data):
    user = get_current_user()
    logger = frappe.logger("save_attempt_progress")

    try:
        progress_data_dict = json.loads(progress_data)
        answers_input = progress_data_dict.get("answers", {}) # keys are test_question_detail_id
        remaining_time = progress_data_dict.get("remainingTimeSeconds")
        last_viewed_test_q_detail_id = progress_data_dict.get("lastViewedTestQuestionId") # This is Test Question Item ID
    except json.JSONDecodeError:
        logger.error(f"Invalid progress_data JSON for attempt {attempt_id}.", exc_info=True)
        frappe.throw(_("Invalid progress data format."), frappe.ValidationError)
    except Exception as e:
        logger.error(f"Could not parse progress_data for attempt {attempt_id}. Error: {e}", exc_info=True)
        frappe.throw(_("Could not parse progress data."), frappe.ValidationError)
        
    try:
        attempt_doc = frappe.get_doc("Test Attempt", attempt_id)
    except frappe.DoesNotExistError:
        logger.error(f"Test Attempt {attempt_id} not found during save progress.")
        frappe.throw(_("Test Attempt {0} not found.").format(attempt_id), frappe.DoesNotExistError)

    if attempt_doc.user != user:
        logger.warning(f"User {user} tried to save progress for attempt {attempt_id} owned by {attempt_doc.user}.")
        frappe.throw(_("You are not permitted to save progress for this attempt."), frappe.PermissionError)
    if attempt_doc.status != "In Progress":
        logger.warning(f"Attempt to save progress for Test Attempt {attempt_id} which is not 'In Progress' (Status: {attempt_doc.status}).")
        frappe.throw(_("Cannot save progress. Status is {0}.").format(attempt_doc.status), frappe.ValidationError)

    attempt_doc.remaining_time_seconds = remaining_time

    if last_viewed_test_q_detail_id:
        base_question_name = frappe.db.get_value("Test Question Item", last_viewed_test_q_detail_id, "question")
        if base_question_name:
            attempt_doc.last_viewed_question = base_question_name # Stores the base Question.name
        else:
            attempt_doc.last_viewed_question = None
            logger.warning(f"Could not find base Question for Test Question Item {last_viewed_test_q_detail_id} during save progress for attempt {attempt_id}.")
    else:
        attempt_doc.last_viewed_question = None

    if answers_input:
        existing_answers_map = {
            ans.test_question_item: ans 
            for ans in attempt_doc.answers 
            if getattr(ans, 'test_question_item', None) 
        }
        logger.debug(f"SaveProgress: Existing answers map keys for attempt {attempt_id}: {list(existing_answers_map.keys())}")

        for test_q_item_id, answer_data in answers_input.items(): # test_q_item_id is Test Question Item ID
            user_answer = answer_data.get("userAnswer")
            
            # Get the base question name (Question.name) from the Test Question Item ID
            base_question_name = frappe.db.get_value("Test Question Item", test_q_item_id, "question")

            if not base_question_name:
                logger.warning(f"Skipping save progress for unknown Test Question Item ID {test_q_item_id} in attempt {attempt_id} (base question not found).")
                continue

            if test_q_item_id in existing_answers_map:
                answer_row = existing_answers_map[test_q_item_id]
                answer_row.user_answer = str(user_answer) if user_answer is not None else None
                answer_row.submitted_at = now()
                # Ensure grading fields are NOT set here during progress save
                answer_row.is_correct = None
                answer_row.points_awarded = None
                logger.debug(f"SaveProgress: Updated answer for Test Question Item {test_q_item_id} in attempt {attempt_id}.")
            else:
                attempt_doc.append("answers", {
                    "question": base_question_name, # Base Question.name
                    "test_question_item": test_q_item_id, 
                    "user_answer": str(user_answer) if user_answer is not None else None,
                    "submitted_at": now(),
                    "is_correct": None,
                    "points_awarded": None
                    # 'time_spent_seconds' is usually only sent on final submit, not progress save.
                    # If you do send it with progress_data, you can add it here.
                })
                logger.debug(f"SaveProgress: Appended new answer for Test Question Item {test_q_item_id} in attempt {attempt_id}.")
    try:
        attempt_doc.save(ignore_permissions=True)
        frappe.db.commit()
        logger.info(f"Progress saved for Test Attempt {attempt_id}.")
        return {"success": True}
    except Exception as e:
        frappe.db.rollback()
        logger.error(f"Failed to save progress for Test Attempt {attempt_id}: {e}", exc_info=True)
        frappe.throw(_("Could not save progress. Please try again."))


@frappe.whitelist()
def get_user_attempts_for_test(test_id):
    user = get_current_user()

    attempts = frappe.get_list(
        "Test Attempt",
        filters={"test": test_id, "user": user},
        fields=[
            "name as id", 
            "status",
            "final_score",
            "is_passed",
            "start_time",
            "end_time"
        ],
        order_by="start_time desc"
    )

    for attempt in attempts:
        attempt["time_taken_seconds"] = None
        if attempt.start_time and attempt.end_time:
            start = get_datetime(attempt.start_time)
            end = get_datetime(attempt.end_time)
            attempt["time_taken_seconds"] = time_diff_in_seconds(end, start)
    return attempts


@frappe.whitelist()
def get_attempt_result_details(attempt_id):
    user = get_current_user()
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    logger = frappe.logger("get_attempt_result_details") 

    try:
        attempt_doc = frappe.get_doc("Test Attempt", attempt_id)
        logger.info(f"Fetched Test Attempt: {attempt_doc.name}, Status: {attempt_doc.status}")
    except frappe.DoesNotExistError:
        logger.error(f"Test Attempt {attempt_id} not found.")
        frappe.throw(_("Test Attempt {0} not found.").format(attempt_id), frappe.DoesNotExistError)

    if hasattr(attempt_doc, 'user') and attempt_doc.user != user:
        logger.warning(f"Permission denied for user {user} on Test Attempt {attempt_id} owned by {attempt_doc.user}.")
        frappe.throw(_("You are not permitted to view results for this attempt."), frappe.PermissionError)
    elif not hasattr(attempt_doc, 'user'):
        logger.warning(f"Test Attempt {attempt_id} is missing the 'user' field.")

    if attempt_doc.status not in ["Completed", "Graded", "Timed Out"]:
        logger.info(f"Results not yet available for Test Attempt {attempt_id}. Status: {attempt_doc.status}.")
        frappe.throw(_("Results are not available yet (Status: {0}).").format(attempt_doc.status), frappe.ValidationError)

    try:
        test_doc = frappe.get_cached_doc("Test", attempt_doc.test)
        logger.info(f"Fetched Test definition: {test_doc.name} for Test Attempt {attempt_id}")
    except frappe.DoesNotExistError:
        logger.error(f"Associated Test {attempt_doc.test} for Attempt {attempt_id} not found.")
        frappe.throw(_("Associated Test not found."), frappe.DoesNotExistError)

    questions_answers = []
    total_possible_score = 0
    
    attempt_answers_map = {}
    if attempt_doc.answers:
        logger.info(f"Processing {len(attempt_doc.answers)} saved answer items for attempt {attempt_id}.")
        for i, ans_item in enumerate(attempt_doc.answers):
            key_for_lookup = getattr(ans_item, 'test_question_item', None) 
            if key_for_lookup:
                attempt_answers_map[key_for_lookup] = ans_item
            else:
                logger.warning(
                    f"Item {i+1} (name: {ans_item.name}): Could not find linking value for field ('test_question_item') or field itself is missing/None in attempt {attempt_id}. "
                    f"Value of 'test_question_item': {getattr(ans_item, 'test_question_item', 'FIELD_NOT_PRESENT')}. "
                    f"All Fields available: {ans_item.as_dict()}. User answer in this item: '{ans_item.user_answer}'"
                )
        logger.info(f"Attempt answers map populated for attempt {attempt_id}. Keys: {list(attempt_answers_map.keys())}")
    else:
        logger.info(f"No saved answer items found in attempt {attempt_id}.")

    logger.info(f"Iterating through {len(test_doc.questions)} questions from Test definition {test_doc.name}.")
    for tqd_idx, tqd in enumerate(test_doc.questions): 
        actual_points_for_question = getattr(tqd, 'points', 0) 
        total_possible_score += actual_points_for_question
        
        q_doc_data = {}
        question_options = [] 
        current_tqd_name = tqd.name 

        try:
            question_doc = frappe.get_doc("Question", tqd.question)
            q_doc_data = {
                'content': question_doc.content,
                'question_type': question_doc.question_type,
                'answer_key': question_doc.answer_key, 
                'explanation': question_doc.explanation,
                'image_url': getattr(question_doc, 'image', None) 
            }
            if question_doc.question_type == "Multiple Choice":
                correct_option_id_for_answer_key = None
                for opt_idx, option_row in enumerate(question_doc.get("options", [])):
                    question_options.append({ "id": option_row.name, "text": option_row.option_text, "label": chr(65 + opt_idx) })
                    if option_row.is_correct: correct_option_id_for_answer_key = option_row.name
                if correct_option_id_for_answer_key: q_doc_data['answer_key'] = correct_option_id_for_answer_key
                else:
                    q_doc_data['answer_key'] = None 
                    logger.warning(f"No correct option marked for MC Question {question_doc.name} (used in Test Question Item {current_tqd_name})")
        except frappe.DoesNotExistError:
            logger.error(f"Base Question Doc {tqd.question} not found for Test Question Item {current_tqd_name}")
        
        answer_item_for_this_question = attempt_answers_map.get(current_tqd_name)
        if answer_item_for_this_question: logger.info(f"Found answer item for Test Question Item '{current_tqd_name}'. User answer: '{answer_item_for_this_question.user_answer}'")
        else: logger.warning(f"No answer item found in map for Test Question Item '{current_tqd_name}'. User answer will be null. Map keys: {list(attempt_answers_map.keys())}")

        questions_answers.append({
            "q_id": tqd.question, "test_question_id": current_tqd_name, "q_content": q_doc_data.get('content'),
            "q_type": q_doc_data.get('question_type'), "options": question_options, "answer_key": q_doc_data.get('answer_key'),
            "explanation": q_doc_data.get('explanation'), "image_url": q_doc_data.get('image_url'),
            "user_answer": answer_item_for_this_question.user_answer if answer_item_for_this_question else None,
            "is_correct": answer_item_for_this_question.is_correct if answer_item_for_this_question else None,
            "points_awarded": answer_item_for_this_question.points_awarded if answer_item_for_this_question else None,
            "point_value": actual_points_for_question,
            "time_spent_seconds": answer_item_for_this_question.time_spent_seconds if answer_item_for_this_question else None,
        })

    time_taken_seconds = None
    if attempt_doc.start_time and attempt_doc.end_time: time_taken_seconds = time_diff_in_seconds(get_datetime(attempt_doc.end_time), get_datetime(attempt_doc.start_time))

    result = {
        "attempt": { "id": attempt_doc.name, "status": attempt_doc.status, "score": attempt_doc.final_score, "passed": attempt_doc.is_passed, "start_time": attempt_doc.start_time, "end_time": attempt_doc.end_time, "time_taken_seconds": time_taken_seconds, },
        "test": { "id": test_doc.name, "title": test_doc.title, "passing_score": test_doc.passing_score, "total_possible_score": total_possible_score, },
        "questions_answers": questions_answers, "feedback": None, "recommendation": None, 
        "recommendation": attempt_doc.recommendation if hasattr(attempt_doc, 'recommendation') else None,
        "feedback": attempt_doc.feedback if hasattr(attempt_doc, 'feedback') else None,
    }
    logger.info(f"Finished processing results for attempt {attempt_id}. Returning {len(questions_answers)} question answer details.")
    return result

import logging

logger = logging.getLogger(__name__)

def extract_json_from_markdown(text):
    """
    Extract JSON from Markdown-style code blocks, handling case sensitivity and whitespace.
    Returns cleaned JSON string or original text if no match.
    """
    # Match code blocks with optional 'json' (case-insensitive)
    markdown_match = re.search(
        r"^\s*```(?:json\s+)?([\s\S]+?)\s*```\s*$", 
        text, 
        re.IGNORECASE | re.MULTILINE
    )
    
    if markdown_match:
        # If found in code block, use the inner content
        return markdown_match.group(1).strip()
    else:
        # Otherwise, use the full text
        return text.strip()


def generate_and_save_feedback_with_llm(attempt_doc):
    logger = frappe.logger("llm_feedback")
    try:
        questions_and_answers = []
        for ans in attempt_doc.answers:
            # Fetch question content
            try:
                question_doc = frappe.get_doc("Question", ans.question)
                question_content = getattr(question_doc, "content", None)
                question_type = getattr(question_doc, "question_type", None)
            except Exception as e:
                logger.warning(f"Could not fetch content/type for question {ans.question}: {e}")
                question_content = None
                question_type = getattr(ans, "question_type", None)
            questions_and_answers.append({
                "question": ans.question,
                "question_content": question_content,
                "user_answer": ans.user_answer,
                "is_correct": ans.is_correct,
                "points_awarded": ans.points_awarded,
                "question_type": question_type,
            })
        llm_payload = {
            "questions_and_answers": questions_and_answers
        }
        # --- Improved Prompt ---
        prompt = (
            "Given the following test attempt results, analyze the student's performance by question type (e.g., Multiple Choice, Self Write, etc.). "
            "Each item includes the question content. Identify which types of questions the student most often answered incorrectly or left blank. "
            "Provide feedback that highlights these weak areas and give a recommendation for improvement. "
            "Return your response as JSON: {\"feedback\": \"...\", \"recommendation\": \"...\"}.\n"
            f"Results: {json.dumps(llm_payload)}"
        )
        api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCzNeZniLmBPMLw5vwrAJTKIhkyMaFFxIg"
        response = requests.post(
            api_url,
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=10
        )
        if response.ok:
            llm_result = response.json()
            text = llm_result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            
            # Extraction and parsing flow
            json_candidate = extract_json_from_markdown(text)
            feedback_data = None

            # First try parsed candidate
            try:
                logger.debug(f"Attempt 1: Trying to parse extracted candidate: {repr(json_candidate)}")
                feedback_data = json.loads(json_candidate)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON parse failed for extracted content. Attempting raw text. Error: {e}")
                # Fallback: try original text
                try:
                    logger.debug(f"Attempt 2: Trying raw text: {repr(text)}")
                    feedback_data = json.loads(text)
                except json.JSONDecodeError as e2:
                    logger.error(f"Final JSON parse failed. Using raw text. Error: {e2}")
                    feedback_data = None

            # Set values based on parsing results
            if feedback_data:
                attempt_doc.feedback = feedback_data.get("feedback", "")
                attempt_doc.recommendation = feedback_data.get("recommendation", "")
            else:
                attempt_doc.feedback = text
                attempt_doc.recommendation = None

            attempt_doc.save(ignore_permissions=True)
            frappe.db.commit()

        else:
            logger.warning(f"API call failed: {response.status_code} {response.text}")
            
    except Exception as e:
        logger.error(f"Critical error in feedback generation: {e}", exc_info=True)

@frappe.whitelist()
def get_user_attempts_for_all_tests():
    """
    Get all test attempts for the current user across all tests
    
    Returns:
        list: List of test attempts with detailed information
    """
    try:
        user = get_current_user()
        
        # Get all attempts for the user
        attempts = frappe.get_list(
            "Test Attempt",
            filters={"user": user},
            fields=[
                "name as id", 
                "test as test_id",
                "status",
                "final_score",
                "is_passed",
                "start_time",
                "end_time",
                "feedback",
                "recommendation"
            ],
            order_by="start_time desc"
        )
        
        # Log attempts for debugging
        frappe.logger().debug(f"Test attempts for user {user}: {attempts}")
        
        # Add additional information to each attempt
        for attempt in attempts:
            # Get test title
            if attempt.get('test_id'):
                test_title = frappe.db.get_value("Test", attempt.test_id, "title")
                attempt["test_title"] = test_title or attempt.test_id
            
            # Calculate time taken
            attempt["time_taken_seconds"] = None
            if attempt.get('start_time') and attempt.get('end_time'):
                start = get_datetime(attempt.start_time)
                end = get_datetime(attempt.end_time)
                attempt["time_taken_seconds"] = time_diff_in_seconds(end, start)
        
        return attempts or []  # Đảm bảo trả về mảng rỗng thay vì None
    except Exception as e:
        frappe.logger().error(f"Error in get_user_attempts_for_all_tests: {str(e)}")
        return []