# 1. Chọn base image
FROM python:3.10-slim

# 2. Cài đặt các phụ thuộc hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    build-essential \
    libmysqlclient-dev \
    mariadb-client \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. Thiết lập thư mục làm việc
WORKDIR /app

# 4. Cài đặt Frappe Bench
RUN pip install --upgrade pip \
    && pip install frappe-bench

# 5. Khởi tạo elearning-bench
RUN bench init --skip-redis-config elearning-bench --frappe-branch version-15 \
    && cd elearning-bench

# 6. Copy app elearning từ repository
WORKDIR /app/elearning-bench
COPY . /app/elearning-bench/apps/elearning

# 7. Cài đặt app elearning và các phụ thuộc
RUN pip install -r /app/elearning-bench/apps/elearning/requirements.txt
RUN bench --site learn.local install-app elearning

# 8. Tạo site learn.local và cấu hình kết nối Aiven MySQL & Redis
RUN bench new-site learn.local --db-type mysql --force && \
    echo '{ \
        "db_host": "frappe-mysql-minhquyle2302-0634.g.aivencloud.com", \
        "db_port": 23211, \
        "db_name": "defaultdb", \ 
        "db_user": "avnadmin", \
        "db_password": "AVNS_tQP-rD9ZqxsBUkELuvy", \
        "db_type": "mysql", \
        "db_ssl_ca": "/app/elearning-bench/sites/learn.local/ca.pem", \
        "redis_cache": "redis://red-d0194tqdbo4c73fvoe0g:6379", \
        "redis_queue": "redis://red-d0194tqdbo4c73fvoe0g:6379", \
        "redis_socketio": "redis://red-d0194tqdbo4c73fvoe0g:6379", \
        "allow_cors": "*", \
        "auto_email_id": "yourgmail@gmail.com", \
        "cors_header_whitelist": [ \
            "X-Frappe-CSRF-Token", \
            "X-Requested-With", \
            "Authorization", \
            "Accept", \
            "Content-Type" \
        ], \
        "email_account": "yourgmail@gmail.com", \
        "encryption_key": "_H6tXHWcA_3EuZr-zOXHoBJi0FDL2HG4zy0eguOgIBk=", \
        "frontend_url": "'"$FRONTEND_URL"'", \
        "jwt_expiry": 86400, \
        "jwt_secret": "ac9a52e8d71280e60d08b07c6f2b6a1d9f8bb0ff9d84155676cfb0f8938ad76b", \
        "mail_login": "yourgmail@gmail.com", \
        "mail_password": "yourapppassword", \
        "smtp_port": "587", \
        "smtp_server": "smtp.gmail.com", \
        "gemini_api_key": "AIzaSyDfu_ZHRaX5NMxlysHyMM8dlMNeVeqkqtE", \
        "use_tls": 1 \
    }' > /app/elearning-bench/sites/learn.local/site_config.json

# 9. Copy entrypoint.sh vào container
COPY entrypoint.sh /app/elearning-bench/entrypoint.sh
RUN chmod +x /app/elearning-bench/entrypoint.sh

# 11. Sử dụng entrypoint.sh để khởi động
CMD ["/app/elearning-bench/entrypoint.sh"]