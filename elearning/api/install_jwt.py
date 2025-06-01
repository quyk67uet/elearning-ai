import os
import sys
import json
import secrets
import subprocess
from pathlib import Path

def install_jwt():
    """Install PyJWT package for the Frappe environment"""
    try:
        print("Installing PyJWT package...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "PyJWT"])
        print("PyJWT installed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing PyJWT: {e}")
        return False

def add_jwt_config(site_name, jwt_secret=None, expiry=86400):
    """Add JWT configuration to site_config.json"""
    # Generate secure random key if not provided
    if not jwt_secret:
        jwt_secret = secrets.token_hex(32)
        
    # Get bench path
    bench_path = os.getcwd()
    if not bench_path.endswith('elearning-bench'):
        print("Please run this script from the bench directory (elearning-bench)")
        return False
        
    # Site config path
    site_config_path = Path(bench_path) / "sites" / site_name / "site_config.json"
    
    if not site_config_path.exists():
        print(f"Site config not found: {site_config_path}")
        return False
        
    try:
        # Read current config
        with open(site_config_path, 'r') as f:
            config = json.load(f)
            
        # Add JWT config if not already present
        if "jwt_secret" not in config:
            config["jwt_secret"] = jwt_secret
            print(f"Added JWT secret: {jwt_secret[:5]}...{jwt_secret[-5:]} (truncated for security)")
        else:
            print("JWT secret already exists in config")
            
        # Add JWT expiry if not already present
        if "jwt_expiry" not in config:
            config["jwt_expiry"] = expiry
            print(f"Added JWT expiry: {expiry} seconds")
        else:
            print("JWT expiry already exists in config")
            
        # Write updated config
        with open(site_config_path, 'w') as f:
            json.dump(config, f, indent=1)
            
        print(f"Updated JWT configuration in {site_config_path}")
        return True
    
    except Exception as e:
        print(f"Error updating site_config.json: {e}")
        return False

def standalone_main():
    """Standalone version that doesn't require Frappe environment"""
    print("Running in standalone mode (without Frappe dependencies)")
    
    # Install PyJWT
    if not install_jwt():
        print("Failed to install PyJWT. Please install it manually: pip install PyJWT")
        return
    
    # Get bench path
    bench_path = os.getcwd()
    if not bench_path.endswith('elearning-bench'):
        print("Please run this script from the bench directory (elearning-bench)")
        return
        
    # Find sites
    sites_dir = os.path.join(bench_path, "sites")
    if not os.path.exists(sites_dir):
        print(f"Sites directory not found: {sites_dir}")
        return
        
    # List all sites (directories in the sites folder except assets)
    sites = [d for d in os.listdir(sites_dir) 
             if os.path.isdir(os.path.join(sites_dir, d)) 
             and d != "assets" 
             and not d.startswith(".")]
             
    if not sites:
        print("No sites found in bench.")
        return
    
    print("Available sites:")
    for i, site in enumerate(sites, 1):
        print(f"{i}. {site}")
        
    choice = input("Select site number to configure (or press Enter for all): ")
    
    # Generate a single JWT secret for all sites for consistency
    jwt_secret = secrets.token_hex(32)
    
    if choice.strip():
        try:
            site_index = int(choice) - 1
            if 0 <= site_index < len(sites):
                selected_sites = [sites[site_index]]
            else:
                print("Invalid selection.")
                return
        except ValueError:
            print("Invalid input. Please enter a number.")
            return
    else:
        selected_sites = sites
    
    # Add JWT config to selected sites
    for site in selected_sites:
        print(f"\nConfiguring JWT for site: {site}")
        add_jwt_config(site, jwt_secret)
    
    print("\nJWT configuration complete!")
    print("To use JWT authentication, make sure to restart the Frappe server.")
    print("Run 'bench restart' to apply changes.")

def main():
    """Main function to run installation and configuration"""
    # Check if running in Frappe bench environment
    try:
        import frappe
        print("Frappe environment detected.")
    except ImportError:
        print("Frappe environment not detected, running in standalone mode.")
        standalone_main()
        return
    
    # Running in Frappe environment
    # Install PyJWT
    if not install_jwt():
        print("Failed to install PyJWT. Please install it manually: pip install PyJWT")
        return
    
    # Get site name
    sites = [d for d in os.listdir("sites") if os.path.isdir(os.path.join("sites", d)) and d != "assets"]
    if not sites:
        print("No sites found in bench.")
        return
    
    print("Available sites:")
    for i, site in enumerate(sites, 1):
        print(f"{i}. {site}")
        
    choice = input("Select site number to configure (or press Enter for all): ")
    
    # Generate a single JWT secret for all sites for consistency
    jwt_secret = secrets.token_hex(32)
    
    if choice.strip():
        try:
            site_index = int(choice) - 1
            if 0 <= site_index < len(sites):
                selected_sites = [sites[site_index]]
            else:
                print("Invalid selection.")
                return
        except ValueError:
            print("Invalid input. Please enter a number.")
            return
    else:
        selected_sites = sites
    
    # Add JWT config to selected sites
    for site in selected_sites:
        print(f"\nConfiguring JWT for site: {site}")
        add_jwt_config(site, jwt_secret)
    
    print("\nJWT configuration complete!")
    print("To use JWT authentication, make sure to restart the Frappe server.")
    print("Run 'bench restart' to apply changes.")

if __name__ == "__main__":
    main() 