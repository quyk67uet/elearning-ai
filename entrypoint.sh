#!/bin/bash

mkdir -p /app/elearning-bench/sites/learn.local/logs

# Tạo file ca.pem từ environment variable
if [ -n "$CA_PEM_CONTENT" ]; then
    echo "$CA_PEM_CONTENT" > /app/elearning-bench/sites/learn.local/ca.pem
    echo "CA certificate created successfully"
else
    echo "Warning: CA_PEM_CONTENT environment variable not set"
fi

# Kiểm tra xem site đã tồn tại chưa
if [ ! -d "/app/elearning-bench/sites/learn.local" ] || [ ! -f "/app/elearning-bench/sites/learn.local/site_config.json" ]; then
    echo "Creating new site learn.local..."

    # Cấu hình site trước khi tạo
    echo "Creating site_config.json..."
    echo '{
        "db_host": "frappe-mysql-minhquyle2302-0634.g.aivencloud.com",
        "db_port": 23211,
        "db_name": "defaultdb",
        "db_user": "avnadmin",
        "db_password": "AVNS_tQP-rD9ZqxsBUkELuvy",
        "db_type": "mariadb",
        "db_ssl_ca": "/app/elearning-bench/sites/learn.local/ca.pem",
        "redis_cache": "redis://red-d0194tqdbo4c73fvoe0g:6379",
        "redis_queue": "redis://red-d0194tqdbo4c73fvoe0g:6379",
        "redis_socketio": "redis://red-d0194tqdbo4c73fvoe0g:6379",
        "allow_cors": "*",
        "auto_email_id": "yourgmail@gmail.com",
        "cors_header_whitelist": [
            "X-Frappe-CSRF-Token",
            "X-Requested-With",
            "Authorization",
            "Accept",
            "Content-Type"
        ],
        "email_account": "yourgmail@gmail.com",
        "encryption_key": "_H6tXHWcA_3EuZr-zOXHoBJi0FDL2HG4zy0eguOgIBk=",
        "frontend_url": "'"$FRONTEND_URL"'",
        "jwt_expiry": 86400,
        "jwt_secret": "ac9a52e8d71280e60d08b07c6f2b6a1d9f8bb0ff9d84155676cfb0f8938ad76b",
        "mail_login": "yourgmail@gmail.com",
        "mail_password": "yourapppassword",
        "smtp_port": "587",
        "smtp_server": "smtp.gmail.com",
        "gemini_api_key": "AIzaSyDfu_ZHRaX5NMxlysHyMM8dlMNeVeqkqtE",
        "use_tls": 1
    }' > /app/elearning-bench/sites/learn.local/site_config.json

    # Tạo site với thông tin từ site_config.json
    bench new-site learn.local --force

    # Cài đặt app elearning
    echo "Installing elearning app..."
    bench --site learn.local install-app elearning

    # Import fixtures
    echo "Importing fixtures..."
    bench --site learn.local import-fixtures

    echo "Site setup completed!"
else
    echo "Site learn.local already exists, skipping setup..."
fi

# Set site mặc định
bench use learn.local

# Khởi động Frappe server
echo "Starting Frappe server..."
bench serve --port $PORT
