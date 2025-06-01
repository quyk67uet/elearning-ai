#!/bin/bash

# Tạo thư mục logs nếu chưa tồn tại
mkdir -p /app/elearning-bench/sites/learn.local/logs

# Tạo file ca.pem từ biến môi trường nếu có
if [ -n "$CA_PEM_CONTENT" ]; then
    echo "$CA_PEM_CONTENT" > /app/elearning-bench/sites/learn.local/ca.pem
    echo "CA certificate created successfully"
else
    echo "Warning: CA_PEM_CONTENT environment variable not set"
    # Tạo file ca.pem trống để tránh lỗi
    touch /app/elearning-bench/sites/learn.local/ca.pem
fi

# Test database connection
echo "Testing database connection..."
python3 -c "
import pymysql
import os
try:
    ssl_ca = '/app/elearning-bench/sites/learn.local/ca.pem' if os.path.exists('/app/elearning-bench/sites/learn.local/ca.pem') and os.path.getsize('/app/elearning-bench/sites/learn.local/ca.pem') > 0 else None
    conn = pymysql.connect(
        host='frappe-mysql-minhquyle2302-0634.g.aivencloud.com',
        port=23211,
        user='avnadmin',
        password='AVNS_tQP-rD9ZqxsBUkELuvy',
        database='defaultdb',
        ssl_ca=ssl_ca
    )
    print('✅ Database connection successful!')
    conn.close()
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    print('Continuing with setup...')
"

# Kiểm tra xem site đã tồn tại chưa
if [ ! -d "/app/elearning-bench/sites/learn.local" ] || [ ! -f "/app/elearning-bench/sites/learn.local/site_config.json" ]; then
    echo "Creating new site learn.local..."
    
    # Tạo site với thông tin kết nối đầy đủ
    bench new-site learn.local \
        --db-type mariadb \
        --db-name defaultdb \
        --db-user avnadmin \
        --db-password 'AVNS_tQP-rD9ZqxsBUkELuvy' \
        --db-host frappe-mysql-minhquyle2302-0634.g.aivencloud.com \
        --db-port 23211 \
        --force
    
    # Cấu hình site bằng cách tạo site_config.json với SSL
    echo "Creating site_config.json..."
    cat > /app/elearning-bench/sites/learn.local/site_config.json <<EOF
{
    "db_host": "frappe-mysql-minhquyle2302-0634.g.aivencloud.com",
    "db_port": 23211,
    "db_name": "defaultdb",
    "db_user": "avnadmin",
    "db_password": "AVNS_tQP-rD9ZqxsBUkELuvy",
    "db_type": "mariadb",
    "db_ssl_ca": "/app/elearning-bench/sites/learn.local/ca.pem",
    "db_ssl_cert": "",
    "db_ssl_key": "",
    "db_ssl_check_hostname": false,
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
    "frontend_url": "${FRONTEND_URL}",
    "jwt_expiry": 86400,
    "jwt_secret": "ac9a52e8d71280e60d08b07c6f2b6a1d9f8bb0ff9d84155676cfb0f8938ad76b",
    "mail_login": "yourgmail@gmail.com",
    "mail_password": "yourapppassword",
    "smtp_port": "587",
    "smtp_server": "smtp.gmail.com",
    "gemini_api_key": "AIzaSyDfu_ZHRaX5NMxlysHyMM8dlMNeVeqkqtE",
    "use_tls": 1
}
EOF
    
    # Cài đặt ứng dụng elearning
    echo "Installing elearning app..."
    bench --site learn.local install-app elearning
    
    # Import dữ liệu mẫu (fixtures)
    echo "Importing fixtures..."
    bench --site learn.local import-fixtures
    
    echo "Site setup completed!"
else
    echo "Site learn.local already exists, skipping setup..."
fi

# Sử dụng site mặc định
bench use learn.local

# Khởi động Frappe server
echo "Starting Frappe server..."
bench serve --port "$PORT"