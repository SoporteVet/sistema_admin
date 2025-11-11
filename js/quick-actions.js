/**
 * Quick Actions System
 * Fast actions and shortcuts for common tasks
 */

class QuickActions {
    constructor() {
        this.init();
    }

    init() {
        // Add quick action button to header
        this.createQuickActionButton();
    }

    createQuickActionButton() {
        const header = document.querySelector('.header');
        if (!header) return;

        const quickActionBtn = document.createElement('button');
        quickActionBtn.className = 'quick-action-btn';
        quickActionBtn.innerHTML = '⚡ Acciones Rápidas';
        quickActionBtn.setAttribute('aria-label', 'Acciones rápidas');
        quickActionBtn.onclick = () => this.showQuickActionsMenu();

        const userMenu = header.querySelector('.user-menu');
        if (userMenu) {
            userMenu.insertBefore(quickActionBtn, userMenu.firstChild);
        }
    }

    showQuickActionsMenu() {
        const menu = document.getElementById('quick-actions-menu');
        if (menu) {
            menu.classList.toggle('active');
        } else {
            this.createQuickActionsMenu();
        }
    }

    createQuickActionsMenu() {
        const menu = document.createElement('div');
        menu.id = 'quick-actions-menu';
        menu.className = 'quick-actions-menu';
        
        menu.innerHTML = `
            <div class="quick-actions-header">
                <h4>⚡ Acciones Rápidas</h4>
                <button class="quick-actions-close" onclick="this.closest('.quick-actions-menu').classList.remove('active')">×</button>
            </div>
            <div class="quick-actions-list">
                <div class="quick-action-item" onclick="window.app?.navigateTo('dashboard'); document.getElementById('quick-actions-menu').classList.remove('active');">
                    <span class="quick-action-icon">📊</span>
                    <div>
                        <div class="quick-action-title">Dashboard</div>
                        <div class="quick-action-shortcut">Ctrl+D</div>
                    </div>
                </div>
                <div class="quick-action-item" onclick="document.getElementById('btn-new-solicitud')?.click(); document.getElementById('quick-actions-menu').classList.remove('active');">
                    <span class="quick-action-icon">📝</span>
                    <div>
                        <div class="quick-action-title">Nueva Solicitud</div>
                        <div class="quick-action-shortcut">Ctrl+N</div>
                    </div>
                </div>
                <div class="quick-action-item" onclick="document.getElementById('btn-new-comunicado')?.click(); document.getElementById('quick-actions-menu').classList.remove('active');">
                    <span class="quick-action-icon">📢</span>
                    <div>
                        <div class="quick-action-title">Nuevo Comunicado</div>
                        <div class="quick-action-shortcut">Ctrl+Shift+N</div>
                    </div>
                </div>
                ${window.app?.isAdmin?.() ? `
                <div class="quick-action-item" onclick="window.app?.navigateTo('admin-panel'); document.getElementById('quick-actions-menu').classList.remove('active');">
                    <span class="quick-action-icon">⚙️</span>
                    <div>
                        <div class="quick-action-title">Panel Admin</div>
                        <div class="quick-action-shortcut">Ctrl+A</div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(menu);

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !e.target.closest('.quick-action-btn')) {
                menu.classList.remove('active');
            }
        });
    }
}

export default QuickActions;



