#!/bin/bash

# Tạo file ca.pem từ environment variable
if [ -n "$CA_PEM_CONTENT" ]; then
    echo "$CA_PEM_CONTENT" > /app/elearning-bench/sites/learn.local/ca.pem
    echo "CA certificate created successfully"
else
    echo "Warning: CA_PEM_CONTENT environment variable not set"
fi

# Khởi động Frappe server
bench serve --port $PORT