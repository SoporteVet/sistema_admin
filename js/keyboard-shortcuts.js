/**
 * Keyboard Shortcuts System
 * Quick navigation and actions via keyboard
 */

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.registerShortcuts();
    }

    registerShortcuts() {
        // Dashboard - Ctrl/Cmd + D
        this.register('d', 'Dashboard', () => {
            if (window.app) window.app.navigateTo('dashboard');
        }, { ctrlKey: true, metaKey: true });

        // Comunicados - Ctrl/Cmd + C
        this.register('c', 'Comunicados', () => {
            if (window.app) window.app.navigateTo('comunicados');
        }, { ctrlKey: true, metaKey: true });

        // Solicitudes - Ctrl/Cmd + S
        this.register('s', 'Solicitudes', () => {
            if (window.app) window.app.navigateTo('solicitudes');
        }, { ctrlKey: true, metaKey: true });

        // Admin Panel - Ctrl/Cmd + A
        this.register('a', 'Panel Admin', () => {
            if (window.app && window.app.isAdmin?.()) window.app.navigateTo('admin-panel');
        }, { ctrlKey: true, metaKey: true });

        // Nueva Solicitud - Ctrl/Cmd + N
        this.register('n', 'Nueva Solicitud', () => {
            const btn = document.getElementById('btn-new-solicitud');
            if (btn && btn.offsetParent !== null) btn.click();
        }, { ctrlKey: true, metaKey: true });

        // Nuevo Comunicado - Ctrl/Cmd + Shift + N
        this.register('N', 'Nuevo Comunicado', () => {
            const btn = document.getElementById('btn-new-comunicado');
            if (btn && btn.offsetParent !== null) btn.click();
        }, { ctrlKey: true, metaKey: true, shiftKey: true });

        // Cerrar Modal - ESC
        this.register('Escape', 'Cerrar Modal', () => {
            const modals = document.querySelectorAll('.modal[style*="flex"]');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        });

        // Toggle Sidebar (Mobile) - Ctrl/Cmd + B
        this.register('b', 'Toggle Sidebar', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) sidebar.classList.toggle('active');
            }
        }, { ctrlKey: true, metaKey: true });

        // Show Shortcuts - Ctrl/Cmd + ?
        this.register('?', 'Mostrar Atajos', () => {
            this.showShortcutsModal();
        }, { ctrlKey: true, metaKey: true });
    }

    showShortcutsModal() {
        const modal = document.getElementById('keyboard-shortcuts-modal');
        const list = document.getElementById('shortcuts-list');
        
        if (!modal || !list) return;

        const shortcuts = this.getHelp();
        list.innerHTML = shortcuts.map(s => `
            <div class="shortcut-item">
                <span class="shortcut-description">${s.description}</span>
                <div class="shortcut-keys">
                    ${s.shortcut.split(' + ').map(key => 
                        `<span class="shortcut-key">${key}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');

        modal.classList.add('active');
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    register(key, description, callback, modifiers = {}) {
        this.shortcuts.set(key.toLowerCase(), {
            key,
            description,
            callback,
            modifiers
        });
    }

    handleKeyPress(e) {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT' ||
            e.target.isContentEditable) {
            return;
        }

        const key = e.key;
        const shortcut = this.shortcuts.get(key.toLowerCase());

        if (!shortcut) return;

        const { modifiers, callback } = shortcut;
        
        // Check modifiers
        if (modifiers.ctrlKey && !(e.ctrlKey || e.metaKey)) return;
        if (modifiers.shiftKey && !e.shiftKey) return;
        if (modifiers.altKey && !e.altKey) return;
        
        if (modifiers.ctrlKey || modifiers.metaKey) {
            e.preventDefault();
        }

        callback();
    }

    getHelp() {
        return Array.from(this.shortcuts.values()).map(s => ({
            key: s.key,
            description: s.description,
            shortcut: this.formatShortcut(s.key, s.modifiers)
        }));
    }
    
    formatShortcut(key, modifiers = {}) {
        const parts = [];
        if (modifiers.ctrlKey || modifiers.metaKey) parts.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl');
        if (modifiers.shiftKey) parts.push('Shift');
        if (modifiers.altKey) parts.push('Alt');
        parts.push(key.toUpperCase());
        return parts.join(' + ');
    }
}

// Export singleton
const keyboardShortcuts = new KeyboardShortcuts();
export default keyboardShortcuts;

