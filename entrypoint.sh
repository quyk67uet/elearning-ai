#!/bin/bash

set -e

echo "=== Frappe Deployment Debug ==="

# Tạo logs directory và site structure trước
echo "=== Creating Site Structure ==="
mkdir -p /app/elearning-bench/sites/learn.local/{logs,private/files,public/files}
touch /app/elearning-bench/sites/learn.local/logs/{frappe.log,database.log,error.log}
chmod -R 755 /app/elearning-bench/sites/learn.local
echo "✓ Site structure created"

# Setup CA Certificate
echo "=== Setting up CA Certificate ==="
if [ -n "$CA_PEM_CONTENT" ]; then
    echo "$CA_PEM_CONTENT" > /app/elearning-bench/sites/learn.local/ca.pem
    chmod 644 /app/elearning-bench/sites/learn.local/ca.pem
    echo "✓ CA certificate created"
    
    # Verify certificate format
    if openssl x509 -in /app/elearning-bench/sites/learn.local/ca.pem -text -noout > /dev/null 2>&1; then
        echo "✓ CA certificate is valid X.509 format"
    else
        echo "✗ CA certificate format invalid"
        echo "First few lines of CA cert:"
        head -3 /app/elearning-bench/sites/learn.local/ca.pem
    fi
else
    echo "✗ CA_PEM_CONTENT environment variable not set"
    exit 1
fi

# Create site config
echo "=== Creating Site Configuration ==="
cat > /app/elearning-bench/sites/learn.local/site_config.json << 'EOF'
{
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
    "developer_mode": 1,
    "log_level": "DEBUG",
    "logging": 1
}
EOF
echo "✓ Site config created"

# Set working directory
cd /app/elearning-bench

# Set default site
echo "=== Setting Default Site ==="
bench use learn.local
echo "✓ Default site set to learn.local"

# Test database connection với bench
echo "=== Testing Database Connection with Bench ==="
echo "Attempting to connect to database..."

# Method 1: Test với bench migrate (dry run)
echo "Testing with bench migrate --dry-run..."
if bench --site learn.local migrate --dry-run 2>&1; then
    echo "✓ Database connection successful via bench"
else
    echo "✗ Database connection failed via bench"
    echo "Trying alternative connection test..."
fi

# Method 2: Test với Frappe console
echo "Testing database connection with Frappe console..."
bench --site learn.local console << 'PYTHON_EOF'
import frappe
import sys

try:
    print("Initializing Frappe...")
    frappe.init(site='learn.local', sites_path='/app/elearning-bench/sites')
    
    print("Connecting to database...")
    frappe.connect()
    
    print("✓ Frappe initialized and connected successfully!")
    
    # Test basic query
    print("Testing database query...")
    result = frappe.db.sql("SELECT VERSION()")
    print(f"✓ Database version: {result[0][0]}")
    
    # Test if tables exist
    print("Checking if tabSingles exists...")
    tables = frappe.db.sql("SHOW TABLES LIKE 'tabSingles'")
    if tables:
        print("✓ Frappe tables exist - site already initialized")
    else:
        print("! Frappe tables don't exist - need to run install")
    
    print("✓ All database tests passed!")
    
except Exception as e:
    print(f"✗ Database connection/test failed: {e}")
    print(f"Error type: {type(e).__name__}")
    
    # Print more detailed error info
    import traceback
    traceback.print_exc()
    
    # Try to get more specific error info
    if hasattr(e, 'args') and e.args:
        print(f"Error details: {e.args}")
    
    sys.exit(1)
finally:
    try:
        frappe.destroy()
        print("✓ Frappe cleanup completed")
    except:
        pass
PYTHON_EOF

echo "=== Database Test Results ==="
if [ $? -eq 0 ]; then
    echo "✓ All database tests passed!"
    echo "=== Starting Production Server ==="
    
    # Start production server
    exec bench serve --port $PORT
else
    echo "✗ Database tests failed. Check the errors above."
    exit 1
fi

