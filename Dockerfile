# 1. Chọn base image
FROM python:3.10

# 2. Cài đặt các phụ thuộc hệ thống cần thiết
RUN apt-get update && apt-get install -y \
    build-essential \
    libmysqlclient-dev \
    mariadb-client \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 3. Tạo user không phải root để chạy lệnh bench
RUN useradd -m -s /bin/bash frappe \
    && mkdir -p /app \
    && chown -R frappe:frappe /app

# 4. Chuyển sang user frappe
USER frappe

# 5. Thiết lập thư mục làm việc
WORKDIR /app

# 6. Cài đặt Frappe Bench
RUN pip install --user --upgrade pip \
    && pip install --user frappe-bench

# 7. Khởi tạo elearning-bench
RUN /home/frappe/.local/bin/bench init --skip-redis-config elearning-bench --frappe-branch version-15 \
    && cd elearning-bench

# 8. Copy app elearning từ repository
WORKDIR /app/elearning-bench
COPY --chown=frappe:frappe . /app/elearning-bench/apps/elearning

# 9. Cài đặt app elearning và các phụ thuộc
RUN /home/frappe/.local/bin/pip install --user -r /app/elearning-bench/apps/elearning/requirements.txt
RUN /home/frappe/.local/bin/bench --site learn.local install-app elearning

# 10. Tạo site learn.local và cấu hình kết nối Aiven MySQL & Redis
RUN /home/frappe/.local/bin/bench new-site learn.local --db-type mysql --force \
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


# 11. Import fixtures vào database Aiven MySQL
RUN /home/frappe/.local/bin/bench --site learn.local import-fixtures

# 12. Copy entrypoint.sh vào container
COPY --chown=frappe:frappe entrypoint.sh /app/elearning-bench/entrypoint.sh
RUN chmod +x /app/elearning-bench/entrypoint.sh

ENV PATH="/home/frappe/.local/bin:$PATH"

# 12a. Sử dụng entrypoint.sh để khởi động
CMD ["/app/elearning-bench/entrypoint.sh"]