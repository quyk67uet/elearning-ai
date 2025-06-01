# 1. Chọn base image
FROM python:3.10

# 2. Cài đặt Node.js (sử dụng NodeSource repository)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# 3. Cài đặt Yarn
RUN npm install -g yarn

# 4. Cài đặt các phụ thuộc hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    build-essential \
    libmariadb-dev-compat \
    libmariadb-dev \
    mariadb-client \
    git \
    curl \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

# 5. Tạo user không phải root để chạy lệnh bench
RUN useradd -m -s /bin/bash frappe \
    && mkdir -p /app \
    && chown -R frappe:frappe /app

# 6. Chuyển sang user frappe
USER frappe

# 7. Thiết lập thư mục làm việc
WORKDIR /app

# 8. Cài đặt Frappe Bench và cập nhật PATH
RUN pip install --user --upgrade pip \
    && pip install --user --no-warn-script-location frappe-bench

# Cập nhật PATH để bao gồm thư mục bin của user
ENV PATH="/home/frappe/.local/bin:$PATH"

# 9. Khởi tạo elearning-bench
RUN bench init --skip-redis-config-generation elearning-bench --frappe-branch version-15

# 10. Chuyển đến thư mục elearning-bench
WORKDIR /app/elearning-bench

# 11. Copy app elearning từ repository
COPY --chown=frappe:frappe . /app/elearning-bench/apps/elearning

# 12. Cài đặt dependencies của app elearning
RUN pip install --user -r /app/elearning-bench/apps/elearning/requirements.txt

# 13. Tạo site learn.local
RUN bench new-site learn.local --db-type mysql --force

# 14. Cài đặt app elearning
RUN bench --site learn.local install-app elearning

# 15. Cấu hình site với thông tin database và redis
RUN echo '{ \
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

# 16. Import fixtures vào database
RUN bench --site learn.local import-fixtures

# 17. Copy entrypoint.sh vào container
COPY --chown=frappe:frappe entrypoint.sh /app/elearning-bench/entrypoint.sh
RUN chmod +x /app/elearning-bench/entrypoint.sh

# 18. Sử dụng entrypoint.sh để khởi động
CMD ["/app/elearning-bench/entrypoint.sh"]