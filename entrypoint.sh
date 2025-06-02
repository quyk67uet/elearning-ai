#!/bin/bash
set -xe # Exit on error, print commands

# --- Biến môi trường cần được set (thông qua docker-compose.yml) ---
: "${DB_HOST?DB_HOST not set or empty}"
: "${DB_PORT?DB_PORT not set or empty}"
: "${DB_NAME_APP?DB_NAME_APP not set or empty}"
: "${DB_USER_APP?DB_USER_APP not set or empty}"
: "${DB_PASSWORD_APP?DB_PASSWORD_APP not set or empty}"
: "${REDIS_CACHE_URL?REDIS_CACHE_URL not set or empty}"
: "${REDIS_QUEUE_URL?REDIS_QUEUE_URL not set or empty}"
: "${REDIS_SOCKETIO_URL?REDIS_SOCKETIO_URL not set or empty}"
: "${FRONTEND_URL?FRONTEND_URL not set or empty}" # URL public của Frontend mà Frappe sẽ dùng
: "${JWT_SECRET?JWT_SECRET not set or empty}"
: "${ENCRYPTION_KEY?ENCRYPTION_KEY not set or empty}"
: "${SITE_NAME_VAR?SITE_NAME_VAR not set or empty}"
: "${ADMIN_PASSWORD?ADMIN_PASSWORD not set or empty}"
: "${PORT?PORT not set or empty}" # Port Frappe lắng nghe bên trong container
: "${AUTO_EMAIL_ID?AUTO_EMAIL_ID not set or empty}"
: "${EMAIL_ACCOUNT?EMAIL_ACCOUNT not set or empty}"
: "${MAIL_LOGIN?MAIL_LOGIN not set or empty}"
: "${MAIL_PASSWORD?MAIL_PASSWORD not set or empty}"
: "${SMTP_SERVER?SMTP_SERVER not set or empty}"
: "${SMTP_PORT?SMTP_PORT not set or empty}"
: "${GEMINI_API_KEY?GEMINI_API_KEY not set or empty}"


SITE_PATH="/app/elearning-bench/sites/$SITE_NAME_VAR"
SITE_CONFIG_FILE="$SITE_PATH/site_config.json"
APP_INSTALLED_FLAG="$SITE_PATH/.app_elearning_installed"

mkdir -p "$SITE_PATH/logs"

# Hàm để tạo nội dung site_config.json
generate_site_config_content() {
    cat <<EOF
{
    "db_host": "$DB_HOST",
    "db_port": $DB_PORT,
    "db_name": "$DB_NAME_APP",
    "db_user": "$DB_USER_APP",
    "db_password": "$DB_PASSWORD_APP",
    "db_type": "mariadb",
    "redis_cache": "$REDIS_CACHE_URL",
    "redis_queue": "$REDIS_QUEUE_URL",
    "redis_socketio": "$REDIS_SOCKETIO_URL",
    "allow_cors": "*",
    "auto_email_id": "$AUTO_EMAIL_ID",
    "cors_header_whitelist": [
        "X-Frappe-CSRF-Token",
        "X-Requested-With",
        "Authorization",
        "Accept",
        "Content-Type"
    ],
    "email_account": "$EMAIL_ACCOUNT",
    "encryption_key": "$ENCRYPTION_KEY",
    "frontend_url": "$FRONTEND_URL",
    "jwt_expiry": 86400,
    "jwt_secret": "$JWT_SECRET",
    "mail_login": "$MAIL_LOGIN",
    "mail_password": "$MAIL_PASSWORD",
    "smtp_port": "$SMTP_PORT",
    "smtp_server": "$SMTP_SERVER",
    "gemini_api_key": "$GEMINI_API_KEY",
    "use_tls": 1,
    "developer_mode": 0,
    "socketio_port": $PORT
}
EOF
}

# Luôn tạo/cập nhật site_config.json để đảm bảo nó đồng bộ với biến môi trường
echo "Ensuring $SITE_CONFIG_FILE is configured correctly..."
generate_site_config_content > "$SITE_CONFIG_FILE"
echo "DEBUG: Contents of $SITE_CONFIG_FILE after ensuring configuration:"
cat "$SITE_CONFIG_FILE"


if [ ! -f "$APP_INSTALLED_FLAG" ]; then
    echo "Application not fully installed yet. Proceeding with site creation and app installation..."

    # Kiểm tra xem site đã tồn tại trong bench chưa, nếu chưa thì tạo mới
    if ! bench list-sites | grep -q "^$SITE_NAME_VAR$"; then
        echo "Site $SITE_NAME_VAR not found in bench list-sites. Running new-site..."
        # bench new-site sẽ đọc site_config.json mà chúng ta vừa tạo ở trên
        # để lấy thông tin DB (bao gồm db_user) cho các thao tác ban đầu của nó.
        bench new-site "$SITE_NAME_VAR" \
            --db-name "$DB_NAME_APP" \ # Vẫn cần để bench biết tên site
            --db-type mariadb \
            --admin-password "$ADMIN_PASSWORD" \
            --force 
        echo "Site $SITE_NAME_VAR created/verified in bench."
    else
        echo "Site $SITE_NAME_VAR already exists in bench."
    fi

    echo "Running initial database migrations for $SITE_NAME_VAR..."
    bench --site "$SITE_NAME_VAR" migrate
    echo "Initial database migrations completed."

    echo "Installing elearning app on $SITE_NAME_VAR..."
    bench --site "$SITE_NAME_VAR" install-app elearning
    touch "$APP_INSTALLED_FLAG"
    echo "elearning app installed."

else
    echo "Site $SITE_NAME_VAR and app 'elearning' appear to be already set up."
    # site_config.json đã được cập nhật ở đầu script.
    echo "Running database migrations for $SITE_NAME_VAR (for updates)..."
    bench --site "$SITE_NAME_VAR" migrate
    echo "Database migrations completed."
fi

bench use "$SITE_NAME_VAR"

echo "Starting Frappe server for site $SITE_NAME_VAR on port $PORT..."
bench serve --port "$PORT"