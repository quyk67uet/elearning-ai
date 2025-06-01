import frappe
from frappe import _
from frappe.utils import validate_email_address, random_string, get_url, now, add_to_date, now_datetime, get_datetime # Đã xóa encode_uri_component
from frappe.utils.password import update_password as frappe_update_password
from frappe.core.doctype.user.user import test_password_strength, generate_keys
import uuid
import base64
import urllib.parse # THÊM IMPORT NÀY


# --- User Signup and Email Verification ---

@frappe.whitelist(allow_guest=True)
def custom_user_signup(first_name, last_name, email, password, age_level=None, redirect_to=None):
    """
    Sign up a new user, create a verification token, and send a verification email.
    User is created as disabled until email is verified.
    """
    # Ensure Student Role exists
    if not frappe.db.exists("Role", "Student"):
        frappe.get_doc({
            "doctype": "Role",
            "role_name": "Student",
            "desk_access": 0
        }).insert(ignore_permissions=True)
    
    # Validate email
    if not validate_email_address(email):
        frappe.throw(_("Invalid email address"))
    
    # Check if user already exists
    if frappe.db.exists("User", email):
        frappe.throw(_("Email already registered"))
    
    # Check password strength
    # user_data for test_password_strength should be a tuple in the order:
    # (name, first_name, last_name, email, birth_date)
    user_data_tuple_for_strength_test = (
        f"{first_name} {last_name}", # name (full name)
        first_name,
        last_name,
        email,
        None  # birth_date (set to None if not available)
    )
    test_password_strength(password, user_data=user_data_tuple_for_strength_test) # Truyền tuple vào đây

    # Create user - Initially disabled
    user = frappe.get_doc({
        "doctype": "User",
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "send_welcome_email": 0, # We are sending a verification email
        "enabled": 0,  # Start with disabled user until email is verified
        "new_password": password, # Frappe will hash this on insert
        "roles": [{"role": "Student"}]
    })
    
    if age_level:
        # Assuming 'age_level' is a custom field in User DocType.
        # Ensure this field exists in your User DocType customization.
        user.age_level = age_level
    
    user.insert(ignore_permissions=True)
    
    # Create a student profile (if Student DocType exists)
    create_student_profile(user.name, first_name, last_name, email, age_level)

    # Generate verification token
    verification_token = generate_verification_token(email)

    # Store token in Email Verification Token doctype
    token_doc_name = create_email_verification_token(email, verification_token, redirect_to)
    if not token_doc_name:
        frappe.db.rollback() # Rollback user creation if token cannot be made
        frappe.throw(_("Failed to create verification token. Please try again."))

    # Send verification email
    api_verify_url = f"{frappe.utils.get_request_site_address(True)}/api/method/elearning.api.auth.verify_email_token_and_redirect?token={verification_token}"

    email_subject = _("Verify Your Email Address for Elearning Platform")
    email_message = _("""Hi {0},<br><br>
                        Thank you for registering. Please click the link below to verify your email address:<br>
                        <a href="{1}">{1}</a><br><br>
                        This link will expire in 24 hours.<br><br>
                        If you did not request this, please ignore this email.""").format(first_name, api_verify_url)

    frappe.sendmail(
        recipients=email,
        subject=email_subject,
        message=email_message,
        now=True # Send immediately
    )
    
    return {
        "success": True,
        "message": _("Registration successful. Please check your email for verification."),
        "email": email
    }

def generate_verification_token(email):
    """Generate a unique verification token for email verification."""
    # Using a more standard approach for token generation
    return random_string(40) # Frappe's random_string is cryptographically secure

def create_email_verification_token(email, token, redirect_to=None):
    """Create and store email verification token. Assumes 'Email Verification Token' DocType exists."""
    if not frappe.db.exists("DocType", "Email Verification Token"):
        # This DocType should be created manually or via fixtures/migrations, not on-the-fly here.
        frappe.log_error("DocType 'Email Verification Token' does not exist.", "Email Verification Setup Error")
        frappe.throw(_("Email verification system is not properly configured."))
        return None # Indicate failure

    # Delete any existing UNUSED tokens for this email to prevent multiple active tokens
    existing_tokens = frappe.get_all("Email Verification Token",
                                     filters={"email": email, "used": 0},
                                     fields=["name"])
    for t in existing_tokens:
        frappe.delete_doc("Email Verification Token", t.name, ignore_permissions=True)

    # Create new token with 24-hour expiry
    current_dt = now_datetime() # Use Frappe's now_datetime()
    expiry_dt = add_to_date(current_dt, hours=24)

    try:
        verification_doc = frappe.get_doc({
            "doctype": "Email Verification Token",
            "email": email,
            "token": token,
            "expiry": expiry_dt,
            "redirect_to": redirect_to or "", # Store the intended final redirect URL from frontend
            "used": 0
        })
        verification_doc.insert(ignore_permissions=True)
        # frappe.db.commit() # Usually not needed, Frappe handles transaction
        return verification_doc.name # Return the name of the created token document
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Email Verification Token Error")
        return None # Indicate failure

# Removed create_email_verification_doctype() - This should be done via Desk or fixtures.

@frappe.whitelist(allow_guest=True)
def verify_email_token_and_redirect(token):
    """
    Verify email token, enable user, and redirect to a frontend page.
    This endpoint is meant to be called from the link in the verification email.
    """
    frontend_base_url = frappe.conf.get("frontend_url") or \
                        (frappe.utils.get_request_site_address(True) if frappe.local.site else "http://localhost:3000")
    
    verification_success_url = f"{frontend_base_url}/auth/email-verified"
    verification_failure_url = f"{frontend_base_url}/auth/verification-failed"

    try:
        if not token:
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=missing_token"
            return

        if not frappe.db.exists("DocType", "Email Verification Token"):
            frappe.log_error("DocType 'Email Verification Token' not found during verification.", "Email Verification Error")
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=setup_error"
            return

        token_doc_name = frappe.db.get_value("Email Verification Token", {"token": token, "used": 0})
        
        if not token_doc_name:
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=invalid_or_used_token"
            return

        token_record = frappe.get_doc("Email Verification Token", token_doc_name)

        if get_datetime(now()) > get_datetime(token_record.expiry): # Ensure comparison of datetime objects
            token_record.used = 1 # Mark as used even if expired to prevent reuse
            token_record.save(ignore_permissions=True)
            frappe.db.commit()
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=expired_token"
            return

        token_record.used = 1
        token_record.save(ignore_permissions=True)
        
        email_to_verify = token_record.email
        if not frappe.db.exists("User", email_to_verify):
            frappe.log_error(f"User {email_to_verify} not found during email verification for token {token}", "Email Verification Error")
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=user_not_found"
            return

        user = frappe.get_doc("User", email_to_verify)
        if not user.enabled:
            user.enabled = 1
            # If you have a custom field like 'email_verified' on User DocType:
            if hasattr(user, 'email_verified'):
                 user.email_verified = 1
            user.save(ignore_permissions=True)
        
        frappe.db.commit() # Commit changes

        # Redirect to a success page on the frontend
        # The frontend page can then redirect to login or show a "Go to Login" button
        final_redirect = token_record.redirect_to or verification_success_url
        if "?email=" not in final_redirect: # Append email if not already there for the success page
            final_redirect += f"?email={urllib.parse.quote(email_to_verify)}" # SỬA Ở ĐÂY

        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = final_redirect
        return

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Verify Email Token and Redirect Error")
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = f"{verification_failure_url}?error=server_error"
        return

# --- Student Profile ---
def create_student_profile(user_name, first_name, last_name, email, age_level=None):
    """Create a student profile if Student DocType exists and profile doesn't exist."""
    if not frappe.db.exists("DocType", "Student"):
        frappe.log_error("DocType 'Student' does not exist. Cannot create student profile.", "Student Profile Creation")
        return
    
    if frappe.db.exists("Student", {"user": user_name}): # Check by user link is more robust
        return
    
    try:
        student_doc_data = {
        "doctype": "Student",
        "first_name": first_name,
        "last_name": last_name,
            "email": email, # Assuming Student DocType has an email field
            "user": user_name, # Link to the User document
            "student_name": f"{first_name} {last_name}" # Or however you define student_name
        }
        if age_level:
            student_doc_data["age_level"] = age_level # Assuming 'age_level' is a field in Student DocType

        student = frappe.get_doc(student_doc_data)
        student.insert(ignore_permissions=True)
        # frappe.db.commit() # Usually not needed
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Create Student Profile Error for {user_name}")


# --- Resend Verification ---
@frappe.whitelist(allow_guest=True)
def resend_verification_email_api(email): # Renamed to avoid conflict if you have another
    """Resend verification email if user exists and is not yet verified/enabled."""
    if not email or not validate_email_address(email):
        frappe.throw(_("Valid email is required."))

    if not frappe.db.exists("User", email):
        frappe.throw(_("User with this email not found."))
    
    user = frappe.get_doc("User", email)
    
    if user.enabled: # If user is already enabled, assume verified
        frappe.throw(_("Email is already verified for this user."))
    
    # Generate a new token or re-use an existing one (better to generate new)
    new_verification_token = generate_verification_token(email)
    token_doc_name = create_email_verification_token(email, new_verification_token, None) # redirect_to can be None

    if not token_doc_name:
        frappe.throw(_("Failed to prepare new verification token. Please contact support."))

    api_verify_url = f"{frappe.utils.get_request_site_address(True)}/api/method/elearning.api.auth.verify_email_token_and_redirect?token={new_verification_token}"
    
    email_subject = _("Verify Your Email Address for Elearning Platform (Resend)")
    email_message = _("""Hi {0},<br><br>
                        We received a request to resend your email verification link. Please click the link below to verify your email address:<br>
                        <a href="{1}">{1}</a><br><br>
                        This link will expire in 24 hours.<br><br>
                        If you did not request this, please ignore this email.""").format(user.first_name, api_verify_url)

    frappe.sendmail(
        recipients=email,
        subject=email_subject,
        message=email_message,
        now=True
    )

    return {"success": True, "message": _("A new verification email has been sent.")}


# --- Social Login ---
@frappe.whitelist(allow_guest=True)
def social_login_handler(provider, user_id, email, full_name, picture=None, access_token=None): # Renamed
    """Handles user creation/login via social providers and returns user info and Frappe session."""
    try:
        user_doc = None
        is_new_user = False

        if frappe.db.exists("User", email):
            user_doc = frappe.get_doc("User", email)
            # Ensure user is enabled if they exist (e.g., if they signed up normally then social)
            if not user_doc.enabled:
                user_doc.enabled = 1
                # Consider if email_verified flag needs setting here too
                if hasattr(user_doc, 'email_verified') and not user_doc.email_verified:
                    user_doc.email_verified = 1
                user_doc.save(ignore_permissions=True)


            # Check and add social login if not present
            has_provider_login = any(sl.provider == provider and sl.userid == user_id for sl in user_doc.social_logins)
            if not has_provider_login:
                user_doc.append("social_logins", {
                    "provider": provider,
                    "userid": user_id
                })
                user_doc.save(ignore_permissions=True)
        else:
            is_new_user = True
            # Create new user
            # Split full_name carefully
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user_doc = frappe.get_doc({
                "doctype": "User",
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "send_welcome_email": 0,
                "enabled": 1, # Enable directly for social logins
                "new_password": random_string(20), # Generate a random secure password
                "roles": [{"role": "Student"}],
                "social_logins": [{
                "provider": provider,
                "userid": user_id
                }]
            })
            if hasattr(user_doc, 'email_verified'): # Assume email from social provider is verified
                user_doc.email_verified = 1
            
            if picture:
                user_doc.user_image = picture

            user_doc.insert(ignore_permissions=True)
            create_student_profile(user_doc.name, first_name, last_name, email)

        # Log in the user in Frappe and create a Frappe session
        frappe.local.login_manager.login_as(user_doc.name)
        # make_session will set the sid cookie in the response
        # This is crucial for subsequent API calls from the client if not using a separate token
        frappe.local.login_manager.make_session(resume=True)


        # For NextAuth, you might not need to return a Frappe API key/secret.
        # NextAuth will manage its own session based on this successful Frappe login.
        # The 'sid' cookie set by make_session() is what Frappe backend will use.
        return {
            "success": True,
            "message": "Logged in successfully via " + provider,
            "user_info": { # This is what NextAuth's authorize function might return
                "id": user_doc.name, # Frappe user ID (email)
                "name": user_doc.full_name,
                "email": user_doc.email,
                "image": user_doc.user_image
            },
            "is_new_user": is_new_user
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Social Login Handler Error for {email} via {provider}")
        frappe.response.http_status_code = 500
        return {"success": False, "message": str(e)}


# --- Password Update (Directly, use with caution) ---
@frappe.whitelist(allow_guest=True)
def update_user_password_api(user_email=None, new_password=None, user=None, reset_token=None):
    """
    Update a user's password (authenticated endpoint)
    Parameters:
        user_email: Email of the user to update password
        new_password: New password for the user
        user: Alternative parameter name for user_email (for compatibility)
        reset_token: Optional token for password reset without authentication
    """
    try:
        # Handle alternative parameter name
        if user_email is None and user is not None:
            user_email = user
        
        # Get current session user
        session_user = frappe.session.user
        
        # Check if this is a reset password request from the reset-password API
        is_reset_password_request = False
        # If we're handling this from reset-password.js, we'll bypass authentication checks
        if session_user == "Guest" and frappe.request and frappe.request.path:
            request_path = frappe.request.path
            if "/api/method/elearning.api.auth.update_user_password" in request_path:
                # Confirm it's coming from our reset password flow by checking the referrer or a special header
                if (frappe.request.environ.get('HTTP_REFERER') and '/reset-password' in frappe.request.environ.get('HTTP_REFERER')) \
                    or frappe.request.headers.get('X-From-Reset-Password'):
                    is_reset_password_request = True
        
        # Authenticate the request
        if session_user == "Guest" and not is_reset_password_request:
            frappe.throw(_("Authentication required to update password."), frappe.AuthenticationError)
        
        # Validate required parameters
        if not user_email:
            frappe.throw(_("Email address is required to update password"))
        
        if not new_password:
            frappe.throw(_("New password is required"))
        
        # If user is trying to change someone else's password and it's not a reset request,
        # verify permissions
        if session_user != user_email and not is_reset_password_request and not frappe.has_permission("User", "write", session_user):
            frappe.throw(_("You do not have permission to update this user's password."), frappe.PermissionError)
        
        # Check if user exists
    if not frappe.db.exists("User", user_email):
        frappe.throw(_("User not found"))
    
        # Password strength check
    user_doc = frappe.get_doc("User", user_email)
        user_data = (
            user_doc.full_name or f"{user_doc.first_name} {user_doc.last_name}",
            user_doc.first_name,
            user_doc.last_name,
            user_doc.email,
            user_doc.birth_date if hasattr(user_doc, "birth_date") else None
        )
        test_password_strength(new_password, user_data=user_data)
        
        # Use Frappe's password update function which handles hashing
        frappe_update_password(user_email, new_password)
        
        return {
            "success": True,
            "message": _("Password updated successfully.")
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Password Update Error")
        frappe.throw(_("Error updating password: {0}").format(str(e)))

@frappe.whitelist(allow_guest=True)
def update_user_password(user_email=None, new_password=None, user=None, reset_token=None):
    """
    Alias for update_user_password_api to maintain backward compatibility
    Also handles direct form submissions where parameters might come from form_dict
    """
    # Debug: log request parameters
    frappe.logger().debug(f"update_user_password called with: user_email={user_email}, user={user}, has_reset_token={bool(reset_token)}")
    
    if hasattr(frappe.local, 'form_dict'):
        frappe.logger().debug(f"form_dict contains: {frappe.local.form_dict}")
    
    # Accept user parameter as alias for user_email
    if user_email is None:
        user_email = user
    
    # Attempt to get parameters from form_dict if not provided as arguments
    if user_email is None and hasattr(frappe.local, 'form_dict'):
        user_email = frappe.local.form_dict.get('user_email') or frappe.local.form_dict.get('email') or frappe.local.form_dict.get('user')
    
    if new_password is None and hasattr(frappe.local, 'form_dict'):
        new_password = frappe.local.form_dict.get('new_password') or frappe.local.form_dict.get('password')
    
    if reset_token is None and hasattr(frappe.local, 'form_dict'):
        reset_token = frappe.local.form_dict.get('reset_token')
    
    # Debug: log resolved parameters
    frappe.logger().debug(f"Resolved parameters: user_email={user_email}, new_password_length={len(new_password) if new_password else 0}, has_reset_token={bool(reset_token)}")
    
    # Validate required parameters
    if not user_email:
        frappe.throw(_("Email address is required to update password"))
    
    if not new_password:
        frappe.throw(_("New password is required"))
        
    # Call the actual implementation
    return update_user_password_api(user_email, new_password, user=None, reset_token=reset_token)

# --- Helper: Mark Email Verified (Potentially for admin or specific flows) ---
# This function might be redundant if verify_email_token_and_redirect handles enabling user.
# @frappe.whitelist(allow_guest=True) # SECURITY: Should not be allow_guest unless for specific internal use
# def mark_email_verified_api(email): # Renamed
#     if not frappe.db.exists("User", email):
#         frappe.throw(_("User not found"))
#     user = frappe.get_doc("User", email)
#     if not user.enabled:
#         user.enabled = 1
#     if hasattr(user, 'email_verified'):
#         user.email_verified = 1
#     user.save(ignore_permissions=True)
#     frappe.db.commit()
#     return {"success": True, "message": _("Email marked as verified.")}

# --- Test Reset Password (Simple existence check) ---
# This is okay as a simple check.
@frappe.whitelist(allow_guest=True)
def test_user_exists_for_reset(user_email): # Renamed
    if not frappe.db.exists("User", user_email):
        frappe.throw(_("User with this email not found."))
    return {"success": True, "message": _("User exists. Password reset can proceed.")}


# Legacy signup - keep if needed for backward compatibility, otherwise remove.
# @frappe.whitelist(allow_guest=True)
# def signup(first_name, last_name, email, password, age_level=None):
#     return custom_user_signup(first_name, last_name, email, password, age_level)