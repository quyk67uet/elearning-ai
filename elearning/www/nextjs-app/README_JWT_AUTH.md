# JWT Authentication for Frappe and Next.js Integration

This document explains how to set up and use JWT (JSON Web Token) authentication between your Frappe backend and Next.js frontend.

## Overview

This implementation:
1. Creates a custom login endpoint in Frappe that issues JWT tokens
2. Adds middleware to verify JWT tokens in incoming requests to Frappe
3. Updates NextAuth to use JWT tokens for authentication
4. Modifies the frontend API client to include JWT tokens in requests

## Installation

### 1. Install PyJWT in your Frappe environment

You need to install the PyJWT package in your Frappe Python environment. You can use the provided installation script:

```bash
cd ~/elearning-bench
bench console

# Inside the bench console
import sys
sys.path.insert(0, './apps/elearning/elearning/api')
import install_jwt
install_jwt.main()
```

Alternatively, you can install PyJWT manually:

```bash
cd ~/elearning-bench
bench pip install PyJWT
```

### 2. Configure JWT Secret

The installation script will automatically add a JWT secret to your site_config.json file. If you want to do this manually:

```bash
cd ~/elearning-bench
bench --site your-site-name set-config jwt_secret "your-very-secure-random-secret-key"
bench --site your-site-name set-config jwt_expiry 86400  # Token expiry in seconds (24 hours)
```

### 3. Restart Frappe Server

After installation and configuration, restart your Frappe server:

```bash
bench restart
```
