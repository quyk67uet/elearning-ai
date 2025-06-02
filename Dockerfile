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
    cron \
    pkg-config \
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

# 9. Khởi tạo elearning-bench (skip cron setup for container environment)
ARG FRAPPE_BRANCH=version-15
RUN bench init --skip-redis-config-generation --no-backups elearning-bench --frappe-branch ${FRAPPE_BRANCH}

# 10. Chuyển đến thư mục elearning-bench
WORKDIR /app/elearning-bench

# 11. Copy toàn bộ app Frappe 'elearning' vào thư mục apps của bench
COPY --chown=frappe:frappe ./elearning /app/elearning-bench/apps/elearning

# 12. Cài đặt dependencies của app elearning
RUN if [ -f /app/elearning-bench/apps/elearning/requirements.txt ]; then \
        pip install --user -r /app/elearning-bench/apps/elearning/requirements.txt; \
    fi

# 13. Tạo thư mục sites (sẽ được dùng bởi entrypoint)
RUN mkdir -p /app/elearning-bench/sites/${SITE_NAME_VAR:-learn.local}
RUN mkdir -p /app/elearning-bench/config

# 14. Copy entrypoint.sh vào container
COPY --chown=frappe:frappe entrypoint.sh /app/elearning-bench/entrypoint.sh
RUN chmod +x /app/elearning-bench/entrypoint.sh

# 15. Sử dụng entrypoint.sh để khởi động
CMD ["/app/elearning-bench/entrypoint.sh"]