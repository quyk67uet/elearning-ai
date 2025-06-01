import frappe
from frappe.model.document import Document

class Question(Document):
    def validate(self):
        """Validate question data before saving"""
        if not self.content:
            frappe.throw("Question content is required")
        
        # Validate question type
        if self.question_type == "Multiple Choice":
            # Ensure there are options for multiple choice questions
            if not self.options or len(self.options) < 2:
                frappe.throw("Multiple choice questions must have at least 2 options")
            
            # Ensure at least one option is marked as correct
            has_correct_option = False
            for option in self.options:
                if option.is_correct:
                    has_correct_option = True
                    break
                    
            if not has_correct_option:
                frappe.throw("At least one option must be marked as correct")
    
    def get_options(self, hide_correct=True):
        """
        Get options for this question
        
        Args:
            hide_correct (bool): Whether to hide which option is correct
            
        Returns:
            list: List of options with their details
        """
        if not self.options:
            return []
            
        result = []
        for option in self.options:
            option_data = {
                "name": option.name,
                "label": option.label,
                "content": option.content
            }
            
            # Include correct answer info only if not hiding
            if not hide_correct:
                option_data["is_correct"] = option.is_correct
                
            result.append(option_data)
            
        return result 