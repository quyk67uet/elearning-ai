#!/bin/bash
set -xe # Exit on error, print commands

# Bắt buộc:
: "${DB_HOST?DB_HOST not set or empty}"
: "${DB_PORT?DB_PORT not set or empty}"
: "${DB_NAME_APP?DB_NAME_APP not set or empty}"
: "${DB_USER_APP?DB_USER_APP not set or empty}"
: "${DB_PASSWORD_APP?DB_PASSWORD_APP not set or empty}"
: "${REDIS_CACHE_URL?REDIS_CACHE_URL not set or empty}"
: "${REDIS_QUEUE_URL?REDIS_QUEUE_URL not set or empty}"
: "${REDIS_SOCKETIO_URL?REDIS_SOCKETIO_URL not set or empty}"
: "${CA_PEM_CONTENT?CA_PEM_CONTENT not set or empty}"
: "${FRONTEND_URL?FRONTEND_URL not set or empty}"
: "${JWT_SECRET?JWT_SECRET not set or empty}" 
: "${ENCRYPTION_KEY?ENCRYPTION_KEY not set or empty}" 
: "${SITE_NAME_VAR?SITE_NAME_VAR not set or empty}" # Ví dụ: learn.local
: "${ADMIN_PASSWORD?ADMIN_PASSWORD not set or empty}" # Mật khẩu cho user Administrator
: "${PORT?PORT not set or empty}" 

# Cấu hình Email 
AUTO_EMAIL_ID="${AUTO_EMAIL_ID:-noreply@$(echo $SITE_NAME_VAR | sed 's/^[^.]*\.//')}"
: "${EMAIL_ACCOUNT:=$AUTO_EMAIL_ID}" 
: "${MAIL_LOGIN?MAIL_LOGIN for SMTP not set or empty (required if using SMTP)}"
: "${MAIL_PASSWORD?MAIL_PASSWORD for SMTP not set or empty (required if using SMTP)}"
: "${SMTP_SERVER?SMTP_SERVER not set or empty (required if using SMTP)}"
SMTP_PORT="${SMTP_PORT:-587}" 

# API Keys
: "${GEMINI_API_KEY?GEMINI_API_KEY not set or empty (if Gemini integration is used)}"
# --- Kết thúc khai báo biến môi trường ---

SITE_PATH="/app/elearning-bench/sites/$SITE_NAME_VAR"
CA_PEM_FILE="$SITE_PATH/ca.pem"

mkdir -p "$SITE_PATH/logs"

# Tạo file ca.pem từ biến môi trường
echo "Creating CA certificate..."
echo "$CA_PEM_CONTENT" > "$CA_PEM_FILE"
if [ ! -s "$CA_PEM_FILE" ]; then
    echo "ERROR: CA_PEM_FILE is empty. CA_PEM_CONTENT environment variable might not be set correctly."
    exit 1
fi
echo "CA certificate created successfully at $CA_PEM_FILE"

APP_INSTALLED_FLAG="$SITE_PATH/.app_elearning_installed"

if [ ! -f "$SITE_PATH/site_config.json" ] || [ ! -f "$APP_INSTALLED_FLAG" ]; then
    if [ ! -f "$SITE_PATH/site_config.json" ]; then
        echo "site_config.json not found. Creating new site structure for $SITE_NAME_VAR..."

        bench new-site "$SITE_NAME_VAR" \
            --db-name "$DB_NAME_APP" \
            --db-password "temppassword" \
            --db-host "$DB_HOST" \
            --db-port "$DB_PORT" \
            --db-type mariadb \
            --admin-password "$ADMIN_PASSWORD" \
            --no-setup-db \
            --force

        echo "Site structure for $SITE_NAME_VAR created."
    else
        echo "site_config.json found, but app may not be installed or configured."
    fi

    echo "Configuring $SITE_PATH/site_config.json..."
    cat > "$SITE_PATH/site_config.json" <<EOF
{
    "db_host": "$DB_HOST",
    "db_port": $DB_PORT,
    "db_name": "$DB_NAME_APP",
    "db_user": "$DB_USER_APP",
    "db_password": "$DB_PASSWORD_APP",
    "db_type": "mariadb",
    "db_ssl_ca": "$CA_PEM_FILE",
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
    echo "DEBUG: Contents of $SITE_PATH/site_config.json after configuration:"
    cat "$SITE_PATH/site_config.json"

    echo "Running initial database migrations for $SITE_NAME_VAR..."
    bench --site "$SITE_NAME_VAR" migrate
    echo "Initial database migrations completed."

    echo "Installing elearning app on $SITE_NAME_VAR..."
    bench --site "$SITE_NAME_VAR" install-app elearning
    touch "$APP_INSTALLED_FLAG"
    echo "elearning app installed."

else
    echo "Site $SITE_NAME_VAR and app 'elearning' appear to be already set up and configured."
    echo "Running database migrations for $SITE_NAME_VAR (for updates)..."
    bench --site "$SITE_NAME_VAR" migrate
    echo "Database migrations completed."
fi

bench use "$SITE_NAME_VAR"

echo "Starting Frappe server for site $SITE_NAME_VAR on port $PORT..."
bench serve --port "$PORT" 