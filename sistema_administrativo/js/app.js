/**
 * Main Application Controller
 * Orchestrates all modules and handles page navigation
 */

import auth from './auth.js';
import db from './database.js';
import formsManager from './forms.js';
import signatureManager from './signature.js';
import { showNotification } from './notifications.js';
import formValidation from './form-validation.js';
import DarkMode from './dark-mode.js';
import keyboardShortcuts from './keyboard-shortcuts.js';
import Charts from './charts.js';
import ExportSystem from './export.js';
import QuickActions from './quick-actions.js';
import Reminders from './reminders.js';
import solicitudesEnhancements from './solicitudes-enhancements.js';
import SolicitudesTimeline from './solicitudes-timeline.js';

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Wait for database to be ready
            await db.ensureInit();

            // Check authentication
            if (!auth.isAuthenticated()) {
                this.showLogin();
                return;
            }

            // Setup authenticated app
            this.showApp();
        } catch (error) {
            console.error('Error initializing app:', error);
            this.showLogin();
        }
    }

    /**
     * Show login screen
     */
    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        
        const loginForm = document.getElementById('login-form');
        
        // Remove existing listener to prevent duplicates
        const newForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newForm, loginForm);
        
        const freshLoginForm = document.getElementById('login-form');
        
        // Setup form validation
        formValidation.setupFormValidation('login-form');
        
        freshLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate form before submission
            if (!formValidation.validateForm('login-form')) {
                showNotification('Por favor complete todos los campos correctamente', 'error');
                return;
            }
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            const submitBtn = freshLoginForm.querySelector('button[type="submit"]');

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Iniciando sesión...';
            submitBtn.classList.add('btn-loading');

            try {
                const result = await auth.login(email, password);
                if (result && result.success) {
                    errorDiv.textContent = '';
                    await this.showApp();
                }
            } catch (error) {
                errorDiv.textContent = error.message || 'Error al iniciar sesión';
                showNotification(error.message || 'Error al iniciar sesión', 'error');
                console.error('Login error:', error);
            } finally {
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Iniciar Sesión';
                submitBtn.classList.remove('btn-loading');
            }
        });
    }

    /**
     * Show main application
     */
    async showApp() {
        // Wait a bit to ensure auth state is updated
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Double check authentication
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            console.error('Not authenticated after login - missing token or user');
            this.showLogin();
            return;
        }

        if (!auth.isAuthenticated()) {
            console.error('Not authenticated after login - token invalid');
            // Clear invalid tokens
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            this.showLogin();
            return;
        }

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        this.setupApp();
        this.loadCurrentUser();
        this.setupEventListeners();
        await this.loadDashboard();
        
        // Navigate to dashboard
        this.navigateTo('dashboard');
    }

    /**
     * Setup authenticated application
     */
    setupApp() {
        // Show/hide admin link based on role
        const adminLink = document.getElementById('admin-link');
        if (auth.isAdmin()) {
            adminLink.style.display = 'block';
        } else {
            adminLink.style.display = 'none';
        }
        
        // Initialize dark mode
        if (typeof DarkMode !== 'undefined') {
            this.darkMode = new DarkMode();
        }
        
        // Initialize charts
        this.charts = new Charts();
        
        // Initialize export system
        this.exportSystem = new ExportSystem();
        this.exportSystem.init();
        
        // Initialize quick actions
        this.quickActions = new QuickActions();
        
        // Initialize reminders
        this.reminders = new Reminders();
        
        // Initialize solicitudes enhancements
        this.solicitudesTimeline = new SolicitudesTimeline();
        this.currentSolicitudesView = 'list';
    }
    
    /**
     * Check if user is admin
     */
    isAdmin() {
        return auth.isAdmin();
    }

    /**
     * Load current user info
     */
    loadCurrentUser() {
        const user = auth.getCurrentUser();
        if (user) {
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) {
                userNameEl.textContent = user.nombre || user.email;
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateTo(page);
                }
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.logout();
            });
        }

        // Menu toggle (mobile)
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.getElementById('sidebar').classList.toggle('active');
            });
        }

        // Search and filters
        const searchComunicados = document.getElementById('search-comunicados');
        if (searchComunicados) {
            searchComunicados.addEventListener('input', () => this.loadComunicados());
        }

        document.getElementById('filter-departamento')?.addEventListener('change', () => this.loadComunicados());
        document.getElementById('filter-tipo')?.addEventListener('change', () => this.loadComunicados());

        // Admin filters
        document.getElementById('admin-filter-departamento')?.addEventListener('change', () => this.loadAdminSolicitudes());
        document.getElementById('admin-filter-tipo')?.addEventListener('change', () => this.loadAdminSolicitudes());
        document.getElementById('admin-filter-fecha-inicio')?.addEventListener('change', () => this.loadAdminSolicitudes());
        document.getElementById('admin-filter-fecha-fin')?.addEventListener('change', () => this.loadAdminSolicitudes());
        document.getElementById('admin-search-empleado')?.addEventListener('input', () => this.loadAdminSolicitudes());
    }

    /**
     * Navigate to page
     */
    navigateTo(page) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });

        // Show selected page
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.style.display = 'block';
            this.currentPage = page;
        }

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }

        // Load page data
        if (page === 'dashboard') {
            this.loadDashboard();
        } else if (page === 'comunicados') {
            this.loadComunicados();
        } else if (page === 'solicitudes') {
            this.loadSolicitudes();
            // Setup filter listeners
            setTimeout(() => {
                const filterEstado = document.getElementById('solicitudes-filter-estado');
                const filterTipo = document.getElementById('solicitudes-filter-tipo');
                const filterFechaInicio = document.getElementById('solicitudes-filter-fecha-inicio');
                const filterFechaFin = document.getElementById('solicitudes-filter-fecha-fin');

                [filterEstado, filterTipo, filterFechaInicio, filterFechaFin].forEach(filter => {
                    if (filter) {
                        filter.addEventListener('change', () => this.loadSolicitudes());
                    }
                });
            }, 100);
        } else if (page === 'admin-panel') {
            this.loadAdminPanel();
        }
    }

    /**
     * Load dashboard
     */
    async loadDashboard() {
        const user = auth.getCurrentUser();
        const statsGrid = document.getElementById('stats-grid');

        // Show loading state
        statsGrid.innerHTML = `
            <div class="skeleton-stat-card skeleton"></div>
            <div class="skeleton-stat-card skeleton"></div>
            <div class="skeleton-stat-card skeleton"></div>
            <div class="skeleton-stat-card skeleton"></div>
        `;

        // Small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 300));

        if (auth.isAdmin()) {
            // Admin dashboard stats
            const solicitudes = await db.getAll('solicitudes');
            const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
            const aprobadasHoy = solicitudes.filter(s => {
                const hoy = new Date().toISOString().split('T')[0];
                return s.estado === 'aprobada' && s.fechaActualizacion?.startsWith(hoy);
            }).length;
            const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length;
            const usuarios = await db.getAll('usuarios');
            const activos = usuarios.filter(u => u.activo).length;

            statsGrid.innerHTML = `
                <div class="stat-card">
                    <h3>${pendientes}</h3>
                    <p>Solicitudes Pendientes</p>
                </div>
                <div class="stat-card">
                    <h3>${aprobadasHoy}</h3>
                    <p>Aprobadas Hoy</p>
                </div>
                <div class="stat-card">
                    <h3>${rechazadas}</h3>
                    <p>Rechazadas</p>
                </div>
                <div class="stat-card">
                    <h3>${activos}</h3>
                    <p>Empleados Activos</p>
                </div>
            `;
        } else {
            // User dashboard stats
            const solicitudes = await db.getSolicitudesByUsuario(user.id);
            const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
            const aprobadas = solicitudes.filter(s => s.estado === 'aprobada').length;
            const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length;
            const comunicados = await db.getComunicadosByDepartamento(user.departamento);

            statsGrid.innerHTML = `
                <div class="stat-card">
                    <h3>${pendientes}</h3>
                    <p>Mis Solicitudes Pendientes</p>
                </div>
                <div class="stat-card">
                    <h3>${aprobadas}</h3>
                    <p>Mis Solicitudes Aprobadas</p>
                </div>
                <div class="stat-card">
                    <h3>${rechazadas}</h3>
                    <p>Mis Solicitudes Rechazadas</p>
                </div>
                <div class="stat-card">
                    <h3>${comunicados.length}</h3>
                    <p>Comunicados de mi Departamento</p>
                </div>
            `;
        }
    }

    /**
     * Load comunicados
     */
    async loadComunicados() {
        const user = auth.getCurrentUser();
        const comunicadosList = document.getElementById('comunicados-list');
        const search = document.getElementById('search-comunicados')?.value.toLowerCase() || '';
        const filterDept = document.getElementById('filter-departamento')?.value || '';
        const filterTipo = document.getElementById('filter-tipo')?.value || '';

        // Show loading state
        comunicadosList.innerHTML = `
            <div class="skeleton-card"><div class="skeleton-title skeleton"></div><div class="skeleton-text skeleton"></div><div class="skeleton-text skeleton"></div></div>
            <div class="skeleton-card"><div class="skeleton-title skeleton"></div><div class="skeleton-text skeleton"></div><div class="skeleton-text skeleton"></div></div>
            <div class="skeleton-card"><div class="skeleton-title skeleton"></div><div class="skeleton-text skeleton"></div><div class="skeleton-text skeleton"></div></div>
        `;

        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 200));

        let comunicados = await db.getAll('comunicados');

        // Filter by user's department if not admin
        if (!auth.isAdmin()) {
            comunicados = comunicados.filter(c => c.departamento === user.departamento || c.tipo === 'externo');
        }

        // Apply filters
        if (filterDept) {
            comunicados = comunicados.filter(c => c.departamento === filterDept);
        }
        if (filterTipo) {
            comunicados = comunicados.filter(c => c.tipo === filterTipo);
        }
        if (search) {
            comunicados = comunicados.filter(c => 
                c.titulo.toLowerCase().includes(search) ||
                c.contenido.toLowerCase().includes(search) ||
                c.codigo.toLowerCase().includes(search)
            );
        }

        // Sort by date (newest first)
        comunicados.sort((a, b) => b.fechaCreacion - a.fechaCreacion);

        if (comunicados.length === 0) {
            comunicadosList.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <span class="empty-state-icon">📭</span>
                    <h3>No se encontraron comunicados</h3>
                    <p>No hay comunicados que coincidan con los filtros seleccionados. Intenta ajustar tus criterios de búsqueda.</p>
                    ${auth.isAdmin() ? `
                        <div class="empty-state-actions">
                            <button class="btn btn-primary" onclick="document.getElementById('btn-new-comunicado').click()">
                                Crear Comunicado
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
            return;
        }

        comunicadosList.innerHTML = comunicados.map(c => `
            <div class="comunicado-card">
                <div class="comunicado-header">
                    <span class="comunicado-codigo">${c.codigo}</span>
                    <span class="comunicado-tipo badge-${c.tipo}">${c.tipo.toUpperCase()}</span>
                </div>
                <h3 class="comunicado-titulo">${this.escapeHtml(c.titulo)}</h3>
                <p class="comunicado-contenido">${this.escapeHtml(c.contenido.substring(0, 200))}${c.contenido.length > 200 ? '...' : ''}</p>
                <div class="comunicado-footer">
                    <span class="comunicado-departamento">${c.departamento}</span>
                    <span class="comunicado-fecha">${this.formatDate(c.fecha)}</span>
                    <button class="btn btn-sm btn-secondary export-pdf-btn" data-comunicado-id="${c.id}" title="Exportar este comunicado a PDF" style="display: inline-flex; align-items: center; gap: 4px;">
                        <span>📄</span> PDF
                    </button>
                </div>
            </div>
        `).join('');
        
        // Attach event listeners to PDF buttons
        comunicadosList.querySelectorAll('.export-pdf-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = parseInt(btn.getAttribute('data-comunicado-id'));
                if (id && window.app && window.app.exportComunicadoPDF) {
                    await window.app.exportComunicadoPDF(id);
                } else {
                    showNotification('Error: No se pudo obtener el ID del comunicado', 'error');
                }
            });
        });
    }

    /**
     * Load solicitudes
     */
    async loadSolicitudes() {
        const user = auth.getCurrentUser();
        let solicitudes = await db.getSolicitudesByUsuario(user.id);

        // Apply filters
        solicitudes = this.applySolicitudesFilters(solicitudes);

        // Sort by date (newest first)
        solicitudes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);

        // Render statistics
        await solicitudesEnhancements.renderStatistics('solicitudes-stats-container', user.id);

        // Render based on current view
        if (this.currentSolicitudesView === 'timeline') {
            await this.renderSolicitudesTimeline(solicitudes);
        } else if (this.currentSolicitudesView === 'calendar') {
            await this.renderSolicitudesCalendar(solicitudes);
        } else {
            await this.renderSolicitudesList(solicitudes);
        }
    }

    /**
     * Render solicitudes list view
     */
    async renderSolicitudesList(solicitudes) {
        const solicitudesList = document.getElementById('solicitudes-list');
        const timelineView = document.getElementById('solicitudes-timeline');
        const calendarView = document.getElementById('solicitudes-calendar');

        solicitudesList.style.display = 'block';
        if (timelineView) timelineView.style.display = 'none';
        if (calendarView) calendarView.style.display = 'none';

        if (solicitudes.length === 0) {
            solicitudesList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">📋</span>
                    <h3>No tienes solicitudes</h3>
                    <p>Aún no has creado ninguna solicitud. Puedes crear una nueva solicitud de permisos, vacaciones u otras necesidades.</p>
                    <div class="empty-state-actions">
                        <button class="btn btn-primary" onclick="document.getElementById('btn-new-solicitud').click()">
                            Nueva Solicitud
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        solicitudesList.innerHTML = solicitudes.map(s => `
            <div class="solicitud-card solicitud-${s.estado}">
                <div class="solicitud-header">
                    <h3>${this.getSolicitudTipoLabel(s.tipo)}</h3>
                    <span class="badge-${s.estado}">${s.estado.toUpperCase()}</span>
                </div>
                <div class="solicitud-body">
                    ${this.renderSolicitudDetails(s)}
                </div>
                ${s.justificacion ? `<div class="solicitud-justificacion"><strong>Justificación:</strong> ${this.escapeHtml(s.justificacion)}</div>` : ''}
                <div class="solicitud-footer">
                    <span>${this.formatDate(s.fecha)}</span>
                    ${s.fechaActualizacion ? `<span>Actualizado: ${this.formatDate(s.fechaActualizacion)}</span>` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="window.app.viewSolicitudComments(${s.id})" title="Ver comentarios">
                        💬 Comentarios
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render timeline view
     */
    async renderSolicitudesTimeline(solicitudes) {
        const solicitudesList = document.getElementById('solicitudes-list');
        const timelineView = document.getElementById('solicitudes-timeline');
        const calendarView = document.getElementById('solicitudes-calendar');

        solicitudesList.style.display = 'none';
        if (timelineView) timelineView.style.display = 'block';
        if (calendarView) calendarView.style.display = 'none';

        await this.solicitudesTimeline.renderTimeline('solicitudes-timeline', solicitudes);
    }

    /**
     * Render calendar view
     */
    async renderSolicitudesCalendar(solicitudes) {
        const solicitudesList = document.getElementById('solicitudes-list');
        const timelineView = document.getElementById('solicitudes-timeline');
        const calendarView = document.getElementById('solicitudes-calendar');

        solicitudesList.style.display = 'none';
        if (timelineView) timelineView.style.display = 'none';
        if (calendarView) calendarView.style.display = 'block';

        await this.solicitudesTimeline.renderCalendarView('solicitudes-calendar', solicitudes);
    }

    /**
     * Toggle solicitudes view
     */
    toggleSolicitudesView(view) {
        this.currentSolicitudesView = view;
        
        // Update button states
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            }
        });

        // Show/hide filters
        const filtersBar = document.getElementById('solicitudes-filters-bar');
        if (filtersBar) {
            filtersBar.style.display = view !== 'list' ? 'flex' : 'none';
        }

        // Reload solicitudes with new view
        this.loadSolicitudes();
    }

    /**
     * Apply filters to solicitudes
     */
    applySolicitudesFilters(solicitudes) {
        const filterEstado = document.getElementById('solicitudes-filter-estado')?.value || '';
        const filterTipo = document.getElementById('solicitudes-filter-tipo')?.value || '';
        const filterFechaInicio = document.getElementById('solicitudes-filter-fecha-inicio')?.value || '';
        const filterFechaFin = document.getElementById('solicitudes-filter-fecha-fin')?.value || '';

        let filtered = solicitudes;

        if (filterEstado) {
            filtered = filtered.filter(s => s.estado === filterEstado);
        }
        if (filterTipo) {
            filtered = filtered.filter(s => s.tipo === filterTipo);
        }
        if (filterFechaInicio) {
            filtered = filtered.filter(s => s.fecha >= filterFechaInicio);
        }
        if (filterFechaFin) {
            filtered = filtered.filter(s => s.fecha <= filterFechaFin);
        }

        return filtered;
    }

    /**
     * View solicitud comments
     */
    async viewSolicitudComments(solicitudId) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.id = 'modal-comentarios-solicitud';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Comentarios de Solicitud</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="comments-container-${solicitudId}"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        await solicitudesEnhancements.renderComments(solicitudId, `comments-container-${solicitudId}`);

        // Setup filter listeners
        const filterEstado = document.getElementById('solicitudes-filter-estado');
        const filterTipo = document.getElementById('solicitudes-filter-tipo');
        const filterFechaInicio = document.getElementById('solicitudes-filter-fecha-inicio');
        const filterFechaFin = document.getElementById('solicitudes-filter-fecha-fin');

        [filterEstado, filterTipo, filterFechaInicio, filterFechaFin].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.loadSolicitudes());
            }
        });
    }

    /**
     * Load admin panel
     */
    async loadAdminPanel() {
        await this.loadAdminStats();
        await this.loadAdminSolicitudes();
    }

    /**
     * Load admin stats
     */
    async loadAdminStats() {
        const statsGrid = document.getElementById('admin-stats');
        const solicitudes = await db.getAll('solicitudes');
        const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
        const aprobadasHoy = solicitudes.filter(s => {
            const hoy = new Date().toISOString().split('T')[0];
            return s.estado === 'aprobada' && s.fechaActualizacion?.startsWith(hoy);
        }).length;
        const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length;
        const usuarios = await db.getAll('usuarios');
        const activos = usuarios.filter(u => u.activo).length;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <h3>${pendientes}</h3>
                <p>Solicitudes Pendientes</p>
            </div>
            <div class="stat-card">
                <h3>${aprobadasHoy}</h3>
                <p>Aprobadas Hoy</p>
            </div>
            <div class="stat-card">
                <h3>${rechazadas}</h3>
                <p>Rechazadas</p>
            </div>
            <div class="stat-card">
                <h3>${activos}</h3>
                <p>Empleados Activos</p>
            </div>
        `;
    }

    /**
     * Load admin solicitudes
     */
    async loadAdminSolicitudes() {
        const list = document.getElementById('admin-solicitudes-list');
        let solicitudes = await db.getAll('solicitudes');

        // Apply filters
        const filterDept = document.getElementById('admin-filter-departamento')?.value || '';
        const filterTipo = document.getElementById('admin-filter-tipo')?.value || '';
        const filterFechaInicio = document.getElementById('admin-filter-fecha-inicio')?.value || '';
        const filterFechaFin = document.getElementById('admin-filter-fecha-fin')?.value || '';
        const searchEmpleado = document.getElementById('admin-search-empleado')?.value.toLowerCase() || '';

        if (filterDept) {
            solicitudes = solicitudes.filter(s => s.departamento === filterDept);
        }
        if (filterTipo) {
            solicitudes = solicitudes.filter(s => s.tipo === filterTipo);
        }
        if (filterFechaInicio) {
            solicitudes = solicitudes.filter(s => s.fecha >= filterFechaInicio);
        }
        if (filterFechaFin) {
            solicitudes = solicitudes.filter(s => s.fecha <= filterFechaFin);
        }
        if (searchEmpleado) {
            solicitudes = solicitudes.filter(s => 
                s.usuarioNombre?.toLowerCase().includes(searchEmpleado) ||
                s.usuarioId?.toString().includes(searchEmpleado)
            );
        }

        // Sort by date (newest first)
        solicitudes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);

        if (solicitudes.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">🔍</span>
                    <h3>No se encontraron solicitudes</h3>
                    <p>No hay solicitudes que coincidan con los filtros seleccionados. Intenta ajustar tus criterios de búsqueda.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = solicitudes.map(s => {
            let estadoClass = 'yellow';
            if (s.estado === 'aprobada') {
                estadoClass = 'green';
            } else if (s.estado === 'rechazada') {
                estadoClass = 'red';
            } else if (s.estado === 'en_revision') {
                estadoClass = 'yellow'; // Same color as pendiente
            }
            return `
                <div class="admin-solicitud-card solicitud-${s.estado}" data-id="${s.id}">
                    <div class="solicitud-header">
                        <div>
                            <h4>${this.getSolicitudTipoLabel(s.tipo)}</h4>
                            <p class="solicitud-empleado">${s.usuarioNombre || 'Usuario'} - ${s.departamento}</p>
                        </div>
                        <span class="badge-${estadoClass}">${s.estado === 'en_revision' ? 'EN REVISIÓN' : s.estado.toUpperCase()}</span>
                    </div>
                    <div class="solicitud-preview">
                        ${this.renderSolicitudDetails(s)}
                    </div>
                    <div class="solicitud-footer">
                        <span>${this.formatDate(s.fecha)}</span>
                        <button class="btn btn-sm btn-primary" onclick="window.app.viewSolicitudDetalle(${s.id})">Ver Detalle</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * View solicitud detail (admin)
     */
    async viewSolicitudDetalle(id) {
        const solicitud = await db.get('solicitudes', id);
        if (!solicitud) {
            showNotification('Solicitud no encontrada', 'error');
            return;
        }

        // Store current solicitud ID for export
        this.currentSolicitudId = id;

        const content = document.getElementById('solicitud-detalle-content');
        const adminActions = document.getElementById('admin-actions');
        
        // Get employee signature if exists
        const firmas = await db.query('firmas', 'solicitudId', id);
        const firmaEmpleado = firmas.find(f => f.tipo === 'empleado');
        const firmaAdmin = firmas.find(f => !f.tipo || f.tipo === 'admin');
        
        const estadoBadge = solicitud.estado === 'en_revision' ? 'yellow' : solicitud.estado;
        const estadoText = solicitud.estado === 'en_revision' ? 'EN REVISIÓN' : solicitud.estado.toUpperCase();
        
        content.innerHTML = `
            <div class="solicitud-detalle-header">
                <div class="solicitud-detalle-header-content">
                    <h3>${this.getSolicitudTipoLabel(solicitud.tipo)}</h3>
                    <div class="solicitud-detalle-header-meta">
                        <span><strong>Empleado:</strong> ${solicitud.usuarioNombre || 'N/A'}</span>
                        <span><strong>Departamento:</strong> ${solicitud.departamento || 'N/A'}</span>
                        <span><strong>Fecha:</strong> ${this.formatDate(solicitud.fecha)}</span>
                    </div>
                </div>
                <span class="badge-${estadoBadge}">${estadoText}</span>
            </div>
            <div class="solicitud-detalle-body">
                ${this.renderSolicitudDetailsCard(solicitud)}
                ${firmaEmpleado ? `
                    <div class="solicitud-info-card" style="grid-column: 1 / -1;">
                        <div class="solicitud-info-card-header">
                            <div class="solicitud-info-card-icon">✍️</div>
                            <div class="solicitud-info-card-title">Firma del Empleado</div>
                        </div>
                        <div class="solicitud-firma-display">
                            <img src="${firmaEmpleado.imagen}" alt="Firma del empleado" style="max-width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: white;">
                            <p style="font-size: 12px; color: var(--secondary-color); margin-top: 8px;">Firmado el ${this.formatDate(firmaEmpleado.fecha)}</p>
                        </div>
                    </div>
                ` : ''}
                ${solicitud.justificacion ? `
                    <div class="justificacion-box">
                        <div class="justificacion-box-header">
                            <div class="justificacion-box-icon">!</div>
                            <strong>Justificación del Rechazo</strong>
                        </div>
                        <p>${this.escapeHtml(solicitud.justificacion)}</p>
                    </div>
                ` : ''}
                ${firmaAdmin ? `
                    <div class="solicitud-info-card" style="grid-column: 1 / -1;">
                        <div class="solicitud-info-card-header">
                            <div class="solicitud-info-card-icon">✓</div>
                            <div class="solicitud-info-card-title">Firma del Administrador</div>
                        </div>
                        <div class="solicitud-firma-display">
                            <img src="${firmaAdmin.imagen}" alt="Firma del administrador" style="max-width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: white;">
                            <p style="font-size: 12px; color: var(--secondary-color); margin-top: 8px;">Firmado el ${this.formatDate(firmaAdmin.fecha)}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="solicitud-historial">
                <div class="solicitud-historial-header">
                    <div class="solicitud-historial-icon">⏱</div>
                    <h4>Historial de la Solicitud</h4>
                </div>
                <ul>
                    <li>Creada el ${this.formatDate(solicitud.fecha)}</li>
                    ${solicitud.fechaActualizacion ? `<li>Última actualización: ${this.formatDate(solicitud.fechaActualizacion)}</li>` : ''}
                    ${solicitud.aprobadoPor ? `<li>Procesada por: ${solicitud.aprobadoPor}</li>` : ''}
                    ${firmaEmpleado ? `<li>Firmada por el empleado el ${this.formatDate(firmaEmpleado.fecha)}</li>` : ''}
                    ${firmaAdmin ? `<li>Firmada por el administrador el ${this.formatDate(firmaAdmin.fecha)}</li>` : ''}
                </ul>
            </div>
        `;

        // Show/hide admin actions
        // Allow editing for pendiente and en_revision states
        const editableStates = ['pendiente', 'en_revision'];
        if (editableStates.includes(solicitud.estado) && auth.isAdmin()) {
            adminActions.style.display = 'block';
            signatureManager.clear();
            
            // If already in revision, hide the "marcar en revisión" button
            const btnRevision = document.getElementById('btn-revision');
            if (btnRevision) {
                if (solicitud.estado === 'en_revision') {
                    btnRevision.style.display = 'none';
                } else {
                    btnRevision.style.display = 'inline-flex';
                }
            }
        } else {
            adminActions.style.display = 'none';
        }

        // Setup action buttons
        document.getElementById('btn-aprobar').onclick = () => this.aprobarSolicitud(id);
        document.getElementById('btn-rechazar').onclick = () => this.rechazarSolicitud(id);
        document.getElementById('btn-revision').onclick = () => this.marcarEnRevision(id);

        // Open modal
        document.getElementById('modal-solicitud-detalle').style.display = 'flex';
        setTimeout(() => {
            signatureManager.init('signature-canvas');
        }, 100);
    }

    /**
     * Approve solicitud
     */
    async aprobarSolicitud(id) {
        const signature = signatureManager.getSignatureData();
        if (!signature) {
            showNotification('Debe proporcionar una firma digital', 'error');
            return;
        }

        try {
            const solicitud = await db.get('solicitudes', id);
            const user = auth.getCurrentUser();

            solicitud.estado = 'aprobada';
            solicitud.aprobadoPor = user.nombre;
            solicitud.fechaActualizacion = new Date().toISOString();

            await db.update('solicitudes', solicitud);
            await signatureManager.saveSignature(id);
            await db.addAuditoria('SOLICITUD_APROBAR', { solicitudId: id });

            showNotification('Solicitud aprobada exitosamente', 'success');
            document.getElementById('modal-solicitud-detalle').style.display = 'none';
            this.loadAdminSolicitudes();
            this.loadAdminStats();
        } catch (error) {
            console.error('Error approving solicitud:', error);
            showNotification('Error al aprobar la solicitud', 'error');
        }
    }

    /**
     * Reject solicitud
     */
    async rechazarSolicitud(id) {
        const justificacion = document.getElementById('justificacion').value.trim();
        if (!justificacion) {
            showNotification('Debe proporcionar una justificación', 'error');
            return;
        }

        const signature = signatureManager.getSignatureData();
        if (!signature) {
            showNotification('Debe proporcionar una firma digital', 'error');
            return;
        }

        try {
            const solicitud = await db.get('solicitudes', id);
            const user = auth.getCurrentUser();

            solicitud.estado = 'rechazada';
            solicitud.justificacion = justificacion;
            solicitud.aprobadoPor = user.nombre;
            solicitud.fechaActualizacion = new Date().toISOString();

            await db.update('solicitudes', solicitud);
            await signatureManager.saveSignature(id);
            await db.addAuditoria('SOLICITUD_RECHAZAR', { solicitudId: id, justificacion });

            showNotification('Solicitud rechazada', 'success');
            document.getElementById('modal-solicitud-detalle').style.display = 'none';
            document.getElementById('justificacion').value = '';
            this.loadAdminSolicitudes();
            this.loadAdminStats();
        } catch (error) {
            console.error('Error rejecting solicitud:', error);
            showNotification('Error al rechazar la solicitud', 'error');
        }
    }

    /**
     * Mark solicitud in review
     */
    async marcarEnRevision(id) {
        try {
            const solicitud = await db.get('solicitudes', id);
            solicitud.estado = 'en_revision';
            solicitud.fechaActualizacion = new Date().toISOString();

            await db.update('solicitudes', solicitud);
            await db.addAuditoria('SOLICITUD_REVISION', { solicitudId: id });

            showNotification('Solicitud marcada en revisión', 'success');
            
            // Reload the modal with updated state to refresh the UI
            await this.viewSolicitudDetalle(id);
            
            this.loadAdminSolicitudes();
            this.loadAdminStats();
        } catch (error) {
            console.error('Error marking in review:', error);
            showNotification('Error al marcar la solicitud', 'error');
        }
    }

    /**
     * Render solicitud details
     */
    renderSolicitudDetails(solicitud, full = false) {
        let html = '';
        
        if (solicitud.tipo === 'permiso') {
            html = `
                <p><strong>Fecha Inicio:</strong> ${this.formatDate(solicitud.fechaInicio || '')}</p>
                <p><strong>Fecha Fin:</strong> ${this.formatDate(solicitud.fechaFin || '')}</p>
                <p><strong>Días:</strong> ${solicitud.dias || 0}</p>
                <p><strong>Motivo:</strong> ${this.escapeHtml(solicitud.motivo || '')}</p>
            `;
        } else if (solicitud.tipo === 'vacaciones') {
            html = `
                <p><strong>Fecha Inicio:</strong> ${this.formatDate(solicitud.fechaInicio || '')}</p>
                <p><strong>Fecha Fin:</strong> ${this.formatDate(solicitud.fechaFin || '')}</p>
                <p><strong>Días:</strong> ${solicitud.dias || 0}</p>
                ${solicitud.observaciones ? `<p><strong>Observaciones:</strong> ${this.escapeHtml(solicitud.observaciones)}</p>` : ''}
            `;
        } else if (solicitud.tipo === 'otra') {
            html = `
                <p><strong>Título:</strong> ${this.escapeHtml(solicitud.titulo || '')}</p>
                <p><strong>Descripción:</strong> ${this.escapeHtml(solicitud.descripcion || '')}</p>
            `;
        }

        return html;
    }

    /**
     * Render solicitud details in card format
     */
    renderSolicitudDetailsCard(solicitud) {
        let html = '';
        
        if (solicitud.tipo === 'permiso') {
            html = `
                <div class="solicitud-info-card">
                    <div class="solicitud-info-card-header">
                        <div class="solicitud-info-card-icon">📅</div>
                        <div class="solicitud-info-card-title">Periodo Solicitado</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Fecha de Inicio</div>
                        <div class="solicitud-info-value">${this.formatDate(solicitud.fechaInicio || '')}</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Fecha de Fin</div>
                        <div class="solicitud-info-value">${this.formatDate(solicitud.fechaFin || '')}</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Total de Días</div>
                        <div class="solicitud-info-value solicitud-info-value-large">${solicitud.dias || 0} días</div>
                    </div>
                </div>
                <div class="solicitud-info-card">
                    <div class="solicitud-info-card-header">
                        <div class="solicitud-info-card-icon">📝</div>
                        <div class="solicitud-info-card-title">Motivo</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-value">${this.escapeHtml(solicitud.motivo || 'No especificado')}</div>
                    </div>
                </div>
            `;
        } else if (solicitud.tipo === 'vacaciones') {
            html = `
                <div class="solicitud-info-card">
                    <div class="solicitud-info-card-header">
                        <div class="solicitud-info-card-icon">🏖️</div>
                        <div class="solicitud-info-card-title">Periodo de Vacaciones</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Fecha de Inicio</div>
                        <div class="solicitud-info-value">${this.formatDate(solicitud.fechaInicio || '')}</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Fecha de Fin</div>
                        <div class="solicitud-info-value">${this.formatDate(solicitud.fechaFin || '')}</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Total de Días</div>
                        <div class="solicitud-info-value solicitud-info-value-large">${solicitud.dias || 0} días</div>
                    </div>
                </div>
                ${solicitud.observaciones ? `
                    <div class="solicitud-info-card">
                        <div class="solicitud-info-card-header">
                            <div class="solicitud-info-card-icon">💬</div>
                            <div class="solicitud-info-card-title">Observaciones</div>
                        </div>
                        <div class="solicitud-info-item">
                            <div class="solicitud-info-value">${this.escapeHtml(solicitud.observaciones)}</div>
                        </div>
                    </div>
                ` : ''}
            `;
        } else if (solicitud.tipo === 'otra') {
            html = `
                <div class="solicitud-info-card">
                    <div class="solicitud-info-card-header">
                        <div class="solicitud-info-card-icon">📋</div>
                        <div class="solicitud-info-card-title">Detalles de la Solicitud</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Título</div>
                        <div class="solicitud-info-value">${this.escapeHtml(solicitud.titulo || 'N/A')}</div>
                    </div>
                    <div class="solicitud-info-item">
                        <div class="solicitud-info-label">Descripción</div>
                        <div class="solicitud-info-value">${this.escapeHtml(solicitud.descripcion || 'No especificada')}</div>
                    </div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Get solicitud tipo label
     */
    getSolicitudTipoLabel(tipo) {
        const labels = {
            'permiso': 'Permiso sin Goce de Salario',
            'vacaciones': 'Solicitud de Vacaciones',
            'otra': 'Otra Solicitud'
        };
        return labels[tipo] || tipo;
    }

    /**
     * Export comunicado to PDF
     */

    /**
     * Format date - handles date strings (YYYY-MM-DD) and ISO strings correctly
     */
    formatDate(dateString) {
        if (!dateString) return '';
        
        // If it's a date string in format YYYY-MM-DD, parse it directly
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day); // month is 0-indexed
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // For ISO strings, parse in local timezone
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateString; // Return as-is if invalid
        }
        
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });
    }
    
    /**
     * Format date for input fields (YYYY-MM-DD format)
     */
    formatDateForInput(dateString) {
        if (!dateString) return '';
        
        // If it's already in YYYY-MM-DD format, return as-is
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        
        // Parse ISO string and convert to local date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '';
        }
        
        // Get local date components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    window.app = app; // Make available globally for onclick handlers
});

// Export functions for onclick handlers
App.prototype.exportComunicadoPDF = async function(id) {
    try {
        if (!id) {
            showNotification('Error: ID de comunicado no válido', 'error');
            return;
        }
        
        const comunicado = await db.get('comunicados', id);
        if (!comunicado) {
            showNotification('Comunicado no encontrado', 'error');
            return;
        }
        
        showNotification('Generando PDF...', 'info');
        await this.exportSystem.exportComunicadoPDF(comunicado);
        showNotification('Comunicado exportado a PDF exitosamente', 'success');
    } catch (error) {
        console.error('Error al exportar comunicado:', error);
        showNotification('Error al exportar el comunicado a PDF', 'error');
    }
};

App.prototype.exportComunicadosPDF = async function() {
    const user = auth.getCurrentUser();
    let comunicados = await db.getAll('comunicados');
    
    // Filter by user's department if not admin
    if (!auth.isAdmin()) {
        comunicados = comunicados.filter(c => c.departamento === user.departamento || c.tipo === 'externo');
    }
    
    // Apply current filters
    const filterDept = document.getElementById('filter-departamento')?.value || '';
    const filterTipo = document.getElementById('filter-tipo')?.value || '';
    const search = document.getElementById('search-comunicados')?.value.toLowerCase() || '';
    
    if (filterDept) {
        comunicados = comunicados.filter(c => c.departamento === filterDept);
    }
    if (filterTipo) {
        comunicados = comunicados.filter(c => c.tipo === filterTipo);
    }
    if (search) {
        comunicados = comunicados.filter(c => 
            c.titulo.toLowerCase().includes(search) ||
            c.contenido.toLowerCase().includes(search) ||
            c.codigo.toLowerCase().includes(search)
        );
    }
    
    if (comunicados.length === 0) {
        showNotification('No hay comunicados para exportar', 'info');
        return;
    }
    
    await this.exportSystem.exportComunicadosPDF(comunicados);
    showNotification(`${comunicados.length} comunicado(s) exportado(s) a PDF`, 'success');
};

App.prototype.exportComunicadosExcel = async function() {
    const user = auth.getCurrentUser();
    let comunicados = await db.getAll('comunicados');
    
    if (!auth.isAdmin()) {
        comunicados = comunicados.filter(c => c.departamento === user.departamento || c.tipo === 'externo');
    }
    
    await this.exportSystem.exportComunicadosExcel(comunicados);
    showNotification('Comunicados exportados a Excel', 'success');
};

App.prototype.exportSolicitudPDF = async function(id) {
    const solicitud = await db.get('solicitudes', id);
    if (!solicitud) {
        showNotification('Solicitud no encontrada', 'error');
        return;
    }
    await this.exportSystem.exportSolicitudPDF(solicitud);
    showNotification('Solicitud exportada a PDF', 'success');
};

App.prototype.exportSolicitudesPDF = async function() {
    let solicitudes = await db.getAll('solicitudes');
    
    // Apply current admin filters
    const filterDept = document.getElementById('admin-filter-departamento')?.value || '';
    const filterTipo = document.getElementById('admin-filter-tipo')?.value || '';
    const search = document.getElementById('admin-search-empleado')?.value.toLowerCase() || '';
    
    if (filterDept) {
        solicitudes = solicitudes.filter(s => s.departamento === filterDept);
    }
    if (filterTipo) {
        solicitudes = solicitudes.filter(s => s.tipo === filterTipo);
    }
    if (search) {
        solicitudes = solicitudes.filter(s => 
            (s.usuarioNombre || '').toLowerCase().includes(search)
        );
    }
    
    if (solicitudes.length === 0) {
        showNotification('No hay solicitudes para exportar', 'info');
        return;
    }
    
    if (solicitudes.length > 10) {
        const confirm = window.confirm(`Se exportarán ${solicitudes.length} solicitudes. Esto puede generar muchos archivos. ¿Continuar?`);
        if (!confirm) return;
    }
    
    await this.exportSystem.exportSolicitudesPDF(solicitudes);
    showNotification(`${solicitudes.length} solicitud(es) exportada(s) a PDF`, 'success');
};

App.prototype.exportSolicitudesExcel = async function() {
    let solicitudes = await db.getAll('solicitudes');
    
    // Apply current admin filters
    const filterDept = document.getElementById('admin-filter-departamento')?.value || '';
    const filterTipo = document.getElementById('admin-filter-tipo')?.value || '';
    const search = document.getElementById('admin-search-empleado')?.value.toLowerCase() || '';
    
    if (filterDept) {
        solicitudes = solicitudes.filter(s => s.departamento === filterDept);
    }
    if (filterTipo) {
        solicitudes = solicitudes.filter(s => s.tipo === filterTipo);
    }
    if (search) {
        solicitudes = solicitudes.filter(s => 
            (s.usuarioNombre || '').toLowerCase().includes(search)
        );
    }
    
    await this.exportSystem.exportSolicitudesExcel(solicitudes);
    showNotification('Solicitudes exportadas a Excel', 'success');
};

export default App;

