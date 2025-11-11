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
// Dark mode disabled - using light mode only
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
        
        // Dark mode disabled - using light mode only
        // Remove dark mode class if present
        document.documentElement.classList.remove('dark-mode');
        // Clear dark mode preference from localStorage
        localStorage.removeItem('darkMode');
        
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
            <div class="comunicado-card" style="cursor: pointer;" data-comunicado-id="${c.id}">
                <div class="comunicado-header">
                    <span class="comunicado-codigo">${c.codigo}</span>
                    <span class="comunicado-tipo badge-${c.tipo}">${c.tipo.toUpperCase()}</span>
                </div>
                <h3 class="comunicado-titulo">${this.escapeHtml(c.asunto || c.titulo || 'Sin asunto')}</h3>
                <p class="comunicado-contenido">${this.escapeHtml(c.contenido.substring(0, 200))}${c.contenido.length > 200 ? '...' : ''}</p>
                <div class="comunicado-footer">
                    <span class="comunicado-departamento">${c.departamento}</span>
                    <span class="comunicado-fecha">${this.formatDate(c.fecha)}</span>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-secondary firmas-btn" data-comunicado-id="${c.id}" title="Ver firmas" style="display: inline-flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
                            <span>✍️</span> Firmas
                        </button>
                        <button class="btn btn-sm btn-secondary export-pdf-btn" data-comunicado-id="${c.id}" title="Exportar este comunicado a PDF" style="display: inline-flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
                            <span>📄</span> PDF
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Agregar event listeners para abrir el comunicado al hacer clic
        comunicadosList.querySelectorAll('.comunicado-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                if (e.target.closest('.export-pdf-btn')) return; // No abrir si se hace clic en el botón PDF
                const id = parseInt(card.getAttribute('data-comunicado-id'));
                if (id) {
                    await this.showComunicadoDetalle(id);
                }
            });
        });
        
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

        // Attach event listeners to firmas buttons
        comunicadosList.querySelectorAll('.firmas-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = parseInt(btn.getAttribute('data-comunicado-id'));
                if (id && window.app && window.app.mostrarFirmasComunicado) {
                    await window.app.mostrarFirmasComunicado(id);
                } else {
                    showNotification('Error: No se pudo obtener el ID del comunicado', 'error');
                }
            });
        });
    }

    /**
     * Show comunicado detail in document format
     */
    async showComunicadoDetalle(id) {
        try {
            const comunicado = await db.get('comunicados', id);
            if (!comunicado) {
                showNotification('Comunicado no encontrado', 'error');
                return;
            }

            const documentoContainer = document.getElementById('comunicado-documento');
            if (!documentoContainer) return;

            // Obtener información del departamento
            const departamentos = await db.getAll('departamentos');
            const deptInfo = departamentos.find(d => d.codigo === comunicado.departamento);
            const deptNombre = deptInfo ? deptInfo.nombre : comunicado.departamento;

            // Formatear fecha
            const fechaComunicado = this.formatDate(comunicado.fecha);
            const fechaCreacion = new Date(comunicado.fechaCreacion);
            const fechaCreacionFormato = fechaCreacion.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });

            // Determinar el tipo de comunicación para el título
            const tipoTexto = comunicado.tipo === 'interno' ? 'INTERNA' : 'EXTERNA';
            const tipoTextoCompleto = `COMUNICACIÓN OFICIAL ${tipoTexto}`;

            // Renderizar el documento
            documentoContainer.innerHTML = `
                <div class="comunicado-documento-wrapper">
                    <div class="comunicado-documento-header">
                        <div class="comunicado-logo-section">
                            <div class="comunicado-logo-placeholder">
                                <img src="img/empresa.jpg" alt="Logo de la Empresa" class="comunicado-logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <div class="logo-circle" style="display: none;">
                                    <span>🏥</span>
                                </div>
                            </div>
                            <div class="comunicado-empresa-info">
                                <h1>VETERINARIA SAN MARTIN DE PORRES</h1>
                                <p class="comunicado-empresa-id">3-105-761559</p>
                            </div>
                        </div>
                        <div class="comunicado-metadata">
                            <div class="comunicado-metadata-item">Página:</div>
                            <div class="comunicado-metadata-item" id="comunicado-pagina-actual">1 de 1</div>
                            <div class="comunicado-metadata-item">Código:</div>
                            <div class="comunicado-metadata-item">${comunicado.codigo || 'N/A'}</div>
                            <div class="comunicado-metadata-item">Fecha:</div>
                            <div class="comunicado-metadata-item">${fechaCreacionFormato}</div>
                        </div>
                    </div>
                    
                    <div class="comunicado-documento-title">
                        <h2>${tipoTextoCompleto}.</h2>
                        <p class="comunicado-fecha-destacada">${fechaComunicado}.</p>
                    </div>
                    
                    <div class="comunicado-documento-info">
                        <div class="comunicado-info-row">
                            <strong>Para:</strong> <span class="comunicado-highlight">${this.escapeHtml(comunicado.para || 'N/A')}</span>
                        </div>
                        <div class="comunicado-info-row">
                            <strong>De:</strong> ${this.escapeHtml(comunicado.de || `${deptNombre} – Veterinaria San Martin de Porres`)}
                        </div>
                        <div class="comunicado-info-row">
                            <strong>Asunto:</strong> <span class="comunicado-highlight">${this.escapeHtml(comunicado.asunto || 'N/A')}</span>
                        </div>
                    </div>
                    
                    <div class="comunicado-documento-body">
                        ${this.formatComunicadoContent(comunicado.contenido)}
                    </div>
                    
                    <div class="comunicado-documento-footer">
                        <div class="comunicado-firma">
                            <p><strong>${comunicado.usuarioNombre || 'N/A'}</strong></p>
                            <p>${deptNombre}</p>
                        </div>
                    </div>
                </div>
            `;

            // Abrir el modal
            const modal = document.getElementById('modal-ver-comunicado');
            if (modal) {
                modal.style.display = 'flex';
                
                // Esperar a que el contenido se renderice y calcular páginas
                setTimeout(() => {
                    this.calcularPaginasComunicado();
                }, 100);
                
                // Recalcular al cambiar el tamaño de la ventana
                window.addEventListener('resize', () => {
                    this.calcularPaginasComunicado();
                });
                
                // Configurar el botón de exportar
                const btnExport = document.getElementById('btn-export-comunicado-detalle');
                if (btnExport) {
                    btnExport.onclick = () => {
                        this.exportComunicadoPDF(id);
                    };
                }
                
                // Configurar el botón de firmas
                const btnFirmas = document.getElementById('btn-firmas-comunicado');
                if (btnFirmas) {
                    btnFirmas.onclick = () => {
                        this.mostrarFirmasComunicado(id);
                    };
                }
            }
        } catch (error) {
            console.error('Error al mostrar comunicado:', error);
            showNotification('Error al cargar el comunicado', 'error');
        }
    }

    /**
     * Calculate number of pages for comunicado based on A4 size
     */
    calcularPaginasComunicado() {
        const wrapper = document.querySelector('.comunicado-documento-wrapper');
        if (!wrapper) return;
        
        // Obtener dimensiones del wrapper
        const wrapperWidth = wrapper.offsetWidth || wrapper.scrollWidth || 800;
        const contentHeight = wrapper.scrollHeight;
        
        // Tamaño A4 en milímetros
        const A4_WIDTH_MM = 210;
        const A4_HEIGHT_MM = 297;
        
        // El wrapper tiene max-width: 800px en CSS, que corresponde a 210mm en A4
        // Calcular factor de escala basado en el ancho real
        const wrapperWidthMM = 210; // El wrapper está diseñado para 210mm (A4 width)
        const scaleFactor = wrapperWidthMM / wrapperWidth;
        
        // Altura del contenido en milímetros
        const contentHeightMM = contentHeight * scaleFactor;
        
        // Altura usable por página (considerando márgenes de 10mm arriba y abajo = 20mm total)
        const marginMM = 20;
        const usableHeightMM = A4_HEIGHT_MM - marginMM; // 277mm por página
        
        // Calcular número de páginas
        const totalPages = Math.max(1, Math.ceil(contentHeightMM / usableHeightMM));
        
        // Actualizar el contador de páginas
        const paginaElement = document.getElementById('comunicado-pagina-actual');
        if (paginaElement) {
            paginaElement.textContent = `1 de ${totalPages}`;
        }
        
        // Guardar el total de páginas para uso en PDF
        wrapper.dataset.totalPages = totalPages;
        
        return totalPages;
    }

    /**
     * Generate random 4-character code (letters, numbers, symbols)
     */
    generarCodigoPersonal() {
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
        let codigo = '';
        for (let i = 0; i < 4; i++) {
            codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        return codigo;
    }

    /**
     * Check if code is unique
     */
    async verificarCodigoUnico(codigo) {
        const usuarios = await db.getAll('usuarios');
        return !usuarios.some(u => u.codigoPersonal && u.codigoPersonal === codigo);
    }

    /**
     * Generate unique code
     */
    async generarCodigoUnico() {
        let codigo;
        let intentos = 0;
        do {
            codigo = this.generarCodigoPersonal();
            intentos++;
            if (intentos > 100) {
                throw new Error('No se pudo generar un código único después de 100 intentos');
            }
        } while (!(await this.verificarCodigoUnico(codigo)));
        return codigo;
    }

    /**
     * Show firmas modal for comunicado
     */
    async mostrarFirmasComunicado(comunicadoId) {
        try {
            const comunicado = await db.get('comunicados', comunicadoId);
            if (!comunicado) {
                showNotification('Comunicado no encontrado', 'error');
                return;
            }

            // Obtener usuario actual
            const currentUser = auth.getCurrentUser();
            const isAdmin = auth.isAdmin();

            // Obtener solo empleados (usuarios con código personal)
            const usuarios = await db.getAll('usuarios');
            let empleados;
            
            if (isAdmin) {
                // Admin ve todos los empleados
                empleados = usuarios.filter(u => u.activo !== false && u.codigoPersonal);
            } else {
                // Usuario regular solo ve su propio registro
                empleados = usuarios.filter(u => u.id === currentUser.id && u.codigoPersonal);
                
                if (empleados.length === 0) {
                    // Si el usuario actual no tiene código personal, mostrar mensaje
                    const listaContainer = document.getElementById('firmas-comunicado-lista');
                    if (listaContainer) {
                        listaContainer.innerHTML = '<p style="padding: 1rem; text-align: center; color: #ef4444;">No tienes un código personal asignado. Contacta al administrador.</p>';
                    }
                    
                    // Ocultar formulario de firmar
                    const formFirmar = document.getElementById('firmar-comunicado-form');
                    if (formFirmar) {
                        formFirmar.style.display = 'none';
                    }
                    
                    // Abrir modal
                    const modal = document.getElementById('modal-firmas-comunicado');
                    if (modal) {
                        modal.style.display = 'flex';
                    }
                    return;
                }
            }

            // Obtener firmas existentes
            const firmas = await db.query('firmas_comunicados', 'comunicadoId', comunicadoId);
            const firmasMap = new Map();
            firmas.forEach(f => {
                firmasMap.set(f.usuarioId, f);
            });

            // Renderizar lista de empleados
            const listaContainer = document.getElementById('firmas-comunicado-lista');
            if (!listaContainer) return;

            if (empleados.length === 0) {
                listaContainer.innerHTML = '<p>No hay empleados registrados. Los empleados deben tener un código personal asignado.</p>';
                return;
            }

            // Mostrar u ocultar formulario de firmar según el rol
            const formFirmar = document.getElementById('firmar-comunicado-form');
            if (formFirmar) {
                if (isAdmin) {
                    formFirmar.style.display = 'none'; // Admin no necesita firmar, solo ver
                } else {
                    formFirmar.style.display = 'block'; // Usuario regular puede firmar
                }
            }

            listaContainer.innerHTML = `
                ${isAdmin ? `
                    <div style="margin-bottom: 1rem;">
                        <strong>Total de empleados: ${empleados.length}</strong> | 
                        <strong style="color: #10b981;">Firmados: ${firmasMap.size}</strong> | 
                        <strong style="color: #ef4444;">Pendientes: ${empleados.length - firmasMap.size}</strong>
                    </div>
                ` : `
                    <div style="margin-bottom: 1rem; text-align: center;">
                        <strong>Tu estado de firma</strong>
                    </div>
                `}
                <div style="display: grid; gap: 0.75rem;">
                    ${empleados.map(usuario => {
                        const firma = firmasMap.get(usuario.id);
                        const haFirmado = !!firma;
                        const codigoPersonal = usuario.codigoPersonal || 'No asignado';
                        
                        return `
                            <div class="firma-empleado-item" style="
                                display: flex; 
                                align-items: center; 
                                justify-content: space-between;
                                padding: 1rem;
                                border: 1px solid ${haFirmado ? '#10b981' : '#e5e7eb'};
                                border-radius: 8px;
                                background: ${haFirmado ? '#f0fdf4' : '#ffffff'};
                            ">
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        <span style="
                                            display: inline-flex;
                                            align-items: center;
                                            justify-content: center;
                                            width: 24px;
                                            height: 24px;
                                            border-radius: 50%;
                                            background: ${haFirmado ? '#10b981' : '#e5e7eb'};
                                            color: ${haFirmado ? '#ffffff' : '#6b7280'};
                                            font-size: 14px;
                                            font-weight: 600;
                                        ">
                                            ${haFirmado ? '✓' : ''}
                                        </span>
                                        <div>
                                            <strong>${this.escapeHtml(usuario.nombre)}</strong>
                                            <div style="font-size: 0.875rem; color: #6b7280;">
                                                ${this.escapeHtml(usuario.email)}
                                                ${isAdmin ? ` | Código: <strong>${this.escapeHtml(codigoPersonal)}</strong>` : ''}
                                            </div>
                                            ${!isAdmin ? `
                                                <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
                                                    Tu código personal: <strong style="font-family: monospace; letter-spacing: 2px;">${this.escapeHtml(codigoPersonal)}</strong>
                                                </div>
                                            ` : ''}
                                            ${firma ? `
                                                <div style="font-size: 0.75rem; color: #10b981; margin-top: 0.25rem;">
                                                    Firmado el ${new Date(firma.fecha).toLocaleDateString('es-ES', { 
                                                        day: '2-digit', 
                                                        month: '2-digit', 
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style="
                                    padding: 0.5rem 1rem;
                                    border-radius: 6px;
                                    font-weight: 600;
                                    font-size: 0.875rem;
                                    ${haFirmado ? 'background: #10b981; color: #ffffff;' : 'background: #f3f4f6; color: #6b7280;'}
                                ">
                                    ${haFirmado ? 'FIRMADO' : 'PENDIENTE'}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            // Configurar botón de firmar
            const btnFirmar = document.getElementById('btn-firmar-comunicado');
            if (btnFirmar) {
                btnFirmar.onclick = async () => {
                    await this.firmarComunicado(comunicadoId);
                };
            }

            // Abrir modal
            const modal = document.getElementById('modal-firmas-comunicado');
            if (modal) {
                modal.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error al mostrar firmas:', error);
            showNotification('Error al cargar las firmas', 'error');
        }
    }

    /**
     * Firmar comunicado con código personal
     */
    async firmarComunicado(comunicadoId) {
        try {
            const codigoInput = document.getElementById('codigo-firma-personal');
            if (!codigoInput) return;

            let codigoIngresado = codigoInput.value.trim();
            if (!codigoIngresado) {
                showNotification('Por favor ingrese su código personal', 'error');
                return;
            }

            // Normalizar a mayúsculas para comparación
            codigoIngresado = codigoIngresado.toUpperCase();

            // Buscar usuario por código personal (comparación case-insensitive)
            const usuarios = await db.getAll('usuarios');
            
            const usuario = usuarios.find(u => {
                if (!u.codigoPersonal) return false;
                // Comparar normalizando ambos a mayúsculas
                const codigoBD = u.codigoPersonal.toUpperCase();
                return codigoBD === codigoIngresado;
            });

            if (!usuario) {
                showNotification('Código personal no válido', 'error');
                return;
            }

            // Verificar si ya firmó
            const firmasExistentes = await db.query('firmas_comunicados', 'comunicadoId', comunicadoId);
            const yaFirmo = firmasExistentes.some(f => f.usuarioId === usuario.id);

            if (yaFirmo) {
                showNotification('Ya has firmado este comunicado', 'info');
                return;
            }

            // Crear firma
            const firma = {
                comunicadoId,
                usuarioId: usuario.id,
                usuarioNombre: usuario.nombre,
                codigoPersonal: codigoIngresado, // Usar codigoIngresado que ya está normalizado
                fecha: new Date().toISOString(),
                fechaTimestamp: Date.now()
            };

            await db.add('firmas_comunicados', firma);
            await db.addAuditoria('COMUNICADO_FIRMA', { 
                comunicadoId, 
                usuarioId: usuario.id,
                codigoPersonal: codigoIngresado
            });

            showNotification(`Firmado exitosamente como ${usuario.nombre}`, 'success');
            
            // Limpiar input
            codigoInput.value = '';

            // Recargar lista de firmas
            await this.mostrarFirmasComunicado(comunicadoId);
        } catch (error) {
            console.error('Error al firmar:', error);
            if (error.message && error.message.includes('unique')) {
                showNotification('Ya has firmado este comunicado', 'error');
            } else {
                showNotification('Error al firmar el comunicado', 'error');
            }
        }
    }

    /**
     * Format comunicado content with paragraphs
     */
    formatComunicadoContent(content) {
        if (!content) return '';
        
        // Dividir por saltos de línea y crear párrafos
        const paragraphs = content.split('\n').filter(p => p.trim());
        return paragraphs.map(p => {
            const trimmed = p.trim();
            // Si el párrafo parece ser un título (todo mayúsculas o empieza con números)
            if (trimmed.match(/^[A-ZÁÉÍÓÚÑ\s]+$/) || trimmed.match(/^ARTICULO|^ARTÍCULO/)) {
                return `<p class="comunicado-paragraph-title">${this.escapeHtml(trimmed)}</p>`;
            }
            // Si empieza con letra seguida de punto y paréntesis (lista)
            if (trimmed.match(/^[a-z]\)\./)) {
                return `<p class="comunicado-paragraph">${this.escapeHtml(trimmed)}</p>`;
            }
            return `<p class="comunicado-paragraph">${this.escapeHtml(trimmed)}</p>`;
        }).join('');
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
        await this.loadEmpleados();
        this.setupAdminTabs();
        this.setupEmpleadoForm();
    }

    /**
     * Setup admin tabs
     */
    setupAdminTabs() {
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Hide all tab contents
                document.querySelectorAll('.admin-tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                // Show selected tab content
                const content = document.getElementById(`admin-tab-${tabName}`);
                if (content) {
                    content.style.display = 'block';
                    
                    if (tabName === 'empleados') {
                        this.loadEmpleados();
                    }
                }
            });
        });
    }

    /**
     * Setup empleado form
     */
    async setupEmpleadoForm() {
        const btnNuevoEmpleado = document.getElementById('btn-nuevo-empleado');
        if (btnNuevoEmpleado) {
            btnNuevoEmpleado.addEventListener('click', () => {
                this.abrirModalEmpleado();
            });
        }

        const btnGenerarCodigo = document.getElementById('btn-generar-codigo');
        if (btnGenerarCodigo) {
            btnGenerarCodigo.addEventListener('click', async () => {
                const codigoInput = document.getElementById('empleado-codigo-personal');
                if (codigoInput) {
                    try {
                        const codigo = await this.generarCodigoUnico();
                        codigoInput.value = codigo;
                    } catch (error) {
                        showNotification('Error al generar código', 'error');
                    }
                }
            });
        }

        const formEmpleado = document.getElementById('form-empleado');
        if (formEmpleado) {
            formEmpleado.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.crearEmpleado();
            });
        }
    }

    /**
     * Open empleado modal
     */
    async abrirModalEmpleado() {
        const modal = document.getElementById('modal-nuevo-empleado');
        if (!modal) return;

        // Load departments
        const deptSelect = document.getElementById('empleado-departamento');
        if (deptSelect) {
            const departamentos = await db.getAll('departamentos');
            deptSelect.innerHTML = '<option value="">Seleccione...</option>' +
                departamentos.map(d => `<option value="${d.codigo}">${d.nombre}</option>`).join('');
        }

        // Generate code automatically
        const codigoInput = document.getElementById('empleado-codigo-personal');
        if (codigoInput) {
            try {
                const codigo = await this.generarCodigoUnico();
                codigoInput.value = codigo;
            } catch (error) {
                showNotification('Error al generar código', 'error');
            }
        }

        modal.style.display = 'flex';
    }

    /**
     * Create empleado
     */
    async crearEmpleado() {
        try {
            const nombre = document.getElementById('empleado-nombre').value.trim();
            const email = document.getElementById('empleado-email').value.trim();
            const departamento = document.getElementById('empleado-departamento').value;
            const codigoPersonal = document.getElementById('empleado-codigo-personal').value.trim();

            if (!nombre || !email || !departamento || !codigoPersonal) {
                showNotification('Por favor complete todos los campos', 'error');
                return;
            }

            // Verificar que el email no exista (case-insensitive)
            const usuarios = await db.getAll('usuarios');
            const emailExiste = usuarios.some(u => u.email && u.email.toLowerCase() === email.toLowerCase());
            if (emailExiste) {
                showNotification('El email ya está registrado. Por favor use otro email.', 'error');
                return;
            }

            // Verificar que el código sea único
            const codigoExiste = usuarios.some(u => u.codigoPersonal && u.codigoPersonal === codigoPersonal);
            if (codigoExiste) {
                showNotification('El código personal ya está en uso. Por favor genere uno nuevo.', 'error');
                // Regenerar código automáticamente
                try {
                    const nuevoCodigo = await this.generarCodigoUnico();
                    document.getElementById('empleado-codigo-personal').value = nuevoCodigo;
                } catch (error) {
                    console.error('Error al regenerar código:', error);
                }
                return;
            }

            // Crear usuario/empleado
            const password = await auth.encryptPassword('temp123'); // Contraseña temporal
            const empleado = {
                email,
                password,
                nombre,
                departamento,
                codigoPersonal,
                rol: 'usuario',
                fechaRegistro: new Date().toISOString(),
                activo: true
            };

            try {
                await db.add('usuarios', empleado);
                await db.addAuditoria('EMPLEADO_CREATE', { email, nombre, codigoPersonal });

                showNotification(`Empleado ${nombre} creado exitosamente. Código: ${codigoPersonal}`, 'success');
            } catch (dbError) {
                if (dbError.name === 'ConstraintError' || dbError.message.includes('uniqueness')) {
                    showNotification('El email ya está registrado en la base de datos. Por favor use otro email.', 'error');
                    return;
                }
                throw dbError;
            }
            
            // Cerrar modal y limpiar form
            const modal = document.getElementById('modal-nuevo-empleado');
            if (modal) modal.style.display = 'none';
            document.getElementById('form-empleado').reset();

            // Recargar lista
            await this.loadEmpleados();
        } catch (error) {
            console.error('Error al crear empleado:', error);
            showNotification('Error al crear el empleado', 'error');
        }
    }

    /**
     * Load empleados list
     */
    async loadEmpleados() {
        const listaContainer = document.getElementById('empleados-list');
        if (!listaContainer) return;

        const usuarios = await db.getAll('usuarios');
        const empleados = usuarios.filter(u => u.codigoPersonal); // Solo empleados con código

        if (empleados.length === 0) {
            listaContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">👥</span>
                    <h3>No hay empleados registrados</h3>
                    <p>Agrega empleados para que puedan firmar comunicados.</p>
                    <button class="btn btn-primary" onclick="document.getElementById('btn-nuevo-empleado').click()">
                        Agregar Primer Empleado
                    </button>
                </div>
            `;
            return;
        }

        // Obtener departamentos para mostrar nombres
        const departamentos = await db.getAll('departamentos');
        const deptMap = new Map(departamentos.map(d => [d.codigo, d.nombre]));

        listaContainer.innerHTML = `
            <div style="display: grid; gap: 1rem;">
                ${empleados.map(empleado => {
                    const deptNombre = deptMap.get(empleado.departamento) || empleado.departamento;
                    return `
                        <div class="empleado-card" style="
                            padding: 1.5rem;
                            border: 1px solid var(--border-color);
                            border-radius: 8px;
                            background: #ffffff;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 0.5rem 0;">${this.escapeHtml(empleado.nombre)}</h4>
                                <div style="font-size: 0.875rem; color: #6b7280;">
                                    <div>📧 ${this.escapeHtml(empleado.email)}</div>
                                    <div>🏢 ${this.escapeHtml(deptNombre)}</div>
                                    <div style="margin-top: 0.5rem;">
                                        <strong>Código Personal:</strong> 
                                        <span style="
                                            display: inline-block;
                                            padding: 0.25rem 0.75rem;
                                            background: #f3f4f6;
                                            border-radius: 4px;
                                            font-family: monospace;
                                            font-weight: 600;
                                            letter-spacing: 2px;
                                            color: #1f2937;
                                        ">${this.escapeHtml(empleado.codigoPersonal)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style="
                                padding: 0.5rem 1rem;
                                border-radius: 6px;
                                font-weight: 600;
                                font-size: 0.875rem;
                                ${empleado.activo ? 'background: #10b981; color: #ffffff;' : 'background: #ef4444; color: #ffffff;'}
                            ">
                                ${empleado.activo ? 'ACTIVO' : 'INACTIVO'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
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
        
        // Si el modal no está abierto, abrirlo primero para renderizar el documento
        const modal = document.getElementById('modal-ver-comunicado');
        const documentoElement = document.getElementById('comunicado-documento');
        const wasModalOpen = modal && modal.style.display === 'flex' && documentoElement && documentoElement.innerHTML.trim();
        
        if (!wasModalOpen) {
            // Abrir el modal para renderizar el documento
            await this.showComunicadoDetalle(id);
            // Esperar a que se renderice completamente
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        showNotification('Generando PDF...', 'info');
        await this.exportSystem.exportComunicadoPDF(comunicado);
        showNotification('Comunicado exportado a PDF exitosamente', 'success');
        
        // Si el modal no estaba abierto antes, cerrarlo después de un momento
        if (!wasModalOpen && modal) {
            setTimeout(() => {
                modal.style.display = 'none';
            }, 1500);
        }
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

// Agregar método escapeHtml al prototipo de App
App.prototype.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

export default App;

