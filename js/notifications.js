/**
 * Notifications Manager
 * Handles user notifications and alerts
 */

/**
 * Show notification to user with enhanced UI
 */
export function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());

    // Icons for different notification types
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Create notification element with enhanced structure
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-content">${message}</span>
        <button class="notification-close" aria-label="Cerrar notificación">&times;</button>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Close button handler
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        removeNotification(notification);
    });

    // Auto remove after duration
    const timeoutId = setTimeout(() => {
        removeNotification(notification);
    }, duration);

    // Add slide in animation
    requestAnimationFrame(() => {
        notification.style.animation = 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });

    // Store timeout ID on element for cleanup
    notification._timeoutId = timeoutId;
}

/**
 * Remove notification with animation
 */
function removeNotification(notification) {
    if (notification._timeoutId) {
        clearTimeout(notification._timeoutId);
    }
    
    notification.style.animation = 'slideOutRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
}

// Add animation styles
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Confirm dialog
 */
export function showConfirm(message, callback) {
    const confirmed = confirm(message);
    if (callback) {
        callback(confirmed);
    }
    return confirmed;
}

