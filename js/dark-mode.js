/**
 * Dark Mode Toggle System
 * Modern dark theme implementation
 */

class DarkMode {
    constructor() {
        this.isDark = localStorage.getItem('darkMode') === 'true';
        this.init();
    }

    init() {
        if (this.isDark) {
            document.documentElement.classList.add('dark-mode');
        }
        this.createToggle();
    }

    createToggle() {
        const header = document.querySelector('.header');
        if (!header) return;

        const toggle = document.createElement('button');
        toggle.id = 'dark-mode-toggle';
        toggle.className = 'dark-mode-toggle';
        toggle.setAttribute('aria-label', 'Alternar tema oscuro');
        toggle.innerHTML = this.isDark ? '☀️' : '🌙';
        
        toggle.addEventListener('click', () => this.toggle());
        
        const userMenu = header.querySelector('.user-menu');
        if (userMenu) {
            userMenu.insertBefore(toggle, userMenu.firstChild);
        }
    }

    toggle() {
        this.isDark = !this.isDark;
        document.documentElement.classList.toggle('dark-mode', this.isDark);
        localStorage.setItem('darkMode', this.isDark);
        
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) {
            toggle.innerHTML = this.isDark ? '☀️' : '🌙';
        }
    }

    getCurrentTheme() {
        return this.isDark ? 'dark' : 'light';
    }
}

export default DarkMode;

