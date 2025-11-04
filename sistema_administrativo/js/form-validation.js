/**
 * Form Validation Manager
 * Provides real-time validation feedback
 */

class FormValidation {
    constructor() {
        this.rules = {
            email: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Por favor ingrese un email válido'
            },
            required: {
                validate: (value) => value && value.trim().length > 0,
                message: 'Este campo es requerido'
            },
            minLength: (min) => ({
                validate: (value) => value && value.length >= min,
                message: `Debe tener al menos ${min} caracteres`
            }),
            dateRange: {
                validate: (startValue, endValue) => {
                    if (!startValue || !endValue) return true;
                    return new Date(endValue) >= new Date(startValue);
                },
                message: 'La fecha fin debe ser posterior a la fecha inicio'
            }
        };
    }

    /**
     * Setup real-time validation for form
     */
    setupFormValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Validate on blur
            input.addEventListener('blur', () => this.validateField(input));
            
            // Clear validation on input (for better UX)
            input.addEventListener('input', () => {
                if (this.hasValidationError(input)) {
                    this.clearValidation(input);
                }
            });
        });
    }

    /**
     * Validate a single field
     */
    validateField(field) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return true;

        let isValid = true;
        let errorMessage = '';

        // Check required
        if (field.hasAttribute('required') || field.getAttribute('aria-required') === 'true') {
            const value = field.type === 'checkbox' ? field.checked : field.value;
            if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                isValid = false;
                errorMessage = this.rules.required.message;
            }
        }

        // Check email pattern
        if (field.type === 'email' && field.value) {
            if (!this.rules.email.pattern.test(field.value)) {
                isValid = false;
                errorMessage = this.rules.email.message;
            }
        }

        // Check minlength
        const minLength = field.getAttribute('minlength');
        if (minLength && field.value) {
            if (field.value.length < parseInt(minLength)) {
                isValid = false;
                errorMessage = `Debe tener al menos ${minLength} caracteres`;
            }
        }

        // Update UI
        this.updateFieldValidation(formGroup, isValid, errorMessage);
        
        return isValid;
    }

    /**
     * Validate date range (start and end dates)
     */
    validateDateRange(startField, endField) {
        const startGroup = startField.closest('.form-group');
        const endGroup = endField.closest('.form-group');
        
        if (!startField.value || !endField.value) {
            return true;
        }

        const isValid = this.rules.dateRange.validate(startField.value, endField.value);
        
        if (!isValid) {
            this.updateFieldValidation(endGroup, false, this.rules.dateRange.message);
            return false;
        } else {
            this.clearValidation(endField);
            return true;
        }
    }

    /**
     * Update field validation UI
     */
    updateFieldValidation(formGroup, isValid, errorMessage = '') {
        // Remove existing validation messages
        const existingMessage = formGroup.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Remove validation classes
        formGroup.classList.remove('valid', 'invalid');

        if (isValid) {
            formGroup.classList.add('valid');
        } else {
            formGroup.classList.add('invalid');
            
            // Add error message
            const message = document.createElement('div');
            message.className = 'validation-message error';
            message.innerHTML = `
                <span class="validation-icon">✕</span>
                <span>${errorMessage}</span>
            `;
            formGroup.appendChild(message);
        }
    }

    /**
     * Clear validation from field
     */
    clearValidation(field) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;

        formGroup.classList.remove('valid', 'invalid');
        const message = formGroup.querySelector('.validation-message');
        if (message) {
            message.remove();
        }
    }

    /**
     * Check if field has validation error
     */
    hasValidationError(field) {
        const formGroup = field.closest('.form-group');
        return formGroup && formGroup.classList.contains('invalid');
    }

    /**
     * Validate entire form
     */
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Setup date range validation
     */
    setupDateRangeValidation(startFieldId, endFieldId) {
        const startField = document.getElementById(startFieldId);
        const endField = document.getElementById(endFieldId);
        
        if (!startField || !endField) return;

        const validateRange = () => {
            this.validateDateRange(startField, endField);
        };

        startField.addEventListener('change', validateRange);
        endField.addEventListener('change', validateRange);
    }
}

// Export singleton instance
const formValidation = new FormValidation();

export default formValidation;

