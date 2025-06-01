import frappe
from frappe.core.doctype.user.user import User

class CustomUser(User):
    def after_insert(self):
        # Call the original after_insert method first
        super(CustomUser, self).after_insert()
        
        # Check if this is a website user
        if "Website User" in [d.role for d in self.get("roles", [])]:
            # Add Authenticated role
            self.append("roles", {"role": "Authenticated"})
            self.save(ignore_permissions=True)
            #frappe.db.commit()