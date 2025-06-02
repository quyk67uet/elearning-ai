#!/bin/bash

# Enable debugging and exit on error
set -xe

# Define paths and variables
SITE_NAME="learn.local"
SITE_PATH="/app/elearning-bench/sites/$SITE_NAME"
LOG_DIR="$SITE_PATH/logs"
CA_CERT_PATH="$SITE_PATH/ca.pem"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Redirect all output to a log file as well as stdout
exec > >(tee "$LOG_DIR/setup.log") 2>&1

# Write CA certificate if available
if [ -n "$CA_PEM_CONTENT" ]; then
    echo "$CA_PEM_CONTENT" > "$CA_CERT_PATH"
    echo "✅ CA certificate written to $CA_CERT_PATH"
else
    echo "⚠️ Warning: CA_PEM_CONTENT environment variable not set"
fi

# Check if site already exists
if [ ! -f "$SITE_PATH/site_config.json" ]; then
    echo "🛠️ Creating new site $SITE_NAME..."

    # Create new site with MySQL connection (Aiven)
    bench new-site "$SITE_NAME" \
        --db-host mariadb://elearning_newsuseful:f6d21f0ba5c1b4c7ef78f4ce9ff4afcaf71cfa58@equih.h.filess.io:61000/elearning_newsuseful \
        --db-port 61000 \
        --db-user elearning_newsuseful \
        --db-password f6d21f0ba5c1b4c7ef78f4ce9ff4afcaf71cfa58 \
        --db-type mariadb \
        --force \
        --no-mariadb-socket

    # Install your custom app
    echo "📦 Installing elearning app..."
    bench --site "$SITE_NAME" install-app elearning

    # Set custom configs via `bench set-config`
    echo "⚙️ Setting additional site config values..."

    #bench --site "$SITE_NAME" set-config db_ssl_ca "$CA_CERT_PATH"
    bench --site "$SITE_NAME" set-config redis_cache "redis://red-d0194tqdbo4c73fvoe0g:6379"
    bench --site "$SITE_NAME" set-config redis_queue "redis://red-d0194tqdbo4c73fvoe0g:6379"
    bench --site "$SITE_NAME" set-config redis_socketio "redis://red-d0194tqdbo4c73fvoe0g:6379"
    bench --site "$SITE_NAME" set-config allow_cors "*"
    bench --site "$SITE_NAME" set-config frontend_url "$FRONTEND_URL"
    bench --site "$SITE_NAME" set-config jwt_expiry 86400
    bench --site "$SITE_NAME" set-config jwt_secret "ac9a52e8d71280e60d08b07c6f2b6a1d9f8bb0ff9d84155676cfb0f8938ad76b"
    bench --site "$SITE_NAME" set-config use_tls 1

    # Email settings
    bench --site "$SITE_NAME" set-config auto_email_id "yourgmail@gmail.com"
    bench --site "$SITE_NAME" set-config mail_login "yourgmail@gmail.com"
    bench --site "$SITE_NAME" set-config mail_password "yourapppassword"
    bench --site "$SITE_NAME" set-config smtp_port "587"
    bench --site "$SITE_NAME" set-config smtp_server "smtp.gmail.com"

    # Gemini API
    bench --site "$SITE_NAME" set-config gemini_api_key "AIzaSyDfu_ZHRaX5NMxlysHyMM8dlMNeVeqkqtE"

    # Run migrations to apply settings
    bench --site "$SITE_NAME" migrate

    # Import fixtures
    echo "📥 Importing fixtures..."
    bench --site "$SITE_NAME" import-fixtures

    echo "✅ Site setup completed!"
else
    echo "✅ Site $SITE_NAME already exists, skipping creation."
    echo "📄 Current site config:"
    cat "$SITE_PATH/site_config.json"
fi

# Set default site for bench commands
bench use "$SITE_NAME"

# Start Frappe (development mode)
echo "🚀 Starting Frappe server on port ${PORT:-8000}..."
bench serve --port "${PORT:-8000}"
