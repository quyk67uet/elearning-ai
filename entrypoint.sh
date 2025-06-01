#!/bin/bash

set -e

echo "=== Frappe Deployment Debug ==="

# Tạo logs directory trước để tránh lỗi logging
mkdir -p /app/elearning-bench/sites/learn.local/logs
touch /app/elearning-bench/sites/learn.local/logs/{frappe.log,database.log,error.log}

# 1. TEST DATABASE CONNECTION TRỰC TIẾP
echo "=== Testing Database Connection ==="

DB_HOST="frappe-mysql-minhquyle2302-0634.g.aivencloud.com"
DB_PORT="23211"
DB_NAME="defaultdb"
DB_USER="avnadmin"
DB_PASS="AVNS_tQP-rD9ZqxsBUkELuvy"

# Test với Python MySQL connector
echo "Testing with Python MySQL connector..."
python3 << EOF
import sys
try:
    import pymysql
    print("✓ PyMySQL available")
    
    # Test connection without SSL first
    print("Testing connection without SSL...")
    conn = pymysql.connect(
        host='$DB_HOST',
        port=$DB_PORT,
        user='$DB_USER',
        password='$DB_PASS',
        database='$DB_NAME',
        connect_timeout=10
    )
    print("✓ Basic connection successful!")
    
    # Test query
    cursor = conn.cursor()
    cursor.execute("SELECT VERSION()")
    version = cursor.fetchone()
    print(f"✓ Database version: {version[0]}")
    
    cursor.close()
    conn.close()
    
except ImportError:
    print("✗ PyMySQL not available")
    
except Exception as e:
    print(f"✗ Database connection failed: {e}")
    print(f"Error type: {type(e).__name__}")
    sys.exit(1)
EOF

echo "✓ Database connection test passed"

# 2. SETUP CA CERTIFICATE
echo "=== Setting up CA Certificate ==="
if [ -n "$CA_PEM_CONTENT" ]; then
    echo "$CA_PEM_CONTENT" > /app/elearning-bench/sites/learn.local/ca.pem
    echo "✓ CA certificate created"
    
    # Verify certificate
    if openssl x509 -in /app/elearning-bench/sites/learn.local/ca.pem -text -noout > /dev/null 2>&1; then
        echo "✓ CA certificate is valid"
    else
        echo "✗ CA certificate is invalid"
    fi
else
    echo "✗ CA_PEM_CONTENT not provided"
fi

# 3. TEST DATABASE WITH SSL
echo "=== Testing Database with SSL ==="
python3 << EOF
import pymysql
import ssl

try:
    # Test SSL connection
    print("Testing SSL connection...")
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_REQUIRED
    ssl_context.load_verify_locations('/app/elearning-bench/sites/learn.local/ca.pem')
    
    conn = pymysql.connect(
        host='$DB_HOST',
        port=$DB_PORT,
        user='$DB_USER',
        password='$DB_PASS',
        database='$DB_NAME',
        ssl=ssl_context,
        connect_timeout=10
    )
    
    print("✓ SSL connection successful!")
    conn.close()
    
except Exception as e:
    print(f"✗ SSL connection failed: {e}")
    print("Trying with ssl_disabled...")
    
    try:
        conn = pymysql.connect(
            host='$DB_HOST',
            port=$DB_PORT,
            user='$DB_USER',
            password='$DB_PASS',
            database='$DB_NAME',
            ssl_disabled=True,
            connect_timeout=10
        )
        print("✓ Non-SSL connection works")
        conn.close()
    except Exception as e2:
        print(f"✗ Non-SSL also failed: {e2}")
EOF

# 4. CREATE SITE CONFIG
echo "=== Creating Site Configuration ==="
mkdir -p /app/elearning-bench/sites/learn.local

cat > /app/elearning-bench/sites/learn.local/site_config.json << EOF
{
    "db_host": "$DB_HOST",
    "db_port": $DB_PORT,
    "db_name": "$DB_NAME",
    "db_user": "$DB_USER",
    "db_password": "$DB_PASS",
    "db_type": "mariadb",
    "db_ssl_ca": "/app/elearning-bench/sites/learn.local/ca.pem",
    "redis_cache": "redis://red-d0194tqdbo4c73fvoe0g:6379",
    "redis_queue": "redis://red-d0194tqdbo4c73fvoe0g:6379",
    "redis_socketio": "redis://red-d0194tqdbo4c73fvoe0g:6379",
    "allow_cors": "*",
    "developer_mode": 1,
    "log_level": "DEBUG"
}
EOF

echo "✓ Site config created"

# 5. TEST FRAPPE DATABASE CONNECTION
echo "=== Testing Frappe Database Connection ==="
cd /app/elearning-bench

# Set default site
bench use learn.local

# Test Frappe database connection
bench --site learn.local console << 'EOF'
try:
    import frappe
    frappe.init(site='learn.local')
    frappe.connect()
    
    print("✓ Frappe database connection successful!")
    
    # Test query
    result = frappe.db.sql("SELECT VERSION()")
    print(f"✓ Database version via Frappe: {result[0][0]}")
    
    frappe.destroy()
    print("✓ Frappe database test completed")
    
except Exception as e:
    print(f"✗ Frappe database connection failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
EOF

echo "=== All Tests Passed! Starting Server ==="

exec bench serve --port $PORT