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
    git \
    curl \
    cron \
    && rm -rf /var/lib/apt/lists/*

# 5. Tạo user không phải root để chạy lệnh bench
RUN useradd -m -s /bin/bash frappe \
    && mkdir -p /app \
    && chown -R frappe:frappe /app

# 6. Chuyển sang user frappe
USER frappe

# 7. Thiết lập thư mục làm việc
WORKDIR /app

# 8. Cập nhật pip và cài đặt Frappe Bench
RUN pip install --upgrade pip \
    && pip install frappe-bench

# 9. Cập nhật PATH để bao gồm thư mục bin của user
ENV PATH="/home/frappe/.local/bin:$PATH"

# 10. Khởi tạo elearning-bench với Frappe từ branch develop
RUN bench init --skip-redis-config-generation --no-backups elearning-bench \
    --frappe-path https://github.com/frappe/frappe.git --frappe-branch develop
