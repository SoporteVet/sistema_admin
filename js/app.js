// ============================================================
// APP.JS - Controlador Principal (Firebase Edition)
// Veterinaria San Martín de Porres
// ============================================================

class App {
    static currentView = 'dashboard';
    static isLoading = false;
    static _forcePasswordModal = false;
    /** Origen del detalle de ticket de sanciones: 'manager' | 'shared' */
    static _sanctionDetalleSource = 'manager';

    // Cache de departamentos fusionado (DEPARTAMENTOS estático + Firebase)
    static _depsMap = { ...DEPARTAMENTOS };
    static _depsLoaded = false;

    static async ensureDepsLoaded() {
        if (this._depsLoaded) return;
        try {
            const list = await DepartamentoManager.getAll();
            const map = {};
            list.forEach(dep => {
                const key = dep.id || dep.codigo;
                if (key) map[key] = dep;
            });
            this._depsMap = map;
            this._depsLoaded = true;
        } catch (e) {
            // Fallback al objeto estático
        }
    }

    static escapeHtml(value = '') {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static escapeJsString(value = '') {
        return String(value)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");
    }

    static init() {
        // Mostrar pantalla de carga mientras Firebase verifica el auth
        this.showLoading(true);

        AuthManager.initAuthListener(async (isAuthenticated) => {
            this.showLoading(false);
            if (isAuthenticated) {
                this.showApp();
            } else {
                this.showLogin();
            }
        });
    }

    // ========================================================
    // LOADING
    // ========================================================
    static showLoading(show) {
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    static showContentLoading() {
        const content = document.getElementById('contentArea');
        if (content) {
            content.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;padding:60px;">
                    <div style="text-align:center;">
                        <i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:var(--primary);margin-bottom:16px;"></i>
                        <p style="color:var(--text-secondary);">Cargando...</p>
                    </div>
                </div>
            `;
        }
    }

    static etiquetaEstadoSolicitud(estado) {
        if (estado === 'pendiente_ti') return 'En revisión TI';
        if (estado === 'pendiente_gerencia') return 'En Gerencia';
        if (estado === 'pendiente') return 'Pend. Encargado';
        return estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : '';
    }

    static claseCardEstadoSolicitud(estado) {
        if (estado === 'pendiente_ti' || estado === 'pendiente_gerencia') return 'pendiente';
        return estado || 'pendiente';
    }

    // ========================================================
    // LOGIN
    // ========================================================
    static showLogin() {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('appPage').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'none';
    }

    static showApp() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appPage').style.display = 'flex';
        document.getElementById('loadingScreen').style.display = 'none';
        this.updateSidebar();
        this.setupRealtimeNotifications();
        this.refreshSanctionSharedNavItem();
        this._depsLoaded = false;
        this.ensureDepsLoaded();
        this.navigate('dashboard');
    }

    static async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        const loginBtn = document.querySelector('.login-btn');

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Ingresando...';

        const result = await AuthManager.login(username, password);

        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:8px;"></i> Iniciar Sesión';

        if (result.success) {
            errorEl.classList.remove('show');
            this.showApp();
            Toast.success('Bienvenido', `Hola, ${result.user.nombre}!`);
            if (result.requirePasswordChange) {
                this.showChangePasswordModal(true);
            }
        } else {
            errorEl.textContent = result.message;
            errorEl.classList.add('show');
        }
    }

    static async handleLogout() {
        NotificationManager.stopListening();
        await AuthManager.logout();
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        this.showLogin();
    }

    static demoLogin(email, password) {
        const username = String(email || '').includes('@') ? String(email).split('@')[0] : String(email || '');
        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPassword').value = password;
    }

    // ========================================================
    // REALTIME NOTIFICATIONS LISTENER
    // ========================================================
    static setupRealtimeNotifications() {
        const user = AuthManager.getUser();
        if (!user) return;

        NotificationManager.listenForUser(user.id, (notifications, unreadCount) => {
            // Actualizar badge de notificaciones en tiempo real
            const badge = document.getElementById('notifCount');
            if (badge) {
                badge.textContent = unreadCount > 0 ? unreadCount : '';
                badge.dataset.count = unreadCount;
            }
            const sidebarBadge = document.getElementById('navNotifBadge');
            if (sidebarBadge) {
                sidebarBadge.textContent = unreadCount > 0 ? unreadCount : '';
                sidebarBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
            }
        });
    }

    // ========================================================
    // NAVIGATION
    // ========================================================
    static navigate(view, params = {}) {
        this.currentView = view;
        this.updateActiveNav(view);
        this.updatePageTitle(view);

        // Close sidebar on mobile
        document.querySelector('.sidebar')?.classList.remove('open');

        // Show loading then render
        this.showContentLoading();
        this.renderView(view, params);
    }

    static async renderView(view, params) {
        const contentArea = document.getElementById('contentArea');

        try {
            switch (view) {
                case 'dashboard': await this.renderDashboard(); break;
                case 'crear-documento': await this.renderCrearDocumento(); break;
                case 'documentos': await this.renderDocumentos(); break;
                case 'politicas-internas': await this.renderPoliticasInternas(); break;
                case 'expedientes-digitales': await this.renderExpedientesDigitales(); break;
                case 'expediente-empleado': await this.renderExpedienteEmpleado(params.userId); break;
                case 'evaluaciones-desempeno': await this.renderEvaluacionesDesempeno(params.tab); break;
                case 'evaluacion-nueva': await this.renderEvaluacionNueva(params.tipo); break;
                case 'evaluacion-detalle': await this.renderEvaluacionDetalle(params.id); break;
                case 'ver-documento': await this.renderVerDocumento(params.id); break;
                case 'solicitudes': await this.renderSolicitudes(); break;
                case 'nueva-solicitud': this.renderNuevaSolicitud(); break;
                case 'gestionar-solicitudes': await this.renderGestionarSolicitudes(); break;
                case 'estado-firmas': await this.renderEstadoFirmas(params.id); break;
                case 'usuarios': await this.renderUsuarios(); break;
                case 'departamentos': await this.renderDepartamentos(); break;
                case 'seguimiento-sanciones': await this.renderSeguimientoSanciones(); break;
                case 'seguimiento-compartidos': await this.renderSeguimientoCompartidos(); break;
                case 'seguimiento-sanciones-detalle': await this.renderSeguimientoSancionesDetalle(params.id); break;
                default: await this.renderDashboard();
            }
            contentArea.className = 'content-area fade-in';
        } catch (error) {
            console.error('Error renderizando vista:', error);
            contentArea.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="color:var(--danger);"></i>
                    <h3>Error al cargar</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="App.navigate('dashboard')">Ir al Dashboard</button>
                </div>
            `;
        }
    }

    static updateActiveNav(view) {
        let navView = view;
        if (view === 'seguimiento-sanciones-detalle') {
            navView = App._sanctionDetalleSource === 'shared' ? 'seguimiento-compartidos' : 'seguimiento-sanciones';
        }
        if (view === 'expediente-empleado') {
            navView = 'expedientes-digitales';
        }
        if (view === 'evaluacion-nueva' || view === 'evaluacion-detalle') {
            navView = 'evaluaciones-desempeno';
        }
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === navView);
        });
    }

    static updatePageTitle(view) {
        const titles = {
            'dashboard': { title: 'Dashboard', desc: 'Panel de control general' },
            'crear-documento': { title: 'Crear Documento', desc: 'Nuevo comunicado oficial' },
            'documentos': { title: 'Documentos', desc: 'Gestión de documentos por departamento' },
            'politicas-internas': { title: 'Biblioteca / Políticas internas', desc: 'PDFs corporativos para consulta y descarga' },
            'expedientes-digitales': { title: 'Expediente digital', desc: 'Currículum, avisos y registro por usuario (solo administración)' },
            'expediente-empleado': { title: 'Expediente del usuario', desc: 'Documentación y registros asociados a la persona' },
            'evaluaciones-desempeno': { title: 'Evaluaciones de desempeño', desc: 'Calificaciones semestrales del personal y jefaturas' },
            'evaluacion-nueva': { title: 'Nueva evaluación', desc: 'Formulario de desempeño semestral' },
            'evaluacion-detalle': { title: 'Detalle de evaluación', desc: 'Resultado y desglose por sección' },
            'ver-documento': { title: 'Ver Documento', desc: 'Detalle del documento' },
            'solicitudes': { title: 'Mis Solicitudes', desc: 'Vacaciones y permisos' },
            'nueva-solicitud': { title: 'Nueva Solicitud', desc: 'Solicitar vacaciones o permisos' },
            'gestionar-solicitudes': { title: 'Gestionar Solicitudes', desc: 'Aprobar o rechazar solicitudes' },
            'estado-firmas': { title: 'Estado de Firmas', desc: 'Ver quién ha firmado y quién no' },
            'usuarios': { title: 'Usuarios', desc: 'Administración de usuarios' },
            'departamentos': { title: 'Departamentos', desc: 'Gestión de departamentos' },
            'seguimiento-sanciones': { title: 'Quejas y sanciones', desc: 'Flujo: Encargado → TI → RRHH → Gerencia' },
            'seguimiento-compartidos': { title: 'Seguimientos compartidos conmigo', desc: 'Casos donde tiene permiso de lectura' },
            'seguimiento-sanciones-detalle': { title: 'Detalle del seguimiento', desc: 'Texto del caso y etapas del flujo' }
        };
        const info = titles[view] || titles['dashboard'];
        document.getElementById('pageTitle').textContent = info.title;
        document.getElementById('pageDesc').textContent = info.desc;
    }

    // ========================================================
    // SIDEBAR
    // ========================================================
    static updateSidebar() {
        const user = AuthManager.getUser();
        if (!user) return;

        const initials = (user.nombre[0] + user.apellido[0]).toUpperCase();
        document.getElementById('sidebarUserAvatar').textContent = initials;
        document.getElementById('sidebarUserName').textContent = user.nombre + ' ' + user.apellido;
        document.getElementById('sidebarUserRole').textContent = ROLES[user.rol]?.nombre || user.rol;

        document.querySelectorAll('.nav-item[data-role]').forEach(item => {
            if (item.id === 'navSeguimientoCompartidos') return;
            const roles = item.dataset.role.split(',');
            const show = roles.includes(user.rol) || roles.includes('all') || user.rol === 'admin';
            item.style.display = show ? 'flex' : 'none';
        });
        this.refreshSanctionSharedNavItem();
    }

    static async refreshSanctionSharedNavItem() {
        const nav = document.getElementById('navSeguimientoCompartidos');
        const badge = document.getElementById('navSanctionSharedBadge');
        if (!nav || typeof SanctionFollowupManager === 'undefined') return;
        try {
            const list = await SanctionFollowupManager.listSharedWithMe();
            const pend = list.filter((t) => App._sanctionTicketAbierto(t)).length;
            if (list.length > 0) {
                nav.style.display = 'flex';
                if (badge) {
                    badge.textContent = pend > 0 ? String(pend) : '';
                    badge.style.display = pend > 0 ? 'inline' : 'none';
                }
            } else {
                nav.style.display = 'none';
                if (badge) badge.style.display = 'none';
            }
        } catch (e) {
            nav.style.display = 'none';
            if (badge) badge.style.display = 'none';
        }
    }

    static toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('open');
    }

    // ========================================================
    // DASHBOARD
    // ========================================================
    static async renderDashboard() {
        const user = AuthManager.getUser();
        const managedDeps = AuthManager.getDepartamentosEncargado(user);
        const myDocsNested = await Promise.all(managedDeps.map(d => DocumentManager.getByDepartment(d)));
        const myDocsMerged = new Map();
        myDocsNested.flat().forEach(d => myDocsMerged.set(d.id, d));
        const myDocs = Array.from(myDocsMerged.values());
        const deptStatLabel = (AuthManager.isEncargado() && managedDeps.length > 1)
            ? 'Docs. Mis áreas'
            : 'Docs. Mi Departamento';

        /** Admin y encargados: métricas globales de gestión; empleados: solo sus propias solicitudes en las dos últimas tarjetas. */
        const isMgrDashboard = AuthManager.isEncargado();

        let pendingReqs = [];
        let myAllReqs = [];
        if (isMgrDashboard) {
            pendingReqs = await RequestManager.getPendingActionsForUser(user);
        } else {
            myAllReqs = await RequestManager.getByUser(user.id);
            pendingReqs = myAllReqs.filter(r => RequestManager.isEstadoPendienteEmpleado(r.estado));
        }

        const [docStats, reqStats, sharedSanctions] = await Promise.all([
            DocumentManager.getStats(),
            isMgrDashboard ? RequestManager.getStats() : Promise.resolve({ aprobadas: 0 }),
            typeof SanctionFollowupManager !== 'undefined'
                ? SanctionFollowupManager.listSharedWithMe()
                : Promise.resolve([])
        ]);

        const stat3Num = isMgrDashboard ? pendingReqs.length : myAllReqs.length;
        const stat3Label = isMgrDashboard ? 'Solicitudes Pendientes' : 'Mis solicitudes';
        const stat4Num = isMgrDashboard
            ? reqStats.aprobadas
            : myAllReqs.filter(r => r.estado === 'aprobada').length;
        const stat4Label = isMgrDashboard ? 'Solicitudes Aprobadas' : 'Mis solicitudes aprobadas';

        const content = document.getElementById('contentArea');
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--gradient-primary);"><i class="fas fa-file-alt"></i></div>
                    <div class="stat-info">
                        <h3>${docStats.total}</h3>
                        <p>Documentos Totales</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--gradient-secondary);"><i class="fas fa-building"></i></div>
                    <div class="stat-info">
                        <h3>${myDocs.filter(d => d.estado === 'activo').length}</h3>
                        <p>${deptStatLabel}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--gradient-accent);"><i class="fas fa-clock"></i></div>
                    <div class="stat-info">
                        <h3>${stat3Num}</h3>
                        <p>${stat3Label}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--gradient-success);"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-info">
                        <h3>${stat4Num}</h3>
                        <p>${stat4Label}</p>
                    </div>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-file-alt" style="margin-right:8px;color:var(--primary);"></i>Documentos Recientes</h3>
                        <button class="btn btn-sm btn-outline" onclick="App.navigate('documentos')">Ver todos</button>
                    </div>
                    <div class="card-body no-padding">
                        ${docStats.recientes.length > 0 ? `
                            <div class="doc-list" style="padding:12px;">
                                ${docStats.recientes.map(doc => {
                                    const dep = App._depsMap[doc.departamento] || DEPARTAMENTOS[doc.departamento];
                                    return `
                                    <div class="doc-item" onclick="App.navigate('ver-documento', {id:'${doc.id}'})">
                                        <div class="doc-icon" style="background:${dep?.color || '#546e7a'};"><i class="${dep?.icono || 'fas fa-file'}"></i></div>
                                        <div class="doc-info">
                                            <h4>${doc.titulo}</h4>
                                            <div class="doc-meta">
                                                <span>${doc.tipoNombre}</span>
                                                <span>•</span>
                                                <span>${timeAgo(doc.fechaCreacion)}</span>
                                            </div>
                                        </div>
                                        <span class="doc-code">${doc.codigo}</span>
                                    </div>`;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-file-alt"></i>
                                <h3>No hay documentos</h3>
                                <p>${isMgrDashboard ? 'Crea tu primer documento' : 'No hay documentos recientes para mostrar'}</p>
                                ${isMgrDashboard ? `<button type="button" class="btn btn-primary" onclick="App.navigate('crear-documento')">Crear documento</button>` : ''}
                            </div>
                        `}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-bell" style="margin-right:8px;color:var(--warning);"></i>Solicitudes Pendientes</h3>
                        ${AuthManager.isEncargado() ? `<button type="button" class="btn btn-sm btn-outline" onclick="App.navigate('gestionar-solicitudes')">Ver todas</button>` : ''}
                    </div>
                    <div class="card-body no-padding">
                        ${pendingReqs.length > 0 ? `
                            <div style="padding:12px;">
                                ${pendingReqs.slice(0, 5).map(req => `
                                    <div class="request-card status-pendiente" style="cursor:pointer;" onclick="App.navigate('${AuthManager.isEncargado() ? 'gestionar-solicitudes' : 'solicitudes'}')">
                                        <div class="request-header">
                                            <h4>${req.tipoNombre}</h4>
                                            <span class="status-badge pendiente"><i class="fas fa-clock"></i> ${App.etiquetaEstadoSolicitud(req.estado)}</span>
                                        </div>
                                        <div style="font-size:0.82rem;color:var(--text-secondary);">
                                            <span>${req.solicitanteNombre}</span> • <span>${timeAgo(req.fechaSolicitud)}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-check-circle"></i>
                                <h3>Sin pendientes</h3>
                                <p>No hay solicitudes pendientes</p>
                            </div>
                        `}
                    </div>
                </div>

                ${sharedSanctions && sharedSanctions.length > 0 ? `
                <div class="card" style="grid-column: 1 / -1;">
                    <div class="card-header">
                        <h3><i class="fas fa-user-shield" style="margin-right:8px;color:var(--primary);"></i>Seguimientos compartidos con usted</h3>
                        <button class="btn btn-sm btn-outline" onclick="App.navigate('seguimiento-compartidos')">Ver todos</button>
                    </div>
                    <div class="card-body no-padding">
                        <div style="padding:12px;">
                            ${sharedSanctions.slice(0, 5).map((t) => {
                                const pend = App._sanctionTicketAbierto(t);
                                const idJs = App.escapeJsString(t.id);
                                return `
                                <div class="request-card ${pend ? 'status-pendiente' : ''}" style="cursor:pointer;margin-bottom:8px;" onclick="App.openSanctionDetalle('${idJs}','shared')">
                                    <div class="request-header">
                                        <h4>${App.escapeHtml(t.titulo || 'Sin título')}</h4>
                                        <span class="status-badge ${pend ? 'pendiente' : 'aprobada'}"><i class="fas fa-${pend ? 'clock' : 'check'}"></i> ${App.escapeHtml(SanctionFollowupManager.ticketTieneFlujoEtapa(t) ? SanctionFollowupManager.etiquetaFlujo(t.flujoEtapa) : SanctionFollowupManager.etiquetaEstado(t.estado))}</span>
                                    </div>
                                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:6px;">Por ${App.escapeHtml(t.creadoPorNombre || '')} · ${formatDateTime(t.fechaCreacion)}</p>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    // ========================================================
    // CREAR DOCUMENTO
    // ========================================================
    static async renderCrearDocumento() {
        const user = AuthManager.getUser();
        const content = document.getElementById('contentArea');

        await this.ensureDepsLoaded();

        let depsHtml = '';
        let depsParaHtml = '';
        if (AuthManager.isAdmin()) {
            Object.keys(App._depsMap).forEach(key => {
                const dep = App._depsMap[key];
                depsHtml += `<option value="${key}">${dep.nombre} (${dep.codigo || key})</option>`;
                depsParaHtml += `<option value="${key}">${dep.nombre}</option>`;
            });
        } else if (AuthManager.isEncargado()) {
            const codes = AuthManager.getDepartamentosEncargado(user);
            codes.forEach(key => {
                const dep = App._depsMap[key];
                if (dep) {
                    depsHtml += `<option value="${key}">${dep.nombre} (${dep.codigo || key})</option>`;
                    depsParaHtml += `<option value="${key}">${dep.nombre}</option>`;
                }
            });
            if (codes.length >= 2 && typeof DOC_PARA_ENCARGADO_TODAS_AREAS !== 'undefined') {
                depsParaHtml += `<option value="${DOC_PARA_ENCARGADO_TODAS_AREAS}">Empleados de todas mis áreas (recepción, consulta, etc.)</option>`;
            }
        } else {
            const dep = App._depsMap[user.departamento];
            if (dep) {
                depsHtml = `<option value="${user.departamento}">${dep.nombre} (${dep.codigo || user.departamento})</option>`;
                depsParaHtml = `<option value="${user.departamento}">${dep.nombre}</option>`;
            }
        }

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-plus-circle" style="margin-right:8px;color:var(--primary);"></i>Crear Nuevo Documento</h3>
                </div>
                <div class="card-body">
                    <form id="docForm" onsubmit="App.handleCreateDocument(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Departamento <span class="required">*</span></label>
                                <select class="form-control" id="docDepartamento" onchange="App.updateCategorias()" required>
                                    <option value="">Seleccionar departamento...</option>
                                    ${depsHtml}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Categoría <span class="required">*</span></label>
                                <select class="form-control" id="docCategoria" onchange="App.updateSubcategorias()" required disabled>
                                    <option value="">Seleccionar categoría...</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tipo de Documento <span class="required">*</span></label>
                                <select class="form-control" id="docSubcategoria" required disabled>
                                    <option value="">Seleccionar tipo...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Título del Documento <span class="required">*</span></label>
                                <input type="text" class="form-control" id="docTitulo" placeholder="Ej: Comunicado sobre nuevas políticas..." required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Para <span class="required">*</span></label>
                                <select class="form-control" id="docPara" onchange="App.updateFirmantes()" required>
                                    <option value="">Seleccionar destinatario...</option>
                                    <option value="TODOS">Todos los empleados</option>
                                    ${depsParaHtml}
                                </select>
                                <small style="color:var(--text-light);margin-top:4px;display:block;">${AuthManager.isEncargado() ? 'Elija un departamento o “todas mis áreas” para listar empleados y sus permisos de firma.' : 'Seleccione el departamento destinatario; esto filtrará los firmantes requeridos.'}</small>
                            </div>
                            <div class="form-group">
                                <label>De <span class="required">*</span></label>
                                <input type="text" class="form-control" id="docDe" placeholder="Nombre del remitente..." value="${user.nombre} ${user.apellido}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Asunto <span class="required">*</span></label>
                            <input type="text" class="form-control" id="docAsunto" placeholder="Ej: Nuevas políticas de trabajo..." required>
                        </div>
                        <div class="form-group">
                            <label>Firmantes Requeridos <span class="required">*</span></label>
                            <p class="form-help" style="margin-bottom:8px;">Seleccione los usuarios que deben firmar este documento. El documento aparecerá en la lista de documentos de los usuarios seleccionados.</p>
                            <div id="firmantesContainer" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
                                <i class="fas fa-spinner fa-spin"></i> Cargando firmantes...
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Contenido del Documento <span class="required">*</span></label>
                            <div class="editor-container">
                                <div class="editor-toolbar">
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('bold')" title="Negrita"><i class="fas fa-bold"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('italic')" title="Cursiva"><i class="fas fa-italic"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('underline')" title="Subrayado"><i class="fas fa-underline"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('strikeThrough')" title="Tachado"><i class="fas fa-strikethrough"></i></button>
                                    <div class="separator"></div>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('justifyLeft')" title="Alinear izquierda"><i class="fas fa-align-left"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('justifyCenter')" title="Centrar"><i class="fas fa-align-center"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('justifyRight')" title="Alinear derecha"><i class="fas fa-align-right"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('justifyFull')" title="Justificar"><i class="fas fa-align-justify"></i></button>
                                    <div class="separator"></div>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('insertUnorderedList')" title="Lista"><i class="fas fa-list-ul"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('insertOrderedList')" title="Lista numerada"><i class="fas fa-list-ol"></i></button>
                                    <div class="separator"></div>
                                    <select class="toolbar-select" onchange="App.execCmdVal('fontSize', this.value)" title="Tamaño">
                                        <option value="">Tamaño</option>
                                        <option value="1">Pequeño</option>
                                        <option value="3">Normal</option>
                                        <option value="5">Grande</option>
                                        <option value="7">Muy Grande</option>
                                    </select>
                                    <select class="toolbar-select" onchange="App.execCmdVal('formatBlock', this.value)" title="Formato">
                                        <option value="">Formato</option>
                                        <option value="h1">Título 1</option>
                                        <option value="h2">Título 2</option>
                                        <option value="h3">Título 3</option>
                                        <option value="p">Párrafo</option>
                                    </select>
                                    <div class="separator"></div>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('removeFormat')" title="Limpiar formato"><i class="fas fa-eraser"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('undo')" title="Deshacer"><i class="fas fa-undo"></i></button>
                                    <button type="button" class="toolbar-btn" onclick="App.execCmd('redo')" title="Rehacer"><i class="fas fa-redo"></i></button>
                                </div>
                                <div class="editor-content" id="docEditor" contenteditable="true" data-placeholder="Escriba el contenido del documento aquí..."></div>
                            </div>
                        </div>
                        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
                            <button type="button" class="btn btn-outline" onclick="App.previewDocument()"><i class="fas fa-eye"></i> Vista Previa</button>
                            <button type="submit" class="btn btn-primary btn-lg" id="btnCrearDoc"><i class="fas fa-save"></i> Crear Documento</button>
                        </div>
                        <div style="margin-top:12px;padding:12px;background:var(--bg-main);border-radius:var(--radius-sm);border-left:3px solid var(--primary);">
                            <p style="font-size:0.85rem;color:var(--text-secondary);margin:0;">
                                <i class="fas fa-info-circle" style="margin-right:6px;color:var(--primary);"></i>
                                Después de crear el documento, podrás generar un PDF desde la vista del documento.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Cargar firmantes automáticamente
        this.updateFirmantes();
    }

    static execCmd(cmd) {
        document.execCommand(cmd, false, null);
        document.getElementById('docEditor').focus();
    }

    static execCmdVal(cmd, val) {
        if (val) {
            document.execCommand(cmd, false, val);
            document.getElementById('docEditor').focus();
        }
    }

    static updateCategorias() {
        const depId = document.getElementById('docDepartamento').value;
        const catSelect = document.getElementById('docCategoria');
        const subSelect = document.getElementById('docSubcategoria');

        catSelect.innerHTML = '<option value="">Seleccionar categoría...</option>';
        subSelect.innerHTML = '<option value="">Seleccionar tipo...</option>';
        catSelect.disabled = true;
        subSelect.disabled = true;

        if (depId && App._depsMap[depId]) {
            const dep = App._depsMap[depId];
            Object.keys(dep.categorias || {}).forEach(key => {
                catSelect.innerHTML += `<option value="${key}">${key}. ${dep.categorias[key].nombre}</option>`;
            });
            catSelect.disabled = false;
        }
    }

    static updateSubcategorias() {
        const depId = document.getElementById('docDepartamento').value;
        const catId = document.getElementById('docCategoria').value;
        const subSelect = document.getElementById('docSubcategoria');

        subSelect.innerHTML = '<option value="">Seleccionar tipo...</option>';
        subSelect.disabled = true;

        if (depId && catId && App._depsMap[depId]) {
            const cat = (App._depsMap[depId].categorias || {})[catId];
            if (cat) {
                Object.keys(cat.subcategorias).forEach(key => {
                    subSelect.innerHTML += `<option value="${key}">${key}. ${cat.subcategorias[key]}</option>`;
                });
                subSelect.disabled = false;
            }
        }
    }

    static async updateFirmantes() {
        const container = document.getElementById('firmantesContainer');
        const paraSelect = document.getElementById('docPara');
        if (!container) return;
        
        container.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando firmantes...';

        const users = await AuthManager.getAllUsers();
        const currentUser = AuthManager.getUser();
        const paraValue = paraSelect?.value || '';

        const baseAvailable = users.filter(u => u.activo && u.id !== currentUser.id);
        let available = baseAvailable;

        if (paraValue === 'TODOS') {
            // Si "Para" es TODOS, mostrar todos los empleados como firmantes requeridos.
            available = baseAvailable.filter(u => u.rol === 'empleado');
        } else if (typeof DOC_PARA_ENCARGADO_TODAS_AREAS !== 'undefined' && paraValue === DOC_PARA_ENCARGADO_TODAS_AREAS) {
            const deps = AuthManager.getDepartamentosEncargado(currentUser);
            available = baseAvailable.filter(u => deps.includes(u.departamento));
        } else if (paraValue) {
            available = baseAvailable.filter(u => u.departamento === paraValue);
        }

        if (available.length === 0) {
            container.innerHTML = '<p class="form-help">No hay usuarios disponibles para firmar con el destinatario seleccionado</p>';
            return;
        }

        // Agrupar por departamento para mejor organización
        const usersByDep = {};
        available.forEach(u => {
            const dep = App._depsMap[u.departamento] || DEPARTAMENTOS[u.departamento];
            const depName = dep ? dep.nombre : 'Sin departamento';
            if (!usersByDep[depName]) usersByDep[depName] = [];
            usersByDep[depName].push(u);
        });

        let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
        Object.keys(usersByDep).sort().forEach(depName => {
            html += `<div style="margin-bottom:8px;"><strong style="font-size:0.85rem;color:var(--text-secondary);display:block;margin-bottom:6px;">${depName}</strong><div style="display:flex;flex-wrap:wrap;gap:8px;">`;
            usersByDep[depName].forEach(u => {
                const dep = App._depsMap[u.departamento] || DEPARTAMENTOS[u.departamento];
                html += `
                    <label style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid var(--border);border-radius:20px;cursor:pointer;font-size:0.82rem;transition:var(--transition);background:white;">
                        <input type="checkbox" class="firmante-check" value="${u.id}">
                        <span>${u.nombre} ${u.apellido}</span>
                        <small style="color:var(--text-light);">(${ROLES[u.rol]?.nombre})</small>
                    </label>
                `;
            });
            html += '</div></div>';
        });
        html += '</div>';

        container.innerHTML = html;
    }

    static async handleCreateDocument(e) {
        e.preventDefault();

        const depId = document.getElementById('docDepartamento').value;
        const catId = document.getElementById('docCategoria').value;
        const subId = document.getElementById('docSubcategoria').value;
        const titulo = document.getElementById('docTitulo').value;
        const para = document.getElementById('docPara').value;
        const de = document.getElementById('docDe').value;
        const asunto = document.getElementById('docAsunto').value;
        const contenido = document.getElementById('docEditor').innerHTML;

        if (!depId || !catId || !subId || !titulo || !para || !de || !asunto || !contenido.trim() || contenido === '<br>') {
            Toast.error('Error', 'Por favor complete todos los campos requeridos');
            return;
        }

        const dep = App._depsMap[depId] || DEPARTAMENTOS[depId];
        const cat = (dep?.categorias || {})[catId];
        const tipoNombre = cat?.subcategorias?.[subId];

        const firmasRequeridas = [];
        document.querySelectorAll('.firmante-check:checked').forEach(cb => {
            firmasRequeridas.push(cb.value);
        });

        if (firmasRequeridas.length === 0) {
            Toast.error('Error', 'Debe seleccionar al menos un firmante requerido');
            return;
        }

        const btn = document.getElementById('btnCrearDoc');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        try {
            const doc = await DocumentManager.create({
                departamento: depId,
                categoria: catId,
                subcategoria: subId,
                tipoNombre: tipoNombre,
                titulo: titulo,
                para: para,
                de: de,
                asunto: asunto,
                contenido: contenido,
                firmasRequeridas: firmasRequeridas
            });

            Toast.success('Documento creado', `Código: ${doc.codigo}`);
            this.navigate('ver-documento', { id: doc.id });
        } catch (error) {
            Toast.error('Error', 'No se pudo crear el documento');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Crear Documento';
        }
    }

    static previewDocument() {
        const titulo = document.getElementById('docTitulo').value || 'Sin título';
        const contenido = document.getElementById('docEditor').innerHTML;
        const depId = document.getElementById('docDepartamento').value;
        const subId = document.getElementById('docSubcategoria').value;
        const dep = App._depsMap[depId] || DEPARTAMENTOS[depId];
        const previewCode = depId && subId ? `${depId}-${subId}-XXX` : 'Código pendiente';

        this.showModal('Vista Previa del Documento', `
            <div class="doc-preview" style="box-shadow:none;">
                <div class="doc-preview-header" style="background:${dep?.color || 'var(--primary)'};">
                    <p style="font-size:0.85rem;opacity:0.8;">${dep?.nombre || 'Departamento'}</p>
                    <h2>${titulo}</h2>
                    <span class="doc-preview-code">${previewCode}</span>
                </div>
                <div class="doc-preview-body">${contenido || '<p style="color:var(--text-light)">Sin contenido</p>'}</div>
                <div class="doc-preview-footer" style="text-align:center;">
                    <p style="font-size:0.82rem;color:var(--text-secondary);"><i class="fas fa-signature" style="margin-right:6px;"></i>Área de firmas digitales</p>
                </div>
            </div>
        `, true);
    }

    // ========================================================
    // DOCUMENTOS (LISTA)
    // ========================================================
    static async renderDocumentos() {
        const allDocs = await DocumentManager.getAll();
        const user = AuthManager.getUser();
        
        // Filtrar documentos: mostrar solo los que requieren la firma del usuario (o todos si es admin)
        let filteredDocs = allDocs.filter(d => d.estado === 'activo');
        
        if (!AuthManager.isAdmin()) {
            // Los usuarios solo ven documentos donde están en firmasRequeridas o que ellos crearon
            filteredDocs = filteredDocs.filter(d => {
                const firmasRequeridas = d.firmasRequeridas || [];
                return firmasRequeridas.includes(user.id) || d.creadoPor === user.id;
            });
        }

        await this.ensureDepsLoaded();
        
        const content = document.getElementById('contentArea');

        let depFilterHtml = '<option value="">Todos los departamentos</option>';
        Object.keys(App._depsMap).forEach(key => {
            depFilterHtml += `<option value="${key}">${App._depsMap[key].nombre}</option>`;
        });

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-folder-open" style="margin-right:8px;color:var(--primary);"></i>Documentos</h3>
                    ${AuthManager.hasPermission('crear_documento') ? `
                        <button class="btn btn-primary btn-sm" onclick="App.navigate('crear-documento')"><i class="fas fa-plus"></i> Nuevo</button>
                    ` : ''}
                </div>
                <div class="card-body">
                    <div class="filters-bar">
                        <div class="search-input">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar documentos..." id="docSearchInput" oninput="App.filterDocuments()">
                        </div>
                        <select class="filter-select" id="docDepFilter" onchange="App.filterDocuments()">
                            ${depFilterHtml}
                        </select>
                    </div>
                    <div id="docListContainer">${this.renderDocList(filteredDocs)}</div>
                </div>
            </div>
        `;

        // Store docs for filtering (todos los documentos para admins, filtrados para usuarios)
        this._cachedDocs = filteredDocs;
    }

    // ========================================================
    // BIBLIOTECA / POLÍTICAS INTERNAS (PDF en RTDB, Base64)
    // ========================================================
    static _cachedPoliticas = [];
    static _cachedExpedientesUsers = [];

    static renderPoliticasInternasListHtml(politicas, isAdmin) {
        if (!politicas || politicas.length === 0) {
            return `<div class="empty-state"><i class="fas fa-filter"></i><h3>Sin resultados</h3><p>No hay políticas que coincidan con el filtro o la búsqueda.</p></div>`;
        }
        return `<div class="doc-list">
            ${politicas.map((p) => {
                const escTitulo = App.escapeHtml(p.titulo);
                const escDesc = p.descripcion ? `<p style="margin:4px 0 0;font-size:0.85rem;color:var(--text-secondary);">${App.escapeHtml(p.descripcion)}</p>` : '';
                const meta = `${App.escapeHtml(p.creadoPorNombre || '')} · ${formatDate(p.fechaCreacion)} · ${PoliticaInternaManager.formatBytes(p.tamañoBytes)}`;
                const nameEsc = App.escapeJsString(p.nombreArchivo || 'politica.pdf');
                const idEsc = App.escapeJsString(p.id);
                return `
                    <div class="doc-item" style="align-items:flex-start;">
                        <div class="doc-icon" style="background:#b71c1c;"><i class="fas fa-file-pdf"></i></div>
                        <div class="doc-info" style="flex:1;">
                            <h4>${escTitulo}</h4>
                            ${escDesc}
                            <div class="doc-meta" style="margin-top:6px;">
                                <span>${meta}</span>
                            </div>
                            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">
                                <button type="button" class="btn btn-sm btn-primary" onclick="App.abrirPoliticaPdf('${idEsc}')"><i class="fas fa-eye" style="margin-right:4px;"></i>Ver PDF</button>
                                <button type="button" class="btn btn-sm btn-outline" onclick="App.descargarPoliticaPdf('${idEsc}', '${nameEsc}')"><i class="fas fa-download" style="margin-right:4px;"></i>Descargar</button>
                                ${isAdmin ? `<button type="button" class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="App.eliminarPoliticaInterna('${idEsc}')"><i class="fas fa-trash-alt" style="margin-right:4px;"></i>Eliminar</button>` : ''}
                            </div>
                        </div>
                    </div>`;
            }).join('')}
        </div>`;
    }

    static filterPoliticasInternas() {
        const q = (document.getElementById('politicaSearchInput')?.value || '').toLowerCase().trim();
        const sort = document.getElementById('politicaSortSelect')?.value || 'fecha_desc';
        let items = [...(App._cachedPoliticas || [])];

        if (q) {
            items = items.filter((p) => {
                const hay = (s) => String(s || '').toLowerCase().includes(q);
                return hay(p.titulo) || hay(p.descripcion) || hay(p.nombreArchivo) || hay(p.creadoPorNombre);
            });
        }

        items.sort((a, b) => {
            if (sort === 'fecha_asc') return new Date(a.fechaCreacion) - new Date(b.fechaCreacion);
            if (sort === 'titulo_az') return String(a.titulo || '').localeCompare(String(b.titulo || ''), 'es', { sensitivity: 'base' });
            return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
        });

        const container = document.getElementById('politicasListContainer');
        if (!container) return;
        container.innerHTML = App.renderPoliticasInternasListHtml(items, AuthManager.isAdmin());
    }

    static async renderPoliticasInternas() {
        const content = document.getElementById('contentArea');
        const list = typeof PoliticaInternaManager !== 'undefined'
            ? await PoliticaInternaManager.getAll()
            : [];
        const isAdmin = AuthManager.isAdmin();
        this._cachedPoliticas = list;

        const introPoliticas = isAdmin
            ? `<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px;">
                        A continuación, va a poder leer, descargar las políticas internas de la empresa.
                    </p>`
            : `<p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px;">
                        Aquí puede <strong>consultar y descargar</strong> las políticas internas en PDF.
                        La publicación y eliminación de documentos la realizan únicamente los <strong>administradores</strong>.
                    </p>`;

        const uploadBlock = isAdmin ? `
            <div class="card" style="margin-bottom:20px;">
                <div class="card-header">
                    <h3 style="font-size:1rem;"><i class="fas fa-cloud-upload-alt" style="margin-right:8px;color:var(--primary);"></i>Publicar política (PDF)</h3>
                </div>
                <div class="card-body">
                    <form id="formPoliticaInterna" onsubmit="App.handlePoliticaUpload(event)">
                        <div style="display:grid;gap:14px;max-width:640px;">
                            <div class="form-group">
                                <label>Título <span style="color:var(--danger);">*</span></label>
                                <input type="text" id="politicaTitulo" class="form-control" required maxlength="300" placeholder="Ej. Política de uso de correo electrónico">
                            </div>
                            <div class="form-group">
                                <label>Descripción (opcional)</label>
                                <input type="text" id="politicaDesc" class="form-control" maxlength="2000" placeholder="Breve resumen para la lista">
                            </div>
                            <div class="form-group">
                                <label>Archivo PDF <span style="color:var(--danger);">*</span></label>
                                <input type="file" id="politicaFile" accept=".pdf,application/pdf" required>
                                <p style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px;">Máximo 4 MB por archivo (se guarda en la base de datos). Solo PDF.</p>
                            </div>
                            <div>
                                <button type="submit" class="btn btn-primary" id="btnPoliticaSubmit"><i class="fas fa-upload" style="margin-right:6px;"></i>Subir y publicar</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        ` : '';

        const listBody = list.length === 0
            ? `<div class="empty-state"><i class="fas fa-file-pdf"></i><h3>Sin documentos en la biblioteca</h3><p>${isAdmin ? 'Publique el primer PDF usando el formulario superior.' : 'Cuando se publiquen políticas, aparecerán aquí.'}</p></div>`
            : `
                    <div class="filters-bar">
                        <div class="search-input">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar por título, descripción, nombre de archivo o quien publicó…" id="politicaSearchInput" oninput="App.filterPoliticasInternas()">
                        </div>
                        <select class="filter-select" id="politicaSortSelect" onchange="App.filterPoliticasInternas()">
                            <option value="fecha_desc">Más recientes primero</option>
                            <option value="fecha_asc">Más antiguos primero</option>
                            <option value="titulo_az">Título (A–Z)</option>
                        </select>
                    </div>
                    <div id="politicasListContainer">${this.renderPoliticasInternasListHtml(list, isAdmin)}</div>
            `;

        content.innerHTML = `
            ${uploadBlock}
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-book" style="margin-right:8px;color:var(--primary);"></i>Biblioteca — Políticas internas</h3>
                </div>
                <div class="card-body">
                    ${introPoliticas}
                    ${listBody}
                </div>
            </div>
        `;
    }

    // ========================================================
    // EXPEDIENTE DIGITAL (ADMIN)
    // ========================================================

    static etiquetaTipoRegistroExpediente(tipo) {
        const m = {
            aviso: 'Aviso al empleado',
            amonestacion: 'Amonestación',
            nota: 'Nota interna',
            otro: 'Otro'
        };
        return m[tipo] || tipo || '—';
    }

    static renderExpedientesDigitalesRows(users) {
        if (!users || users.length === 0) {
            return '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">No hay usuarios que coincidan con el filtro</td></tr>';
        }
        return users.map((u) => {
            const dep = App._depsMap[u.departamento]?.nombre || u.departamento || '—';
            const nome = App.escapeHtml(`${u.nombre || ''} ${u.apellido || ''}`.trim());
            const uidAttr = App.escapeHtml(u.id);
            const rolNombre = App.escapeHtml(ROLES[u.rol]?.nombre || u.rol || '—');
            const activo = u.activo
                ? '<span class="status-badge aprobada"><i class="fas fa-check"></i> Activo</span>'
                : '<span class="status-badge pendiente"><i class="fas fa-ban"></i> Inactivo</span>';
            return `<tr>
                <td><strong>${nome}</strong><div style="font-size:0.85rem;color:var(--text-secondary);">${App.escapeHtml(u.email || '')}</div></td>
                <td><span class="role-badge ${u.rol || ''}">${rolNombre}</span></td>
                <td>${App.escapeHtml(dep)}</td>
                <td>${activo}</td>
                <td><button type="button" class="btn btn-sm btn-primary" onclick="App.navigate('expediente-empleado', { userId: '${uidAttr}' })"><i class="fas fa-id-card"></i> Expediente</button></td>
            </tr>`;
        }).join('');
    }

    static filterExpedientesDigitales() {
        const q = (document.getElementById('expedSearchInput')?.value || '').trim().toLowerCase();
        const dep = document.getElementById('expedDepFilter')?.value || '';
        const base = App._cachedExpedientesUsers || [];
        let list = [...base];
        if (dep) list = list.filter((u) => u.departamento === dep);
        if (q) {
            list = list.filter((u) => {
                const rolTxt = (ROLES[u.rol]?.nombre || u.rol || '').toLowerCase();
                const hay = `${u.nombre || ''} ${u.apellido || ''} ${u.email || ''} ${u.departamento || ''} ${rolTxt}`.toLowerCase();
                return hay.includes(q);
            });
        }
        list.sort((a, b) => `${a.apellido || ''} ${a.nombre || ''}`.localeCompare(`${b.apellido || ''} ${b.nombre || ''}`, 'es'));
        const tb = document.getElementById('expedientesTableBody');
        if (tb) tb.innerHTML = App.renderExpedientesDigitalesRows(list);
    }

    static async renderExpedientesDigitales() {
        const content = document.getElementById('contentArea');
        if (!AuthManager.isAdmin()) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso denegado</h3><p>Solo administradores pueden ver expedientes digitales.</p></div>';
            return;
        }
        await this.ensureDepsLoaded();
        content.innerHTML = `
            <div class="card">
                <div class="card-header"><h3><i class="fas fa-id-card-alt" style="margin-right:8px;color:var(--primary);"></i>Expediente digital</h3></div>
                <div class="card-body" style="text-align:center;padding:40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i>
                    <p style="margin-top:16px;color:var(--text-secondary);">Cargando…</p>
                </div>
            </div>`;
        try {
            const users = await AuthManager.getAllUsers();
            this._cachedExpedientesUsers = users || [];
            const todosUsuarios = [...(users || [])].sort((a, b) =>
                `${a.apellido || ''} ${a.nombre || ''}`.localeCompare(`${b.apellido || ''} ${b.nombre || ''}`, 'es'));
            let depFilterHtml = '<option value="">Todos los departamentos</option>';
            Object.keys(App._depsMap).forEach((key) => {
                depFilterHtml += `<option value="${App.escapeHtml(key)}">${App.escapeHtml(App._depsMap[key].nombre)}</option>`;
            });
            content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-id-card-alt" style="margin-right:8px;color:var(--primary);"></i>Expediente digital</h3>
                </div>
                <div class="card-body no-padding">
                    <p style="padding:16px 16px 0;color:var(--text-secondary);font-size:0.9rem;">
                        Listado de <strong>todos los usuarios</strong> del sistema (cualquier rol). Solo los <strong>administradores</strong> pueden abrir y editar cada expediente.
                        Puede registrar el <strong>currículum</strong> (PDF), <strong>anotaciones</strong> (avisos, amonestaciones, notas) y ver los
                        <strong>documentos oficiales</strong> donde esa persona figure como firmante requerido.
                    </p>
                    <div class="filters-bar" style="padding:16px 16px 0 16px;">
                        <div class="search-input">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar por nombre, correo, rol o departamento…" id="expedSearchInput" oninput="App.filterExpedientesDigitales()">
                        </div>
                        <select class="filter-select" id="expedDepFilter" onchange="App.filterExpedientesDigitales()">${depFilterHtml}</select>
                    </div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Usuario</th><th>Rol</th><th>Departamento</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody id="expedientesTableBody">${this.renderExpedientesDigitalesRows(todosUsuarios)}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        } catch (e) {
            console.error(e);
            content.innerHTML = `
                <div class="card"><div class="card-body">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle" style="color:var(--danger);"></i>
                        <h3>Error</h3>
                        <p>${App.escapeHtml(e.message || 'No se pudo cargar el listado')}</p>
                        <button type="button" class="btn btn-primary" onclick="App.navigate('expedientes-digitales')">Reintentar</button>
                    </div>
                </div></div>`;
        }
    }

    static async openExpedienteCurriculumPdf(uid) {
        try {
            const { blob, nombreArchivo } = await ExpedienteEmpleadoManager.getPdfBlob(uid);
            const url = URL.createObjectURL(blob);
            const w = window.open(url, '_blank');
            if (!w) Toast.error('Ventana bloqueada', 'Permita ventanas emergentes para ver el PDF.');
            setTimeout(() => URL.revokeObjectURL(url), 120000);
        } catch (e) {
            Toast.error('Error', e.message || 'No se pudo abrir el PDF');
        }
    }

    static async confirmDeleteExpedienteCurriculum(uid) {
        if (!confirm('¿Eliminar el currículum PDF de este expediente? Esta acción no se puede deshacer.')) return;
        try {
            await ExpedienteEmpleadoManager.eliminarCurriculum(uid);
            Toast.success('Eliminado', 'Currículum eliminado del expediente.');
            await App.renderExpedienteEmpleado(uid);
        } catch (e) {
            Toast.error('Error', e.message || 'No se pudo eliminar');
        }
    }

    static async handleExpedienteCurriculumUpload(uid) {
        const inp = document.getElementById('expedCurrFile');
        const file = inp?.files?.[0];
        if (!file) {
            Toast.error('Archivo', 'Seleccione un archivo PDF');
            return;
        }
        const btn = document.getElementById('btnExpedCurrUpload');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo…';
        }
        try {
            await ExpedienteEmpleadoManager.subirCurriculum(uid, file);
            if (inp) inp.value = '';
            Toast.success('Guardado', 'Currículum actualizado.');
            await App.renderExpedienteEmpleado(uid);
        } catch (e) {
            Toast.error('Error', e.message || 'No se pudo subir');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-upload"></i> Subir o reemplazar PDF';
            }
        }
    }

    static async handleExpedienteRegistroSubmit(e, uid) {
        e.preventDefault();
        const tipo = document.getElementById('expRegTipo')?.value;
        const titulo = document.getElementById('expRegTitulo')?.value;
        const detalle = document.getElementById('expRegDetalle')?.value;
        const btn = document.getElementById('btnExpRegSubmit');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';
        }
        try {
            await ExpedienteEmpleadoManager.agregarRegistro(uid, { tipo, titulo, detalle });
            Toast.success('Registro creado', 'La anotación quedó en el expediente.');
            await App.renderExpedienteEmpleado(uid);
        } catch (err) {
            Toast.error('Error', err.message || 'No se pudo guardar');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Guardar registro';
            }
        }
    }

    static async deleteExpedienteRegistro(uid, registroId) {
        if (!confirm('¿Eliminar este registro del expediente?')) return;
        try {
            await ExpedienteEmpleadoManager.eliminarRegistro(uid, registroId);
            Toast.success('Eliminado', 'Registro eliminado.');
            await App.renderExpedienteEmpleado(uid);
        } catch (e) {
            Toast.error('Error', e.message || 'No se pudo eliminar');
        }
    }

    static async renderExpedienteEmpleado(userId) {
        const content = document.getElementById('contentArea');
        if (!AuthManager.isAdmin()) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso denegado</h3><p>Solo administradores.</p></div>';
            return;
        }
        if (!userId) {
            content.innerHTML = '<div class="empty-state"><h3>Usuario no especificado</h3><button type="button" class="btn btn-primary" onclick="App.navigate(\'expedientes-digitales\')">Volver al listado</button></div>';
            return;
        }
        await this.ensureDepsLoaded();
        content.innerHTML = `
            <div class="card"><div class="card-body" style="text-align:center;padding:40px;">
                <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i>
                <p style="margin-top:16px;">Cargando expediente…</p>
            </div></div>`;
        try {
            const users = await AuthManager.getAllUsers();
            const emp = (users || []).find((u) => u.id === userId);
            if (!emp) {
                content.innerHTML = `
                    <div class="empty-state">
                        <h3>Usuario no encontrado</h3>
                        <p>No existe un usuario con ese identificador en el sistema.</p>
                        <button type="button" class="btn btn-primary" onclick="App.navigate('expedientes-digitales')">Volver al listado</button>
                    </div>`;
                return;
            }
            const [resumen, docsFirma] = await Promise.all([
                ExpedienteEmpleadoManager.getResumenParaUsuario(userId),
                DocumentManager.getActivosRequiriendoFirmaDe(userId)
            ]);
            const nome = App.escapeHtml(`${emp.nombre || ''} ${emp.apellido || ''}`.trim());
            const dep = App.escapeHtml(App._depsMap[emp.departamento]?.nombre || emp.departamento || '—');
            const uidJs = App.escapeJsString(userId);

            const curriculumInner = resumen.curriculum
                ? `<p style="margin-bottom:10px;"><strong>${App.escapeHtml(resumen.curriculum.nombreArchivo || 'PDF')}</strong><br>
                    <span style="font-size:0.85rem;color:var(--text-secondary);">Actualizado: ${App.escapeHtml(resumen.curriculum.fechaActualizacion || '')}</span></p>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" class="btn btn-sm btn-outline" onclick="App.openExpedienteCurriculumPdf('${uidJs}')"><i class="fas fa-eye"></i> Ver PDF</button>
                        <button type="button" class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="App.confirmDeleteExpedienteCurriculum('${uidJs}')"><i class="fas fa-trash-alt"></i> Quitar PDF</button>
                    </div>`
                : '<p style="color:var(--text-secondary);">Sin currículum cargado.</p>';

            const docsRows = docsFirma.length === 0
                ? '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary);">Ningún documento activo requiere firma de este usuario</td></tr>'
                : docsFirma.map((d) => `
                    <tr>
                        <td>${App.escapeHtml(d.codigo || '')}</td>
                        <td>${App.escapeHtml(d.titulo || '')}</td>
                        <td>${App.escapeHtml(d.fechaCreacion || '')}</td>
                        <td><button type="button" class="btn btn-sm btn-outline" onclick="App.navigate('ver-documento', { id: '${App.escapeHtml(d.id)}' })"><i class="fas fa-file-alt"></i> Ver</button></td>
                    </tr>`).join('');

            const registrosRows = (resumen.registros || []).length === 0
                ? '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);">Sin registros todavía</td></tr>'
                : resumen.registros.map((r) => {
                    const tipoLabel = App.etiquetaTipoRegistroExpediente(r.tipo);
                    return `<tr>
                        <td><span class="status-badge ${r.tipo === 'amonestacion' ? 'pendiente' : 'aprobada'}">${App.escapeHtml(tipoLabel)}</span></td>
                        <td>${App.escapeHtml(r.titulo || '')}</td>
                        <td style="max-width:280px;font-size:0.9rem;color:var(--text-secondary);">${App.escapeHtml(r.detalle || '')}</td>
                        <td>${App.escapeHtml(r.fecha || '')}</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);"
                                onclick="App.deleteExpedienteRegistro('${uidJs}','${App.escapeJsString(r.id)}')"><i class="fas fa-times"></i></button>
                        </td>
                    </tr>`;
                }).join('');

            content.innerHTML = `
            <div style="margin-bottom:16px;">
                <button type="button" class="btn btn-sm btn-outline" onclick="App.navigate('expedientes-digitales')"><i class="fas fa-arrow-left"></i> Volver al listado</button>
            </div>
            <div class="card" style="margin-bottom:16px;">
                <div class="card-header">
                    <h3><i class="fas fa-user" style="margin-right:8px;color:var(--primary);"></i>${nome}</h3>
                    <span style="font-size:0.9rem;color:var(--text-secondary);">${dep}</span>
                </div>
                <div class="card-body">
                    <p style="margin-bottom:8px;"><span class="role-badge ${emp.rol || ''}">${App.escapeHtml(ROLES[emp.rol]?.nombre || emp.rol || '—')}</span></p>
                    <p style="color:var(--text-secondary);font-size:0.9rem;">Expediente digital — documentación y anotaciones internas asociadas a esta persona (solo visible para administradores).</p>
                </div>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <div class="card-header"><h3 style="font-size:1.05rem;"><i class="fas fa-file-pdf" style="margin-right:8px;color:var(--primary);"></i>Currículum vitae (PDF)</h3></div>
                <div class="card-body">
                    ${curriculumInner}
                    <hr style="margin:16px 0;border:none;border-top:1px solid var(--border);">
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px;">Máximo 4 MB. Reemplaza el archivo anterior si ya había uno.</p>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
                        <input type="file" id="expedCurrFile" accept=".pdf,application/pdf">
                        <button type="button" class="btn btn-primary btn-sm" id="btnExpedCurrUpload" onclick="App.handleExpedienteCurriculumUpload('${uidJs}')"><i class="fas fa-upload"></i> Subir o reemplazar PDF</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <div class="card-header"><h3 style="font-size:1.05rem;"><i class="fas fa-file-signature" style="margin-right:8px;color:var(--primary);"></i>Documentos con firma requerida</h3></div>
                <div class="card-body no-padding">
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Código</th><th>Título</th><th>Fecha</th><th></th></tr></thead>
                            <tbody>${docsRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <div class="card-header"><h3 style="font-size:1.05rem;"><i class="fas fa-clipboard-list" style="margin-right:8px;color:var(--primary);"></i>Avisos, amonestaciones y notas</h3></div>
                <div class="card-body">
                    <form onsubmit="App.handleExpedienteRegistroSubmit(event, '${uidJs}')" style="margin-bottom:20px;padding:16px;background:var(--bg-secondary);border-radius:8px;">
                        <h4 style="margin:0 0 12px;font-size:0.95rem;">Nuevo registro</h4>
                        <div class="form-group">
                            <label>Tipo</label>
                            <select id="expRegTipo" class="form-control" required>
                                <option value="aviso">Aviso al empleado</option>
                                <option value="amonestacion">Amonestación</option>
                                <option value="nota">Nota interna</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" id="expRegTitulo" class="form-control" required maxlength="300" placeholder="Resumen breve">
                        </div>
                        <div class="form-group">
                            <label>Detalle</label>
                            <textarea id="expRegDetalle" class="form-control" rows="4" required maxlength="10000" placeholder="Descripción o contenido del registro"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-sm" id="btnExpRegSubmit"><i class="fas fa-save"></i> Guardar registro</button>
                    </form>
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Tipo</th><th>Título</th><th>Detalle</th><th>Fecha</th><th></th></tr></thead>
                            <tbody>${registrosRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        } catch (e) {
            console.error(e);
            content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(e.message || 'Error al cargar')}</p><button type="button" class="btn btn-primary" onclick="App.navigate('expedientes-digitales')">Volver</button></div>`;
        }
    }

    // ========================================================
    // EVALUACIONES DE DESEMPEÑO
    // ========================================================

    static _evalTabActiva = 'personal';

    static renderEvaluacionesRows(list) {
        if (!list || list.length === 0) {
            return '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);">No hay evaluaciones en este periodo</td></tr>';
        }
        return list.map((ev) => {
            const idEsc = App.escapeHtml(ev.id);
            const catClass = ev.puntajeTotal >= 90 ? 'aprobada' : ev.puntajeTotal >= 70 ? 'pendiente' : 'pendiente';
            return `<tr>
                <td>${App.escapeHtml(getPeriodoSemestreLabel(ev.periodoSemestre))}</td>
                <td>${App.escapeHtml(ev.evaluadoNombre || '')}</td>
                <td>${App.escapeHtml(EvaluacionesDesempenoManager.etiquetaTipo(ev.tipo))}</td>
                <td><strong>${ev.puntajeTotal}</strong> / 100</td>
                <td><span class="status-badge ${catClass}">${App.escapeHtml(ev.categoriaResultado || '')}</span></td>
                <td><button type="button" class="btn btn-sm btn-outline" onclick="App.navigate('evaluacion-detalle', { id: '${idEsc}' })"><i class="fas fa-eye"></i> Ver</button></td>
            </tr>`;
        }).join('');
    }

    static async renderEvaluacionesDesempeno(tabInicial) {
        const content = document.getElementById('contentArea');
        const user = AuthManager.getUser();
        if (!user) return;

        const puedePersonal = EvaluacionesDesempenoManager.puedeCrearTipo('personal') || AuthManager.isAdmin();
        const puedeJefaturas = EvaluacionesDesempenoManager.puedeCrearTipo('jefaturas') || AuthManager.isAdmin();
        let tab = tabInicial || this._evalTabActiva;
        if (tab === 'personal' && !puedePersonal && puedeJefaturas) tab = 'jefaturas';
        if (tab === 'jefaturas' && !puedeJefaturas && puedePersonal) tab = 'personal';
        this._evalTabActiva = tab;

        const periodo = getPeriodoSemestreActual();
        content.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i> Cargando…</div></div>`;

        const [listPersonal, listJefaturas] = await Promise.all([
            (puedePersonal || AuthManager.isAdmin()) ? EvaluacionesDesempenoManager.listParaUsuario('personal', null) : Promise.resolve([]),
            (puedeJefaturas || AuthManager.isAdmin()) ? EvaluacionesDesempenoManager.listParaUsuario('jefaturas', null) : Promise.resolve([])
        ]);

        const tabsHtml = `
            ${puedePersonal || AuthManager.isAdmin() ? `<button type="button" class="tab ${tab === 'personal' ? 'active' : ''}" onclick="App.navigate('evaluaciones-desempeno', { tab: 'personal' })">Desempeño del personal</button>` : ''}
            ${puedeJefaturas || AuthManager.isAdmin() ? `<button type="button" class="tab ${tab === 'jefaturas' ? 'active' : ''}" onclick="App.navigate('evaluaciones-desempeno', { tab: 'jefaturas' })">Desempeño de jefaturas</button>` : ''}`;

        const listaActiva = tab === 'jefaturas' ? listJefaturas : listPersonal;
        const btnNueva = (tab === 'personal' && EvaluacionesDesempenoManager.puedeCrearTipo('personal')) ||
            (tab === 'jefaturas' && EvaluacionesDesempenoManager.puedeCrearTipo('jefaturas'))
            ? `<button type="button" class="btn btn-primary btn-sm" onclick="App.navigate('evaluacion-nueva', { tipo: '${tab}' })"><i class="fas fa-plus"></i> Nueva evaluación</button>`
            : '';

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-star" style="margin-right:8px;color:var(--primary);"></i>Evaluaciones de desempeño</h3>
                    ${btnNueva}
                </div>
                <div class="card-body">
                    <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:16px;">
                        Evaluaciones <strong>semestrales</strong>. Periodo activo: <strong>${App.escapeHtml(getPeriodoSemestreLabel(periodo))}</strong>.
                        ${AuthManager.isAdmin() ? 'Como administrador ve todas las evaluaciones.' : ''}
                        ${user.rol === 'encargado' ? 'Puede ver las evaluaciones de personal que usted realizó.' : ''}
                        ${user.rol === 'empleado' ? 'Puede ver las evaluaciones a jefaturas que usted envió.' : ''}
                    </p>
                    <div class="tabs" style="margin-bottom:16px;">${tabsHtml}</div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Periodo</th><th>Evaluado</th><th>Tipo</th><th>Puntaje</th><th>Categoría</th><th></th></tr></thead>
                            <tbody>${this.renderEvaluacionesRows(listaActiva)}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    static buildEvaluacionCriteriosHtml(tipo) {
        const plantilla = getPlantillaEvaluacion(tipo);
        if (!plantilla) return '';
        return plantilla.secciones.map((sec) => {
            const filas = sec.criterios.map((c) => {
                const opts = [];
                for (let i = 0; i <= c.max; i++) {
                    const lbl = EVALUACION_ESCALA.etiquetas[i] ? `${i} — ${EVALUACION_ESCALA.etiquetas[i].split('—')[0].trim()}` : String(i);
                    opts.push(`<option value="${i}">${App.escapeHtml(lbl)}</option>`);
                }
                return `<tr>
                    <td>${App.escapeHtml(c.texto)}</td>
                    <td style="width:220px;">
                        <select class="form-control eval-crit" data-crit-id="${App.escapeHtml(c.id)}" data-crit-max="${c.max}" required onchange="App.recalcularPreviewEvaluacion('${App.escapeJsString(tipo)}')">
                            <option value="">—</option>${opts.join('')}
                        </select>
                    </td>
                    <td style="width:60px;text-align:center;color:var(--text-secondary);">/ ${c.max}</td>
                </tr>`;
            }).join('');
            return `
                <div class="card" style="margin-bottom:16px;">
                    <div class="card-header"><h4 style="font-size:1rem;margin:0;">${App.escapeHtml(sec.id)}. ${App.escapeHtml(sec.nombre)} <span style="font-weight:normal;color:var(--text-secondary);">(máx. ${sec.maxSeccion} pts)</span></h4></div>
                    <div class="card-body no-padding">
                        <table class="data-table"><thead><tr><th>Criterio</th><th>Puntaje</th><th>Máx.</th></tr></thead><tbody>${filas}</tbody></table>
                        <div style="padding:12px 16px;border-top:1px solid var(--border);">
                            <label style="font-size:0.85rem;color:var(--text-secondary);">Observaciones de la sección</label>
                            <textarea class="form-control eval-obs-sec" data-sec-id="${App.escapeHtml(sec.id)}" rows="2" maxlength="2000" placeholder="Opcional"></textarea>
                            <p style="margin:8px 0 0;font-size:0.85rem;">Subtotal: <strong id="evalSub_${sec.id}">0</strong> / ${sec.maxSeccion}</p>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    static recalcularPreviewEvaluacion(tipo) {
        const respuestas = {};
        const observacionesSecciones = {};
        document.querySelectorAll('.eval-crit').forEach((el) => {
            const id = el.dataset.critId;
            const v = el.value;
            if (v !== '') respuestas[id] = Number(v);
        });
        document.querySelectorAll('.eval-obs-sec').forEach((el) => {
            observacionesSecciones[el.dataset.secId] = el.value;
        });
        const { puntajeTotal, desgloseSecciones, clasificacion } =
            calcularPuntajeEvaluacion(tipo, respuestas, observacionesSecciones);
        const totalEl = document.getElementById('evalPreviewTotal');
        const catEl = document.getElementById('evalPreviewCategoria');
        const sugEl = document.getElementById('evalPreviewSugerencia');
        if (totalEl) totalEl.textContent = String(puntajeTotal);
        if (catEl) catEl.textContent = clasificacion.categoria;
        if (sugEl) sugEl.textContent = clasificacion.resultadoSugerido;
        Object.keys(desgloseSecciones).forEach((sid) => {
            const el = document.getElementById(`evalSub_${sid}`);
            if (el) el.textContent = String(desgloseSecciones[sid].subtotal);
        });
    }

    static async renderEvaluacionNueva(tipo) {
        const content = document.getElementById('contentArea');
        if (!EvaluacionesDesempenoManager.puedeCrearTipo(tipo)) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Sin permiso</h3><p>No puede crear este tipo de evaluación.</p></div>';
            return;
        }
        await this.ensureDepsLoaded();
        const plantilla = getPlantillaEvaluacion(tipo);
        const evaluados = await EvaluacionesDesempenoManager.getEvaluadosDisponibles(tipo);
        const periodo = getPeriodoSemestreActual();
        const rango = getPeriodoSemestreRango(periodo);
        const isAdmin = AuthManager.isAdmin();
        const labels = plantilla.labelsCualitativos;

        let evaluadosOpts = '<option value="">— Seleccione —</option>';
        evaluados.sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es'));
        evaluados.forEach((u) => {
            const dep = App._depsMap[u.departamento]?.nombre || u.departamento || '';
            evaluadosOpts += `<option value="${App.escapeHtml(u.id)}">${App.escapeHtml(`${u.nombre} ${u.apellido}`)} — ${App.escapeHtml(dep)}</option>`;
        });

        const decisionesHtml = isAdmin ? (plantilla.decisionesAdministrativas || []).map((d) =>
            `<label style="display:block;margin-bottom:6px;"><input type="radio" name="evalDecision" value="${App.escapeHtml(d.id)}"> ${App.escapeHtml(d.label)}</label>`
        ).join('') : '';

        content.innerHTML = `
            <div style="margin-bottom:16px;">
                <button type="button" class="btn btn-sm btn-outline" onclick="App.navigate('evaluaciones-desempeno', { tab: '${App.escapeHtml(tipo)}' })"><i class="fas fa-arrow-left"></i> Volver</button>
            </div>
            <div class="card" style="margin-bottom:16px;">
                <div class="card-header"><h3>${App.escapeHtml(plantilla.titulo)}</h3></div>
                <div class="card-body">
                    <form id="formEvaluacionDesempeno" onsubmit="App.handleEvaluacionSubmit(event, '${App.escapeJsString(tipo)}')">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:20px;">
                            <div class="form-group">
                                <label>Persona evaluada <span class="required">*</span></label>
                                <select id="evalEvaluadoId" class="form-control" required>${evaluadosOpts}</select>
                            </div>
                            <div class="form-group">
                                <label>Periodo semestral</label>
                                <input type="text" class="form-control" value="${App.escapeHtml(getPeriodoSemestreLabel(periodo))}" readonly>
                                <input type="hidden" id="evalPeriodoSemestre" value="${App.escapeHtml(periodo)}">
                            </div>
                            <div class="form-group">
                                <label>Fecha de evaluación</label>
                                <input type="date" id="evalFecha" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-group">
                                <label>Puesto (opcional)</label>
                                <input type="text" id="evalPuesto" class="form-control" maxlength="120" placeholder="Puesto del evaluado">
                            </div>
                        </div>
                        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">
                            Periodo evaluado: ${App.escapeHtml(rango.desde)} a ${App.escapeHtml(rango.hasta)}. Escala 0–5 por criterio (máximo según columna).
                        </p>
                        ${this.buildEvaluacionCriteriosHtml(tipo)}
                        <div class="card" style="margin-bottom:16px;background:var(--bg-secondary);">
                            <div class="card-body">
                                <h4 style="margin:0 0 12px;">Resultado preliminar</h4>
                                <p style="margin:0;font-size:1.25rem;"><strong id="evalPreviewTotal">0</strong> / 100 — <span id="evalPreviewCategoria">—</span></p>
                                <p style="margin:8px 0 0;color:var(--text-secondary);font-size:0.9rem;" id="evalPreviewSugerencia">—</p>
                            </div>
                        </div>
                        <div class="form-group"><label>${App.escapeHtml(labels.fortalezas)}</label><textarea id="evalFortalezas" class="form-control" rows="3" maxlength="5000"></textarea></div>
                        <div class="form-group"><label>${App.escapeHtml(labels.areasMejora)}</label><textarea id="evalAreasMejora" class="form-control" rows="3" maxlength="5000"></textarea></div>
                        <div class="form-group"><label>${App.escapeHtml(labels.recomendaciones)}</label><textarea id="evalRecomendaciones" class="form-control" rows="3" maxlength="5000"></textarea></div>
                        ${isAdmin ? `<div class="form-group"><label>Decisión administrativa</label>${decisionesHtml}</div>
                        <div class="form-group"><label>Observación de administración</label><textarea id="evalObsAdmin" class="form-control" rows="2" maxlength="5000"></textarea></div>` : ''}
                        <div class="form-group">
                            <label>Adjuntar PDF (opcional, máx. 4 MB)</label>
                            <input type="file" id="evalPdfFile" accept=".pdf,application/pdf">
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg" id="btnEvalSubmit"><i class="fas fa-paper-plane"></i> Enviar evaluación</button>
                    </form>
                </div>
            </div>`;
    }

    static async handleEvaluacionSubmit(e, tipo) {
        e.preventDefault();
        const btn = document.getElementById('btnEvalSubmit');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…'; }
        try {
            const respuestas = {};
            document.querySelectorAll('.eval-crit').forEach((el) => { respuestas[el.dataset.critId] = el.value; });
            const observacionesSecciones = {};
            document.querySelectorAll('.eval-obs-sec').forEach((el) => { observacionesSecciones[el.dataset.secId] = el.value; });
            const decisionEl = document.querySelector('input[name="evalDecision"]:checked');
            const file = document.getElementById('evalPdfFile')?.files?.[0] || null;
            const ev = await EvaluacionesDesempenoManager.create({
                tipo,
                evaluadoId: document.getElementById('evalEvaluadoId')?.value,
                periodoSemestre: document.getElementById('evalPeriodoSemestre')?.value,
                fechaEvaluacion: document.getElementById('evalFecha')?.value,
                evaluadoPuesto: document.getElementById('evalPuesto')?.value,
                respuestas,
                observacionesSecciones,
                fortalezas: document.getElementById('evalFortalezas')?.value,
                areasMejora: document.getElementById('evalAreasMejora')?.value,
                recomendaciones: document.getElementById('evalRecomendaciones')?.value,
                decisionAdministrativa: decisionEl ? decisionEl.value : '',
                observacionAdministracion: document.getElementById('evalObsAdmin')?.value || '',
                file
            });
            Toast.success('Evaluación enviada', `Total: ${ev.puntajeTotal}/100 — ${ev.categoriaResultado}`);
            App.navigate('evaluacion-detalle', { id: ev.id });
        } catch (err) {
            Toast.error('Error', err.message || 'No se pudo guardar');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar evaluación'; }
        }
    }

    static async renderEvaluacionDetalle(id) {
        const content = document.getElementById('contentArea');
        if (!id) {
            content.innerHTML = '<div class="empty-state"><h3>Evaluación no especificada</h3></div>';
            return;
        }
        content.innerHTML = '<div class="card"><div class="card-body" style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin"></i></div></div>';
        const ev = await EvaluacionesDesempenoManager.getById(id);
        if (!ev || !EvaluacionesDesempenoManager.puedeVer(ev)) {
            content.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso denegado</h3><p>No puede ver esta evaluación.</p></div>';
            return;
        }
        await this.ensureDepsLoaded();
        const plantilla = getPlantillaEvaluacion(ev.tipo);
        const dep = App._depsMap[ev.evaluadoDepartamento]?.nombre || ev.evaluadoDepartamento || '—';
        const isAdmin = AuthManager.isAdmin();

        let seccionesHtml = '';
        (plantilla?.secciones || []).forEach((sec) => {
            const des = ev.desgloseSecciones?.[sec.id] || {};
            const filas = sec.criterios.map((c) => `<tr>
                <td>${App.escapeHtml(c.texto)}</td>
                <td style="text-align:center;"><strong>${ev.respuestas?.[c.id] ?? '—'}</strong> / ${c.max}</td>
            </tr>`).join('');
            seccionesHtml += `
                <div class="card" style="margin-bottom:12px;">
                    <div class="card-header"><h4 style="font-size:0.95rem;margin:0;">${App.escapeHtml(sec.id)}. ${App.escapeHtml(sec.nombre)} — ${des.subtotal ?? 0}/${sec.maxSeccion}</h4></div>
                    <div class="card-body no-padding">
                        <table class="data-table"><tbody>${filas}</tbody></table>
                        ${des.observaciones ? `<p style="padding:12px 16px;margin:0;font-size:0.9rem;color:var(--text-secondary);"><strong>Observaciones:</strong> ${App.escapeHtml(des.observaciones)}</p>` : ''}
                    </div>
                </div>`;
        });

        const decisionesHtml = isAdmin ? (plantilla?.decisionesAdministrativas || []).map((d) =>
            `<label style="display:block;margin-bottom:6px;"><input type="radio" name="evalDecisionEdit" value="${App.escapeHtml(d.id)}" ${ev.decisionAdministrativa === d.id ? 'checked' : ''}> ${App.escapeHtml(d.label)}</label>`
        ).join('') : '';

        content.innerHTML = `
            <div style="margin-bottom:16px;">
                <button type="button" class="btn btn-sm btn-outline" onclick="App.navigate('evaluaciones-desempeno', { tab: '${App.escapeHtml(ev.tipo)}' })"><i class="fas fa-arrow-left"></i> Volver</button>
            </div>
            <div class="card" style="margin-bottom:16px;">
                <div class="card-header">
                    <h3>${App.escapeHtml(plantilla?.titulo || 'Evaluación')}</h3>
                    <span class="status-badge aprobada">${App.escapeHtml(ev.categoriaResultado || '')}</span>
                </div>
                <div class="card-body">
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;font-size:0.9rem;">
                        <div><strong>Evaluado:</strong> ${App.escapeHtml(ev.evaluadoNombre)}</div>
                        <div><strong>Evaluador:</strong> ${App.escapeHtml(ev.evaluadorNombre)}</div>
                        <div><strong>Periodo:</strong> ${App.escapeHtml(getPeriodoSemestreLabel(ev.periodoSemestre))}</div>
                        <div><strong>Departamento:</strong> ${App.escapeHtml(dep)}</div>
                        <div><strong>Fecha:</strong> ${App.escapeHtml(ev.fechaEvaluacion || '')}</div>
                        <div><strong>Puntaje total:</strong> <span style="font-size:1.2rem;">${ev.puntajeTotal}</span> / 100</div>
                    </div>
                    <p style="margin-top:12px;color:var(--text-secondary);"><strong>Resultado sugerido:</strong> ${App.escapeHtml(ev.resultadoSugerido || '')}</p>
                    ${ev.tieneAdjunto ? `<button type="button" class="btn btn-sm btn-outline" style="margin-top:12px;" onclick="App.openEvaluacionPdf('${App.escapeJsString(id)}')"><i class="fas fa-file-pdf"></i> Ver PDF adjunto</button>` : ''}
                </div>
            </div>
            ${seccionesHtml}
            <div class="card" style="margin-bottom:16px;">
                <div class="card-body">
                    ${ev.fortalezas ? `<p><strong>${App.escapeHtml(plantilla?.labelsCualitativos?.fortalezas || 'Fortalezas')}:</strong><br>${App.escapeHtml(ev.fortalezas)}</p>` : ''}
                    ${ev.areasMejora ? `<p><strong>${App.escapeHtml(plantilla?.labelsCualitativos?.areasMejora || 'Áreas de mejora')}:</strong><br>${App.escapeHtml(ev.areasMejora)}</p>` : ''}
                    ${ev.recomendaciones ? `<p><strong>${App.escapeHtml(plantilla?.labelsCualitativos?.recomendaciones || 'Recomendaciones')}:</strong><br>${App.escapeHtml(ev.recomendaciones)}</p>` : ''}
                    ${ev.decisionAdministrativa ? `<p><strong>Decisión administrativa:</strong> ${App.escapeHtml(EvaluacionesDesempenoManager.etiquetaDecision(ev.tipo, ev.decisionAdministrativa))}</p>` : ''}
                    ${ev.observacionAdministracion ? `<p><strong>Observación de administración:</strong><br>${App.escapeHtml(ev.observacionAdministracion)}</p>` : ''}
                </div>
            </div>
            ${isAdmin ? `
            <div class="card">
                <div class="card-header"><h4 style="margin:0;font-size:1rem;">Actualizar decisión administrativa</h4></div>
                <div class="card-body">
                    ${decisionesHtml}
                    <div class="form-group" style="margin-top:12px;"><label>Observación de administración</label>
                        <textarea id="evalObsAdminEdit" class="form-control" rows="3">${App.escapeHtml(ev.observacionAdministracion || '')}</textarea>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm" onclick="App.handleEvaluacionAdminUpdate('${App.escapeJsString(id)}')"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </div>` : ''}`;
    }

    static async openEvaluacionPdf(id) {
        try {
            const { blob, nombreArchivo } = await EvaluacionesDesempenoManager.getPdfBlob(id);
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 120000);
        } catch (e) {
            Toast.error('Error', e.message || 'No se pudo abrir el PDF');
        }
    }

    static async handleEvaluacionAdminUpdate(id) {
        try {
            const decisionEl = document.querySelector('input[name="evalDecisionEdit"]:checked');
            await EvaluacionesDesempenoManager.updateAdminFields(id, {
                decisionAdministrativa: decisionEl ? decisionEl.value : null,
                observacionAdministracion: document.getElementById('evalObsAdminEdit')?.value || ''
            });
            Toast.success('Actualizado', 'Decisión administrativa guardada.');
            await App.renderEvaluacionDetalle(id);
        } catch (e) {
            Toast.error('Error', e.message || 'No se pudo actualizar');
        }
    }

    static async handlePoliticaUpload(e) {
        e.preventDefault();
        if (!AuthManager.isAdmin()) {
            Toast.error('Permiso denegado', 'Solo los administradores pueden publicar políticas en la biblioteca.');
            return;
        }
        const titulo = document.getElementById('politicaTitulo')?.value;
        const descripcion = document.getElementById('politicaDesc')?.value;
        const fileInput = document.getElementById('politicaFile');
        const file = fileInput?.files?.[0];
        const btn = document.getElementById('btnPoliticaSubmit');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Guardando...';
        }
        try {
            Toast.info('Guardando', 'Leyendo el PDF y publicando en la base de datos...');
            await PoliticaInternaManager.create({ titulo, descripcion, file });
            Toast.success('Publicado', 'El documento ya está disponible para todos los usuarios.');
            await this.renderPoliticasInternas();
        } catch (err) {
            console.error(err);
            Toast.error('Error', err.message || 'No se pudo publicar el PDF');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-upload" style="margin-right:6px;"></i>Subir y publicar';
            }
        }
    }

    static async abrirPoliticaPdf(id) {
        try {
            const { blob } = await PoliticaInternaManager.getPdfBlob(id);
            const url = URL.createObjectURL(blob);
            const w = window.open(url, '_blank', 'noopener,noreferrer');
            if (!w) {
                Toast.error('Ventana bloqueada', 'Permita ventanas emergentes para este sitio o use Descargar.');
            }
            setTimeout(() => URL.revokeObjectURL(url), 120000);
        } catch (err) {
            console.error(err);
            Toast.error('Error', err.message || 'No se pudo abrir el PDF.');
        }
    }

    static async descargarPoliticaPdf(id, nombreArchivo) {
        try {
            const { blob } = await PoliticaInternaManager.getPdfBlob(id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo || 'documento.pdf';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
        } catch (err) {
            console.error(err);
            Toast.error('Error', err.message || 'No se pudo descargar el archivo.');
        }
    }

    static async eliminarPoliticaInterna(id) {
        if (!AuthManager.isAdmin()) {
            Toast.error('Permiso denegado', 'Solo los administradores pueden eliminar políticas.');
            return;
        }
        if (!id || !confirm('¿Eliminar esta política y su archivo? Esta acción no se puede deshacer.')) return;
        try {
            await PoliticaInternaManager.delete(id);
            Toast.success('Eliminado', 'El documento fue quitado de la biblioteca.');
            await this.renderPoliticasInternas();
        } catch (err) {
            console.error(err);
            Toast.error('Error', err.message || 'No se pudo eliminar.');
        }
    }

    static _cachedDocs = [];

    static renderDocList(docs) {
        if (docs.length === 0) {
            return `<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No hay documentos</h3><p>No se encontraron documentos con los filtros seleccionados</p></div>`;
        }

        return `<div class="doc-list">
            ${docs.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).map(doc => {
                const dep = App._depsMap[doc.departamento] || DEPARTAMENTOS[doc.departamento];
                const firmas = doc.firmas ? Object.keys(doc.firmas).length : 0;
                const firmasRequeridas = doc.firmasRequeridas ? doc.firmasRequeridas.length : 0;
                const canManage = AuthManager.isAdmin() || AuthManager.isEncargado();
                return `
                <div class="doc-item">
                    <div style="display:flex;align-items:center;flex:1;cursor:pointer;" onclick="App.navigate('ver-documento', {id:'${doc.id}'})">
                        <div class="doc-icon" style="background:${dep?.color || '#546e7a'};"><i class="${dep?.icono || 'fas fa-file'}"></i></div>
                        <div class="doc-info" style="flex:1;">
                            <h4>${doc.titulo}</h4>
                            <div class="doc-meta">
                                <span class="dep-chip" style="background:${dep?.color || '#546e7a'}">${dep?.nombre || 'N/A'}</span>
                                <span>${doc.tipoNombre}</span><span>•</span>
                                <span>${doc.creadoPorNombre}</span><span>•</span>
                                <span>${timeAgo(doc.fechaCreacion)}</span><span>•</span>
                                <span><i class="fas fa-signature" style="margin-right:3px;"></i>${firmas}${firmasRequeridas > 0 ? `/${firmasRequeridas}` : ''} firma(s)</span>
                            </div>
                        </div>
                        <span class="doc-code">${doc.codigo}</span>
                    </div>
                    ${canManage && firmasRequeridas > 0 ? `
                        <div style="display:flex;gap:6px;margin-left:10px;">
                            <button class="btn btn-sm btn-outline" onclick="event.stopPropagation();App.navigate('estado-firmas', {id:'${doc.id}'})" title="Ver estado de firmas">
                                <i class="fas fa-clipboard-check"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>`;
            }).join('')}
        </div>`;
    }

    static filterDocuments() {
        const query = document.getElementById('docSearchInput').value.toLowerCase();
        const depFilter = document.getElementById('docDepFilter').value;
        let docs = this._cachedDocs;

        // Filtrar por departamento del documento (solo para admins)
        if (depFilter) docs = docs.filter(d => d.departamento === depFilter);
        if (query) {
            docs = docs.filter(d =>
                d.titulo.toLowerCase().includes(query) ||
                d.codigo.toLowerCase().includes(query) ||
                d.tipoNombre.toLowerCase().includes(query) ||
                d.creadoPorNombre.toLowerCase().includes(query)
            );
        }
        document.getElementById('docListContainer').innerHTML = this.renderDocList(docs);
    }

    // ========================================================
    // VER DOCUMENTO
    // ========================================================
    static async renderVerDocumento(docId) {
        const doc = await DocumentManager.getById(docId);
        if (!doc) {
            document.getElementById('contentArea').innerHTML = `
                <div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Documento no encontrado</h3>
                <button class="btn btn-primary" onclick="App.navigate('documentos')">Volver</button></div>`;
            return;
        }

        const dep = App._depsMap[doc.departamento] || DEPARTAMENTOS[doc.departamento];
        const user = AuthManager.getUser();
        const allFirmas = doc.firmas ? Object.values(doc.firmas) : [];
        // En "Firmas Digitales" solo mostrar la firma del encargado (creador del documento)
        const firmas = allFirmas.filter(f => f.userId === doc.creadoPor);
        const canSign = !allFirmas.some(f => f.userId === user.id);
        const content = document.getElementById('contentArea');

        content.innerHTML = `
            <div style="margin-bottom:16px;">
                <button class="btn btn-outline btn-sm" onclick="App.navigate('documentos')"><i class="fas fa-arrow-left"></i> Volver</button>
            </div>
            <div class="doc-preview">
                <div class="doc-preview-header" style="background:${dep?.color || 'var(--primary)'};">
                    <p style="font-size:0.85rem;opacity:0.8;">${dep?.nombre || 'Departamento'} — ${doc.tipoNombre}</p>
                    <h2>${doc.titulo}</h2>
                    <span class="doc-preview-code">${doc.codigo}</span>
                    <p style="font-size:0.8rem;opacity:0.7;margin-top:8px;">Creado por ${doc.creadoPorNombre} • ${formatDateTime(doc.fechaCreacion)}</p>
                </div>
                <div class="doc-preview-body">${doc.contenido}</div>
                <div class="doc-preview-footer">
                    <h4 style="margin-bottom:12px;"><i class="fas fa-signature" style="margin-right:8px;color:var(--primary);"></i>Firmas Digitales</h4>
                    ${firmas.length > 0 ? `
                        <div class="signature-list">
                            ${firmas.map(f => `
                                <div class="signature-item">
                                    <div class="sig-check"><i class="fas fa-check-circle"></i></div>
                                    <div class="sig-name">${f.nombre}</div>
                                    <div class="sig-role">${ROLES[f.rol]?.nombre || f.rol} — ${(App._depsMap[f.departamento] || DEPARTAMENTOS[f.departamento])?.nombre || ''}</div>
                                    <div class="sig-date">${formatDateTime(f.fecha)}</div>
                                    <div class="sig-code">Código: ${f.codigoVerificacion}</div>
                                    ${f.firmaDibujo ? `
                                        <div style="margin-top:12px;padding:12px;background:white;border-radius:6px;border:1px solid var(--border);width:100%;max-width:300px;">
                                            <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:8px;font-weight:600;text-align:center;">Firma manuscrita:</p>
                                            <div style="text-align:center;">
                                                <img src="${f.firmaDibujo}" alt="Firma de ${f.nombre}" style="max-width:100%;height:auto;max-height:120px;border-radius:4px;background:white;padding:8px;border:1px dashed var(--primary);display:inline-block;" />
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color:var(--text-light);font-size:0.88rem;">Aún no hay firmas</p>'}

                    ${canSign ? `
                        <div class="signature-area" style="margin-top:20px;">
                            <i class="fas fa-pen-fancy" style="font-size:2rem;color:var(--primary);margin-bottom:10px;display:block;"></i>
                            <h4>Firmar Documento</h4>
                            
                            <!-- Paso 1: Código de verificación del documento -->
                            <div id="step1Verification" style="margin-bottom:20px;">
                                <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:15px;">Ingrese el código de verificación del documento</p>
                                <div style="display:flex;gap:10px;max-width:400px;margin:0 auto;">
                                    <input type="text" class="form-control" id="signVerCode" placeholder="Código de verificación" style="text-align:center;letter-spacing:2px;text-transform:uppercase;">
                                    <button class="btn btn-primary" id="btnVerificarCodigo" onclick="App.verifyDocumentCode('${doc.id}')"><i class="fas fa-check"></i> Verificar</button>
                                </div>
                                <p style="font-size:0.75rem;color:var(--text-light);margin-top:10px;">
                                    Código del documento: <strong style="color:var(--primary);letter-spacing:1px;">${doc.verificacionCode}</strong>
                                </p>
                            </div>

                            <!-- Paso 2: Código personal y canvas (oculto inicialmente) -->
                            <div id="step2PersonalCode" style="display:none;margin-bottom:20px;">
                                <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:15px;">Ingrese su código personal para desbloquear la firma</p>
                                <div style="display:flex;gap:10px;max-width:400px;margin:0 auto;margin-bottom:15px;">
                                    <input type="password" class="form-control" id="signPersonalCode" placeholder="Código personal" style="text-align:center;letter-spacing:2px;">
                                    <button class="btn btn-primary" id="btnDesbloquearFirma" onclick="App.unlockSignatureCanvas('${doc.id}')"><i class="fas fa-unlock"></i> Desbloquear</button>
                                </div>
                                <p style="font-size:0.75rem;color:var(--text-light);margin-top:10px;">
                                    <i class="fas fa-info-circle"></i> Su código personal es privado y se requiere para firmar documentos
                                </p>
                            </div>

                            <!-- Paso 3: Canvas de firma (oculto inicialmente) -->
                            <div id="step3SignatureCanvas" style="display:none;">
                                <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:15px;text-align:center;">Dibuje su firma en el recuadro</p>
                                <div style="display:flex;flex-direction:column;align-items:center;gap:15px;">
                                    <div style="position:relative;border:2px dashed #1565c0;border-radius:8px;background:white;padding:10px;">
                                        <canvas id="signatureCanvas" width="500" height="200" style="display:block;cursor:crosshair;border-radius:4px;" 
                                                onmousedown="App.startDrawing(event)" 
                                                onmousemove="App.draw(event)" 
                                                onmouseup="App.stopDrawing()" 
                                                onmouseleave="App.stopDrawing()"
                                                ontouchstart="App.startDrawing(event)"
                                                ontouchmove="App.draw(event)"
                                                ontouchend="App.stopDrawing()"></canvas>
                                        <div id="canvasLockedOverlay" style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;border-radius:4px;pointer-events:none;">
                                            <div style="text-align:center;color:white;">
                                                <i class="fas fa-lock" style="font-size:2rem;margin-bottom:10px;"></i>
                                                <p style="font-size:0.9rem;font-weight:600;">Ingrese su código personal para desbloquear</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="display:flex;gap:10px;">
                                        <button class="btn btn-outline" id="btnLimpiarFirma" onclick="App.clearSignature()" style="display:none;"><i class="fas fa-eraser"></i> Limpiar</button>
                                        <button class="btn btn-primary" id="btnConfirmarFirma" onclick="App.confirmSignature('${doc.id}')" style="display:none;"><i class="fas fa-check"></i> Confirmar Firma</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div style="margin-top:20px;padding:15px;background:rgba(46,125,50,0.05);border-radius:var(--radius-sm);text-align:center;">
                            <i class="fas fa-check-circle" style="color:var(--success);margin-right:6px;"></i>
                            <span style="color:var(--success);font-weight:600;">Ya ha firmado este documento</span>
                        </div>
                    `}
                    <div style="margin-top:20px;text-align:center;" class="no-print">
                        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                            <button class="btn btn-primary btn-sm" onclick="App.generateDocumentPDF('${doc.id}')"><i class="fas fa-file-pdf"></i> Generar PDF</button>
                            ${(AuthManager.isAdmin() || AuthManager.isEncargado()) ? `
                                <button class="btn btn-outline btn-sm" onclick="App.navigate('estado-firmas', {id:'${doc.id}'})"><i class="fas fa-clipboard-check"></i> Ver Estado de Firmas</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Variables para el canvas de firma
    static isDrawing = false;
    static signatureCanvas = null;
    static signatureCtx = null;
    static signatureUnlocked = false;
    static currentDocId = null;
    static currentVerificationCode = null;
    static currentPersonalCode = null;

    // Verificar código del documento
    static async verifyDocumentCode(docId) {
        const code = document.getElementById('signVerCode').value.toUpperCase().trim();
        if (!code) { 
            Toast.error('Error', 'Ingrese el código de verificación'); 
            return; 
        }

        const doc = await DocumentManager.getById(docId);
        if (!doc) {
            Toast.error('Error', 'Documento no encontrado');
            return;
        }

        // Verificar código del documento
        if (code !== doc.verificacionCode) {
            Toast.error('Error', 'Código de verificación incorrecto');
            return;
        }

        // Guardar código y mostrar paso 2
        this.currentDocId = docId;
        this.currentVerificationCode = code;
        document.getElementById('step1Verification').style.display = 'none';
        document.getElementById('step2PersonalCode').style.display = 'block';
        Toast.success('Código verificado', 'Ahora ingrese su código personal');
    }

    // Desbloquear canvas de firma
    static async unlockSignatureCanvas(docId) {
        const personalCode = document.getElementById('signPersonalCode').value.trim();
        if (!personalCode) {
            Toast.error('Error', 'Ingrese su código personal');
            return;
        }

        const user = AuthManager.getUser();
        if (!user) {
            Toast.error('Error', 'Usuario no autenticado');
            return;
        }

        // Validar código personal
        // Si el usuario tiene un código personal en su perfil, validarlo
        // Si no, usar la contraseña (requiere reautenticación)
        let isValid = false;
        
        if (user.codigoPersonal) {
            // Validar contra código personal almacenado
            isValid = personalCode === user.codigoPersonal;
        } else {
            // Si no hay código personal, intentar validar contra contraseña
            // Por seguridad, requerimos reautenticación
            try {
                // Reautenticar con la contraseña
                const email = user.email;
                const credential = firebase.auth.EmailAuthProvider.credential(email, personalCode);
                await auth.currentUser.reauthenticateWithCredential(credential);
                isValid = true;
            } catch (error) {
                isValid = false;
            }
        }

        if (!isValid) {
            Toast.error('Error', 'Código personal incorrecto');
            document.getElementById('signPersonalCode').value = '';
            return;
        }

        // Desbloquear canvas
        this.currentPersonalCode = personalCode;
        this.signatureUnlocked = true;
        document.getElementById('step2PersonalCode').style.display = 'none';
        document.getElementById('step3SignatureCanvas').style.display = 'block';
        document.getElementById('canvasLockedOverlay').style.display = 'none';
        document.getElementById('btnLimpiarFirma').style.display = 'inline-block';
        document.getElementById('btnConfirmarFirma').style.display = 'inline-block';
        
        // Inicializar canvas después de un pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
            this.initSignatureCanvas();
        }, 100);
        
        Toast.success('Canvas desbloqueado', 'Puede dibujar su firma ahora');
    }

    // Inicializar canvas de firma
    static initSignatureCanvas() {
        const canvas = document.getElementById('signatureCanvas');
        if (!canvas) return;
        
        this.signatureCanvas = canvas;
        this.signatureCtx = canvas.getContext('2d');
        
        // Configurar estilo de dibujo
        this.signatureCtx.strokeStyle = '#000000';
        this.signatureCtx.lineWidth = 2;
        this.signatureCtx.lineCap = 'round';
        this.signatureCtx.lineJoin = 'round';
        
        // Ajustar tamaño del canvas para pantallas pequeñas
        const container = canvas.parentElement;
        if (container && window.innerWidth < 600) {
            const maxWidth = container.clientWidth - 40; // Padding
            canvas.width = Math.min(500, maxWidth);
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = '200px';
        }
    }

    // Iniciar dibujo
    static startDrawing(event) {
        if (!this.signatureUnlocked || !this.signatureCtx) return;
        
        event.preventDefault();
        this.isDrawing = true;
        const canvas = this.signatureCanvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let x, y;
        if (event.touches) {
            x = (event.touches[0].clientX - rect.left) * scaleX;
            y = (event.touches[0].clientY - rect.top) * scaleY;
        } else {
            x = (event.clientX - rect.left) * scaleX;
            y = (event.clientY - rect.top) * scaleY;
        }
        
        this.signatureCtx.beginPath();
        this.signatureCtx.moveTo(x, y);
    }

    // Dibujar
    static draw(event) {
        if (!this.isDrawing || !this.signatureUnlocked || !this.signatureCtx) return;
        
        event.preventDefault();
        const canvas = this.signatureCanvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let x, y;
        if (event.touches) {
            x = (event.touches[0].clientX - rect.left) * scaleX;
            y = (event.touches[0].clientY - rect.top) * scaleY;
        } else {
            x = (event.clientX - rect.left) * scaleX;
            y = (event.clientY - rect.top) * scaleY;
        }
        
        this.signatureCtx.lineTo(x, y);
        this.signatureCtx.stroke();
    }

    // Detener dibujo
    static stopDrawing() {
        this.isDrawing = false;
    }

    // Limpiar firma
    static clearSignature() {
        if (!this.signatureCtx) return;
        this.signatureCtx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
    }

    // Confirmar y enviar firma
    static async confirmSignature(docId) {
        if (!this.signatureUnlocked || !this.signatureCanvas) {
            Toast.error('Error', 'Debe desbloquear el canvas y dibujar su firma');
            return;
        }

        // Verificar que haya algo dibujado
        const imageData = this.signatureCtx.getImageData(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
        let hasDrawing = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
            // Verificar si hay píxeles no transparentes (canal alpha > 0)
            if (imageData.data[i + 3] > 0) {
                hasDrawing = true;
                break;
            }
        }

        if (!hasDrawing) {
            Toast.error('Error', 'Debe dibujar su firma antes de confirmar');
            return;
        }

        // Capturar imagen del canvas
        const signatureImage = this.signatureCanvas.toDataURL('image/png');

        const btn = document.getElementById('btnConfirmarFirma');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Firmando...';

        // Enviar firma
        const result = await DocumentManager.signDocument(
            docId, 
            AuthManager.getUser().id, 
            this.currentVerificationCode,
            this.currentPersonalCode,
            signatureImage
        );

        if (result.success) {
            Toast.success('Documento firmado', `Código de su firma: ${result.firma.codigoVerificacion}`);
            // Resetear variables
            this.signatureUnlocked = false;
            this.currentDocId = null;
            this.currentVerificationCode = null;
            this.currentPersonalCode = null;
            this.navigate('ver-documento', { id: docId });
        } else {
            Toast.error('Error', result.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Confirmar Firma';
        }
    }

    // Función antigua (mantener para compatibilidad)
    static async handleSignDocument(docId) {
        // Redirigir al nuevo flujo
        this.verifyDocumentCode(docId);
    }

    // Generar PDF del documento
    static async generateDocumentPDF(docId) {
        const doc = await DocumentManager.getById(docId);
        if (!doc) {
            Toast.error('Error', 'Documento no encontrado');
            return;
        }

        Toast.info('Generando PDF', 'Por favor espere...');
        // Siempre generar con firmas (el parámetro includeSignature ya no se usa, siempre muestra todas)
        const result = await PDFGenerator.generatePDFFromHTML(doc, true);
        
        if (result.success) {
            Toast.success('PDF generado', `Archivo: ${result.fileName}`);
        } else {
            Toast.error('Error', result.message || 'No se pudo generar el PDF');
        }
    }

    // Generar PDF con firma específica
    static async generatePDFWithSignature(docId, userId) {
        const doc = await DocumentManager.getById(docId);
        if (!doc) {
            Toast.error('Error', 'Documento no encontrado');
            return;
        }

        const firmas = doc.firmas ? Object.values(doc.firmas) : [];
        const signatureData = firmas.find(f => f.userId === userId);
        
        if (!signatureData) {
            Toast.error('Error', 'Firma no encontrada');
            return;
        }

        Toast.info('Generando PDF', 'Por favor espere...');
        const result = await PDFGenerator.generatePDFFromHTML(doc, true, signatureData);
        
        if (result.success) {
            Toast.success('PDF generado', `Archivo: ${result.fileName}`);
        } else {
            Toast.error('Error', result.message || 'No se pudo generar el PDF');
        }
    }

    // ========================================================
    // ESTADO DE FIRMAS
    // ========================================================
    static async renderEstadoFirmas(docId) {
        if (!AuthManager.isAdmin() && !AuthManager.isEncargado()) {
            document.getElementById('contentArea').innerHTML = `
                <div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso Denegado</h3><p>No tiene permisos</p></div>
            `;
            return;
        }

        const doc = await DocumentManager.getById(docId);
        if (!doc) {
            document.getElementById('contentArea').innerHTML = `
                <div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Documento no encontrado</h3>
                <button class="btn btn-primary" onclick="App.navigate('documentos')">Volver</button></div>
            `;
            return;
        }

        const firmas = doc.firmas ? Object.values(doc.firmas) : [];
        const firmasRequeridas = doc.firmasRequeridas || [];
        const allUsers = await AuthManager.getAllUsers();
        
        // Obtener usuarios requeridos
        const usuariosRequeridos = firmasRequeridas.map(userId => {
            const user = allUsers.find(u => u.id === userId);
            const hasSigned = firmas.some(f => f.userId === userId);
            return {
                user: user,
                hasSigned: hasSigned,
                firma: hasSigned ? firmas.find(f => f.userId === userId) : null
            };
        }).filter(item => item.user); // Filtrar usuarios que no existen

        const content = document.getElementById('contentArea');
        content.innerHTML = `
            <div style="margin-bottom:16px;">
                <button class="btn btn-outline btn-sm" onclick="App.navigate('ver-documento', {id:'${docId}'})"><i class="fas fa-arrow-left"></i> Volver al Documento</button>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-clipboard-check" style="margin-right:8px;color:var(--primary);"></i>Estado de Firmas</h3>
                    <button class="btn btn-primary btn-sm" onclick="App.generateDocumentPDF('${docId}')"><i class="fas fa-file-pdf"></i> Generar PDF General</button>
                </div>
                <div class="card-body">
                    <div style="margin-bottom:20px;">
                        <h4 style="margin-bottom:10px;">${doc.titulo}</h4>
                        <p style="color:var(--text-secondary);font-size:0.9rem;">Código: ${doc.codigo}</p>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
                        <div style="padding:15px;background:rgba(46,125,50,0.1);border-radius:var(--radius-sm);border-left:4px solid var(--success);">
                            <div style="font-size:2rem;font-weight:bold;color:var(--success);">${firmas.length}</div>
                            <div style="color:var(--text-secondary);font-size:0.9rem;">Firmas recibidas</div>
                        </div>
                        <div style="padding:15px;background:rgba(245,127,23,0.1);border-radius:var(--radius-sm);border-left:4px solid var(--warning);">
                            <div style="font-size:2rem;font-weight:bold;color:var(--warning);">${Math.max(0, firmasRequeridas.length - firmas.length)}</div>
                            <div style="color:var(--text-secondary);font-size:0.9rem;">Firmas pendientes</div>
                        </div>
                    </div>

                    <h4 style="margin-bottom:15px;margin-top:30px;">Firmantes Requeridos</h4>
                    ${usuariosRequeridos.length > 0 ? `
                        <div class="table-container">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Rol</th>
                                        <th>Departamento</th>
                                        <th>Estado</th>
                                        <th>Fecha de Firma</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${usuariosRequeridos.map(item => {
                                        const user = item.user;
                                        const dep = App._depsMap[user.departamento] || DEPARTAMENTOS[user.departamento];
                                        return `
                                            <tr>
                                                <td>
                                                    <div style="display:flex;align-items:center;gap:10px;">
                                                        <div class="user-avatar-sm" style="background:${dep?.color || 'var(--primary)'};">
                                                            ${(user.nombre[0] + user.apellido[0]).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <strong>${user.nombre} ${user.apellido}</strong>
                                                            <br><small style="color:var(--text-light);">${user.email}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span class="role-badge ${user.rol}">${ROLES[user.rol]?.nombre || user.rol}</span></td>
                                                <td><span class="dep-chip" style="background:${dep?.color || '#546e7a'};"><i class="${dep?.icono || 'fas fa-building'}"></i> ${dep?.nombre || 'N/A'}</span></td>
                                                <td>
                                                    ${item.hasSigned ? `
                                                        <span class="status-badge aprobada"><i class="fas fa-check-circle"></i> Firmado</span>
                                                    ` : `
                                                        <span class="status-badge pendiente"><i class="fas fa-clock"></i> Pendiente</span>
                                                    `}
                                                </td>
                                                <td>
                                                    ${item.hasSigned && item.firma ? formatDateTime(item.firma.fecha) : '<span style="color:var(--text-light);">-</span>'}
                                                </td>
                                                <td>
                                                    ${item.hasSigned && item.firma ? `
                                                        <button class="btn btn-sm btn-primary" onclick="App.generatePDFWithSignature('${docId}', '${item.firma.userId}')">
                                                            <i class="fas fa-file-pdf"></i> PDF con Firma
                                                        </button>
                                                    ` : '<span style="color:var(--text-light);font-size:0.85rem;">Sin firma</span>'}
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-info-circle"></i>
                            <h3>No hay firmantes requeridos</h3>
                            <p>Este documento no tiene firmantes requeridos asignados</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // ========================================================
    // SOLICITUDES
    // ========================================================
    static async renderSolicitudes() {
        const user = AuthManager.getUser();
        const requests = (await RequestManager.getByUser(user.id)).sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));
        this._cachedRequests = requests;

        const content = document.getElementById('contentArea');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-clipboard-list" style="margin-right:8px;color:var(--primary);"></i>Mis Solicitudes</h3>
                    <button class="btn btn-primary btn-sm" onclick="App.navigate('nueva-solicitud')">Nueva</button>
                </div>
                <div class="card-body">
                    <div class="tabs" id="reqTabs">
                        <button class="tab active" data-tab="todas" onclick="App.filterRequests('todas')">Todas (${requests.length})</button>
                        <button class="tab" data-tab="pendiente" onclick="App.filterRequests('pendiente')">Pendientes (${requests.filter(r=>RequestManager.isEstadoPendienteEmpleado(r.estado)).length})</button>
                        <button class="tab" data-tab="aprobada" onclick="App.filterRequests('aprobada')">Aprobadas (${requests.filter(r=>r.estado==='aprobada').length})</button>
                        <button class="tab" data-tab="rechazada" onclick="App.filterRequests('rechazada')">Rechazadas (${requests.filter(r=>r.estado==='rechazada').length})</button>
                    </div>
                    <div id="reqListContainer">${this.renderRequestList(requests)}</div>
                </div>
            </div>
        `;
    }

    static _cachedRequests = [];

    static renderRequestList(requests) {
        if (requests.length === 0) {
            return `<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>No hay solicitudes</h3><p>Aún no has realizado ninguna solicitud</p>
                <button class="btn btn-primary btn-sm" onclick="App.navigate('nueva-solicitud')">Nueva</button></div>`;
        }

        return requests.map(req => {
            const datos = req.datos || {};
            let datesHtml = '';
            if (datos.fecha_inicio && datos.fecha_fin) {
                const days = RequestManager.calcDays(datos.fecha_inicio, datos.fecha_fin);
                datesHtml = `<div class="request-dates">
                    <div class="date-item"><label>Inicio</label><span>${formatDate(datos.fecha_inicio)}</span></div>
                    <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                    <div class="date-item"><label>Fin</label><span>${formatDate(datos.fecha_fin)}</span></div>
                    <span class="request-days-badge"><i class="fas fa-calendar-day"></i> ${days} día(s)</span>
                </div>`;
            } else if (datos.fecha) {
                datesHtml = `<div class="request-dates">
                    <div class="date-item"><label>Fecha</label><span>${formatDate(datos.fecha)}</span></div>
                    ${datos.hora_ingreso ? `<div class="date-item"><label>Hora ingreso</label><span>${datos.hora_ingreso}</span></div>` : ''}
                    ${datos.hora_salida ? `<div class="date-item"><label>Hora salida</label><span>${datos.hora_salida}</span></div>` : ''}
                </div>`;
            } else if (req.tipo === 'horas_extraordinarias' && Array.isArray(datos.filas) && datos.filas.length) {
                const n = datos.filas.length;
                datesHtml = `<div class="request-dates"><div class="date-item"><label>Registros</label><span>${n} fila(s) de horas</span></div></div>`;
            }

            const cardEst = this.claseCardEstadoSolicitud(req.estado);
            const pendienteUi = RequestManager.isEstadoPendienteEmpleado(req.estado);
            return `<div class="request-card status-${cardEst}">
                <div class="request-header">
                    <h4><i class="${TIPOS_SOLICITUD[req.tipo]?.icono || 'fas fa-file'}" style="margin-right:8px;color:${TIPOS_SOLICITUD[req.tipo]?.color || 'var(--primary)'};"></i>${req.tipoNombre}</h4>
                    <span class="status-badge ${cardEst}"><i class="fas fa-${pendienteUi ? 'clock' : req.estado === 'aprobada' ? 'check-circle' : 'times-circle'}"></i> ${this.etiquetaEstadoSolicitud(req.estado)}</span>
                </div>
                ${datesHtml}
                ${req.observaciones ? `<p style="font-size:0.85rem;color:var(--text-secondary);padding:10px;background:var(--bg-main);border-radius:var(--radius-sm);border-left:3px solid var(--primary);margin-bottom:10px;"><strong>Observaciones:</strong> ${req.observaciones}</p>` : ''}
                ${datos.motivo ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;"><strong>Motivo:</strong> ${datos.motivo}</p>` : ''}
                ${req.firmaEncargado?.nombre ? `<p style="font-size:0.78rem;color:var(--text-secondary);padding:8px;background:var(--bg-main);border-radius:var(--radius-sm);margin-bottom:8px;"><strong>Firma Encargado de Área:</strong> ${req.firmaEncargado.nombre} — ${formatDateTime(req.firmaEncargado.fecha)}</p>` : ''}
                ${req.revisionTI?.nombre ? `<p style="font-size:0.78rem;color:var(--text-secondary);padding:8px;background:var(--bg-main);border-radius:var(--radius-sm);margin-bottom:8px;"><strong>Revisión TI:</strong> ${req.revisionTI.nombre} — ${formatDateTime(req.revisionTI.fecha)}</p>` : ''}
                ${req.justificacion ? `<p style="font-size:0.85rem;padding:10px;background:rgba(245,127,23,0.08);border-radius:var(--radius-sm);border-left:3px solid var(--warning);margin-bottom:10px;"><strong>Respuesta:</strong> ${req.justificacion}</p>` : ''}
                ${req.respondidoPorNombre ? `<p style="font-size:0.78rem;color:var(--text-light);">Respondido por: ${req.respondidoPorNombre} — ${formatDateTime(req.fechaRespuesta)}</p>` : ''}
                <p style="font-size:0.78rem;color:var(--text-light);margin-top:5px;">Solicitado: ${formatDateTime(req.fechaSolicitud)}</p>
            </div>`;
        }).join('');
    }

    static filterRequests(status) {
        document.querySelectorAll('#reqTabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`#reqTabs .tab[data-tab="${status}"]`)?.classList.add('active');
        let requests = this._cachedRequests;
        if (status === 'pendiente') requests = requests.filter(r => RequestManager.isEstadoPendienteEmpleado(r.estado));
        else if (status !== 'todas') requests = requests.filter(r => r.estado === status);
        document.getElementById('reqListContainer').innerHTML = this.renderRequestList(requests);
    }

    // ========================================================
    // NUEVA SOLICITUD
    // ========================================================
    static _usersByCedulaCache = null;

    static normalizeCedula(cedula) {
        return String(cedula || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, '');
    }

    static normalizeCedulaDigits(cedula) {
        return String(cedula || '')
            .trim()
            .replace(/\D/g, '');
    }

    static async getUserByCedula(cedula) {
        const normalized = this.normalizeCedula(cedula);
        const normalizedDigits = this.normalizeCedulaDigits(cedula);
        if (!normalized) return null;

        if (!this._usersByCedulaCache) {
            this._usersByCedulaCache = new Map();
            try {
                const users = await AuthManager.getAllUsers();
                (users || []).forEach(u => {
                    const key = this.normalizeCedula(u.cedula);
                    const digitsKey = this.normalizeCedulaDigits(u.cedula);
                    if (key) this._usersByCedulaCache.set(key, u);
                    if (digitsKey) this._usersByCedulaCache.set(digitsKey, u);
                });
            } catch (error) {
                // En perfiles sin permisos para leer todos los usuarios, usar fallback local.
                console.warn('No se pudo cargar lista completa de usuarios para autocompletar por cédula:', error);
            }

            const current = AuthManager.getUser();
            if (current?.cedula) {
                const key = this.normalizeCedula(current.cedula);
                const digitsKey = this.normalizeCedulaDigits(current.cedula);
                if (key) this._usersByCedulaCache.set(key, current);
                if (digitsKey) this._usersByCedulaCache.set(digitsKey, current);
            }
        }

        return this._usersByCedulaCache.get(normalized) ||
            (normalizedDigits ? this._usersByCedulaCache.get(normalizedDigits) : null) ||
            null;
    }

    static setupRequestCedulaAutofill(type) {
        const cedulaEl = document.getElementById('reqCedula');
        if (!cedulaEl) return;

        const puestoEl = document.getElementById('reqPuesto');
        const nombreEl = document.getElementById('reqNombreEmpleado');
        const depEl = document.getElementById('reqDepartamentoNombre');
        let timer = null;

        const run = async () => {
            const cedula = cedulaEl.value;
            if (!this.normalizeCedula(cedula)) {
                if (nombreEl) nombreEl.value = '';
                if (depEl) depEl.value = '';
                if (type) this.updateRequestPreview(type);
                return;
            }

            const matched = await this.getUserByCedula(cedula);
            if (matched) {
                const dep = App._depsMap[matched.departamento] || DEPARTAMENTOS[matched.departamento];
                if (puestoEl && matched.puesto) puestoEl.value = matched.puesto;
                if (nombreEl) nombreEl.value = `${matched.nombre || ''} ${matched.apellido || ''}`.trim();
                if (depEl) depEl.value = dep?.nombre || matched.departamento || '';
            } else {
                if (nombreEl) nombreEl.value = '';
                if (depEl) depEl.value = '';
            }

            if (type) this.updateRequestPreview(type);
        };

        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { run(); }, 220);
        };

        cedulaEl.addEventListener('input', schedule);
        cedulaEl.addEventListener('change', schedule);
        run();
    }

    static setupHorasExtraCedulaAutofill() {
        const cedulaEl = document.getElementById('heCedula');
        if (!cedulaEl) return;

        const puestoEl = document.getElementById('hePuesto');
        const nombreEl = document.getElementById('heNombreEmpleado');
        const depEl = document.getElementById('heArea');
        let timer = null;

        const run = async () => {
            const cedula = cedulaEl.value;
            if (!this.normalizeCedula(cedula)) {
                if (nombreEl) nombreEl.value = '';
                if (depEl) depEl.value = '';
                this.updateRequestPreview('horas_extraordinarias');
                return;
            }

            const matched = await this.getUserByCedula(cedula);
            if (matched) {
                const dep = App._depsMap[matched.departamento] || DEPARTAMENTOS[matched.departamento];
                if (puestoEl && matched.puesto) puestoEl.value = matched.puesto;
                if (nombreEl) nombreEl.value = `${matched.nombre || ''} ${matched.apellido || ''}`.trim();
                if (depEl) depEl.value = dep?.nombre || matched.departamento || '';
            } else {
                if (nombreEl) nombreEl.value = '';
            }

            this.updateRequestPreview('horas_extraordinarias');
        };

        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { run(); }, 220);
        };

        cedulaEl.addEventListener('input', schedule);
        cedulaEl.addEventListener('change', schedule);
        run();
    }

    static renderNuevaSolicitud() {
        const content = document.getElementById('contentArea');
        content.innerHTML = `
            <div style="margin-bottom:16px;">
                <button class="btn btn-outline btn-sm" onclick="App.navigate('solicitudes')"><i class="fas fa-arrow-left"></i> Volver</button>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-plus-circle" style="margin-right:8px;color:var(--primary);"></i>Nueva Solicitud</h3>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>Tipo de Solicitud <span class="required">*</span></label>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:8px;" id="reqTypeGrid">
                            ${Object.keys(TIPOS_SOLICITUD).map(key => {
                                const tipo = TIPOS_SOLICITUD[key];
                                return `<div class="req-type-card" data-type="${key}" onclick="App.selectRequestType('${key}')"
                                    style="padding:20px;border:2px solid var(--border);border-radius:var(--radius-md);text-align:center;cursor:pointer;transition:var(--transition);">
                                    <i class="${tipo.icono}" style="font-size:1.8rem;color:${tipo.color};margin-bottom:8px;display:block;"></i>
                                    <h4 style="font-size:0.88rem;">${tipo.nombre}</h4>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                    <div id="reqFormContainer" style="display:none;margin-top:24px;border-top:1px solid var(--border);padding-top:24px;"></div>
                </div>
            </div>
        `;
    }

    static selectRequestType(type) {
        document.querySelectorAll('.req-type-card').forEach(c => { c.style.borderColor = 'var(--border)'; c.style.background = ''; });
        const selected = document.querySelector(`.req-type-card[data-type="${type}"]`);
        if (selected) { selected.style.borderColor = TIPOS_SOLICITUD[type]?.color || 'var(--primary)'; selected.style.background = 'rgba(21, 101, 192, 0.03)'; }

        if (type === 'horas_extraordinarias') {
            this.selectRequestTypeHorasExtra();
            return;
        }

        const container = document.getElementById('reqFormContainer');
        container.style.display = 'block';
        const tipo = TIPOS_SOLICITUD[type];
        let fieldsHtml = '';

        if (tipo.campos.includes('fecha_inicio') && tipo.campos.includes('fecha_fin')) {
            fieldsHtml += `<div class="form-row"><div class="form-group"><label>Fecha Inicio <span class="required">*</span></label><input type="date" class="form-control" id="reqFechaInicio" required></div>
                <div class="form-group"><label>Fecha Fin <span class="required">*</span></label><input type="date" class="form-control" id="reqFechaFin" required></div></div>`;
        }
        if (tipo.campos.includes('fecha') && !tipo.campos.includes('fecha_inicio')) {
            fieldsHtml += `<div class="form-group"><label>Fecha <span class="required">*</span></label><input type="date" class="form-control" id="reqFecha" required></div>`;
        }
        if (tipo.campos.includes('hora_ingreso')) fieldsHtml += `<div class="form-group"><label>Hora de Ingreso</label><input type="time" class="form-control" id="reqHoraIngreso"></div>`;
        if (tipo.campos.includes('hora_salida')) fieldsHtml += `<div class="form-group"><label>Hora de Salida</label><input type="time" class="form-control" id="reqHoraSalida"></div>`;
        if (tipo.campos.includes('cedula') || tipo.campos.includes('puesto')) {
            fieldsHtml += `<div class="form-row">
                ${tipo.campos.includes('cedula') ? '<div class="form-group"><label>Número de cédula <span class="required">*</span></label><input type="text" class="form-control" id="reqCedula" placeholder="Ej: 1-2345-6789" required></div>' : ''}
                ${tipo.campos.includes('puesto') ? '<div class="form-group"><label>Puesto <span class="required">*</span></label><input type="text" class="form-control" id="reqPuesto" placeholder="Ej: Analista Administrativo" required></div>' : ''}
            </div>`;
            fieldsHtml += `<div class="form-row">
                <div class="form-group"><label>Nombre del empleado</label><input type="text" class="form-control" id="reqNombreEmpleado" readonly></div>
                <div class="form-group"><label>Departamento</label><input type="text" class="form-control" id="reqDepartamentoNombre" readonly></div>
            </div>`;
        }
        if (tipo.campos.includes('fecha_ingreso')) {
            fieldsHtml += `<div class="form-group"><label>Fecha de ingreso a la empresa <span class="required">*</span></label><input type="date" class="form-control" id="reqFechaIngreso" required></div>`;
        }
        if (tipo.campos.includes('horario_actual')) {
            fieldsHtml += `<div class="form-row"><div class="form-group"><label>Horario Actual</label><input type="text" class="form-control" id="reqHorarioActual" placeholder="Ej: 8:00 AM - 5:00 PM"></div>
                <div class="form-group"><label>Horario Solicitado</label><input type="text" class="form-control" id="reqHorarioSolicitado" placeholder="Ej: 9:00 AM - 6:00 PM"></div></div>`;
        }
        if (tipo.campos.includes('institucion')) fieldsHtml += `<div class="form-group"><label>Institución</label><input type="text" class="form-control" id="reqInstitucion" placeholder="Nombre de la institución educativa"></div>`;
        if (tipo.campos.includes('descripcion')) fieldsHtml += `<div class="form-group"><label>Descripción</label><input type="text" class="form-control" id="reqDescripcion" placeholder="Descripción del día festivo"></div>`;
        if (tipo.campos.includes('motivo')) fieldsHtml += `<div class="form-group"><label>Motivo <span class="required">*</span></label><textarea class="form-control" id="reqMotivo" rows="3" placeholder="Explique el motivo de su solicitud..."></textarea></div>`;
        fieldsHtml += `<div class="form-group"><label>Observaciones adicionales</label><textarea class="form-control" id="reqObservaciones" rows="2" placeholder="Observaciones opcionales..."></textarea></div>`;

        // Bloque de previsualización para todos los tipos de solicitud
        const previewHtml = `
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-light);">
                <h4 style="margin-bottom:8px;font-size:0.8rem;color:var(--text-light);text-transform:uppercase;letter-spacing:0.12em;">
                    Previsualización de la solicitud
                </h4>
                <div id="reqPreviewBox" style="border:1px solid var(--border);border-radius:var(--radius-md);padding:14px 16px;background:#f9fafb;max-height:320px;overflow:auto;">
                    <pre id="reqPreviewText" style="white-space:pre-wrap;font-family:'Times New Roman', serif;font-size:0.9rem;line-height:1.5;margin:0;"></pre>
                </div>
                <p style="margin-top:6px;font-size:0.75rem;color:var(--text-light);">
                    Este texto es una previsualización. La aprobación o rechazo se realiza desde "Gestionar Solicitudes".
                </p>
            </div>
        `;

        container.innerHTML = `
            <h3 style="margin-bottom:20px;"><i class="${tipo.icono}" style="margin-right:8px;color:${tipo.color};"></i>${tipo.nombre}</h3>
            <form id="reqForm" onsubmit="App.handleCreateRequest(event, '${type}')">
                ${fieldsHtml}
                <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
                    <button type="button" class="btn btn-outline" onclick="App.navigate('solicitudes')">Cancelar</button>
                    <button type="submit" class="btn btn-primary btn-lg" id="btnEnviarReq"><i class="fas fa-paper-plane"></i> Enviar Solicitud</button>
                </div>
            </form>
            ${previewHtml}
        `;

        // Inicializar y actualizar previsualización para todos los tipos
        const previewInputIds = ['reqCedula', 'reqPuesto', 'reqFechaIngreso', 'reqFechaInicio', 'reqFechaFin', 'reqFecha', 'reqHoraIngreso', 'reqHoraSalida', 'reqHorarioActual', 'reqHorarioSolicitado', 'reqInstitucion', 'reqDescripcion', 'reqMotivo', 'reqObservaciones'];
        const update = () => App.updateRequestPreview(type);
        previewInputIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', update);
            if (el) el.addEventListener('change', update);
        });
        App.setupRequestCedulaAutofill(type);
        App.updateRequestPreview(type);
    }

    static selectRequestTypeHorasExtra() {
        const container = document.getElementById('reqFormContainer');
        container.style.display = 'block';
        const tipo = TIPOS_SOLICITUD.horas_extraordinarias;
        const fila = (i) => `
            <tr data-he-row="${i}">
                <td style="padding:6px;"><input type="date" class="form-control he-fecha" style="min-width:130px;"></td>
                <td style="padding:6px;"><input type="time" class="form-control he-inicio"></td>
                <td style="padding:6px;"><input type="time" class="form-control he-fin"></td>
                <td style="padding:6px;"><input type="text" class="form-control he-cantidad" placeholder="Auto" readonly></td>
                <td style="padding:6px;"><input type="text" class="form-control he-justif" placeholder="Justificación"></td>
                <td style="padding:6px;width:44px;"><button type="button" class="btn btn-outline btn-sm" onclick="App.removeHorasExtraRow(${i})" title="Quitar fila"><i class="fas fa-times"></i></button></td>
            </tr>`;
        let rowsHtml = '';
        for (let i = 0; i < 4; i++) rowsHtml += fila(i);

        const previewHtml = `
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border-light);">
                <h4 style="margin-bottom:8px;font-size:0.8rem;color:var(--text-light);text-transform:uppercase;letter-spacing:0.12em;">Previsualización</h4>
                <div id="reqPreviewBox" style="border:1px solid var(--border);border-radius:var(--radius-md);padding:14px 16px;background:#f9fafb;max-height:320px;overflow:auto;">
                    <pre id="reqPreviewText" style="white-space:pre-wrap;font-family:'Times New Roman', serif;font-size:0.9rem;line-height:1.5;margin:0;"></pre>
                </div>
                <p style="margin-top:6px;font-size:0.75rem;color:var(--text-light);">Tras enviar, <strong>TI</strong> revisará y certificará; luego <strong>Gerencia General</strong> resolverá.</p>
            </div>`;

        container.innerHTML = `
            <h3 style="margin-bottom:12px;"><i class="${tipo.icono}" style="margin-right:8px;color:${tipo.color};"></i>${tipo.nombre}</h3>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">Formulario oficial de reporte y autorización de horas extraordinarias (RC.400.5.1). El flujo es: envío → revisión <strong>Tecnologías de Información</strong> → resolución <strong>Gerencia General</strong>.</p>
            <form id="reqForm" onsubmit="App.handleCreateRequest(event, 'horas_extraordinarias')">
                <h4 style="font-size:0.78rem;color:var(--text-light);text-transform:uppercase;margin:16px 0 8px;">1. Identificación del colaborador</h4>
                <div class="form-row">
                    <div class="form-group"><label>Número de identificación <span class="required">*</span></label><input type="text" class="form-control" id="heCedula" required placeholder="Cédula o documento"></div>
                    <div class="form-group"><label>Puesto <span class="required">*</span></label><input type="text" class="form-control" id="hePuesto" required></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Nombre del empleado</label><input type="text" class="form-control" id="heNombreEmpleado" readonly></div>
                    <div class="form-group"><label>Departamento / área</label><input type="text" class="form-control" id="heArea" placeholder="Se autocompleta por cédula"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Jefatura inmediata <span class="required">*</span></label><input type="text" class="form-control" id="heJefatura" required></div>
                </div>
                <h4 style="font-size:0.78rem;color:var(--text-light);text-transform:uppercase;margin:20px 0 8px;">2. Detalle de horas extraordinarias</h4>
                <div style="overflow-x:auto;">
                    <table style="width:100%;font-size:0.85rem;border-collapse:collapse;">
                        <thead><tr style="background:var(--bg-main);">
                            <th>Fecha</th><th>Inicio</th><th>Fin</th><th>Cantidad</th><th>Justificación</th><th></th>
                        </tr></thead>
                        <tbody id="heFilasBody">${rowsHtml}</tbody>
                    </table>
                </div>
                <button type="button" class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="App.addHorasExtraRow()" id="btnHeAddRow"><i class="fas fa-plus"></i> Agregar fila (máx. 8)</button>
                <div class="form-group" style="margin-top:16px;"><label>Observaciones adicionales</label><textarea class="form-control" id="heObservaciones" rows="2"></textarea></div>
                <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;">
                    <button type="button" class="btn btn-outline" onclick="App.navigate('solicitudes')">Cancelar</button>
                    <button type="submit" class="btn btn-primary btn-lg" id="btnEnviarReq"><i class="fas fa-paper-plane"></i> Enviar Solicitud</button>
                </div>
            </form>
            ${previewHtml}`;

        this._heRowCounter = 4;
        const upd = () => App.updateRequestPreview('horas_extraordinarias');
        ['heCedula', 'hePuesto', 'heNombreEmpleado', 'heArea', 'heJefatura', 'heObservaciones'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.addEventListener('input', upd); el.addEventListener('change', upd); }
        });
        this.setupHorasExtraCedulaAutofill();
        document.getElementById('heFilasBody').addEventListener('input', (e) => {
            if (e.target?.classList?.contains('he-inicio') || e.target?.classList?.contains('he-fin')) {
                this.recalculateHorasExtraRow(e.target.closest('tr'));
            }
            upd();
        });
        document.getElementById('heFilasBody').addEventListener('change', (e) => {
            if (e.target?.classList?.contains('he-inicio') || e.target?.classList?.contains('he-fin')) {
                this.recalculateHorasExtraRow(e.target.closest('tr'));
            }
            upd();
        });
        this.recalculateAllHorasExtraRows();
        upd();
    }

    static addHorasExtraRow() {
        const body = document.getElementById('heFilasBody');
        if (!body || body.querySelectorAll('tr').length >= 8) {
            Toast.error('Límite', 'Máximo 8 filas');
            return;
        }
        const i = this._heRowCounter++;
        const tr = document.createElement('tr');
        tr.dataset.heRow = String(i);
        tr.innerHTML = `
            <td style="padding:6px;"><input type="date" class="form-control he-fecha" style="min-width:130px;"></td>
            <td style="padding:6px;"><input type="time" class="form-control he-inicio"></td>
            <td style="padding:6px;"><input type="time" class="form-control he-fin"></td>
            <td style="padding:6px;"><input type="text" class="form-control he-cantidad" placeholder="Auto" readonly></td>
            <td style="padding:6px;"><input type="text" class="form-control he-justif" placeholder="Justificación"></td>
            <td style="padding:6px;width:44px;"><button type="button" class="btn btn-outline btn-sm" onclick="App.removeHorasExtraRow(${i})" title="Quitar fila"><i class="fas fa-times"></i></button></td>`;
        body.appendChild(tr);
        this.recalculateHorasExtraRow(tr);
        App.updateRequestPreview('horas_extraordinarias');
    }

    static removeHorasExtraRow(rowId) {
        const body = document.getElementById('heFilasBody');
        if (!body || body.querySelectorAll('tr').length <= 1) {
            Toast.error('Formulario', 'Debe quedar al menos una fila');
            return;
        }
        const tr = body.querySelector(`tr[data-he-row="${rowId}"]`);
        if (tr) tr.remove();
        App.updateRequestPreview('horas_extraordinarias');
    }

    static recalculateHorasExtraRow(tr) {
        if (!tr) return;
        const hi = tr.querySelector('.he-inicio')?.value?.trim() || '';
        const hf = tr.querySelector('.he-fin')?.value?.trim() || '';
        const cantidadEl = tr.querySelector('.he-cantidad');
        if (!cantidadEl) return;
        if (!hi || !hf) {
            cantidadEl.value = '';
            return;
        }
        const [hiH, hiM] = hi.split(':').map(Number);
        const [hfH, hfM] = hf.split(':').map(Number);
        if ([hiH, hiM, hfH, hfM].some(Number.isNaN)) {
            cantidadEl.value = '';
            return;
        }
        let totalMin = (hfH * 60 + hfM) - (hiH * 60 + hiM);
        if (totalMin < 0) totalMin += 24 * 60;
        const horas = Math.floor(totalMin / 60);
        const minutos = totalMin % 60;
        if (minutos === 0) {
            cantidadEl.value = `${horas} h`;
        } else {
            cantidadEl.value = `${horas} h ${minutos} min`;
        }
    }

    static recalculateAllHorasExtraRows() {
        document.querySelectorAll('#heFilasBody tr').forEach(tr => this.recalculateHorasExtraRow(tr));
    }

    static collectHorasExtraFormDatos(strict) {
        const cedula = document.getElementById('heCedula')?.value?.trim() || '';
        const puesto = document.getElementById('hePuesto')?.value?.trim() || '';
        const area = document.getElementById('heArea')?.value?.trim() || '';
        const jefatura = document.getElementById('heJefatura')?.value?.trim() || '';
        const filas = [];
        document.querySelectorAll('#heFilasBody tr').forEach(tr => {
            const fecha = tr.querySelector('.he-fecha')?.value?.trim();
            const hi = tr.querySelector('.he-inicio')?.value?.trim();
            const hf = tr.querySelector('.he-fin')?.value?.trim();
            this.recalculateHorasExtraRow(tr);
            const cant = tr.querySelector('.he-cantidad')?.value?.trim();
            const just = tr.querySelector('.he-justif')?.value?.trim();
            if (fecha || hi || hf || cant || just) {
                filas.push({ fecha, hora_inicio: hi, hora_fin: hf, cantidad: cant, justificacion: just });
            }
        });
        if (strict) {
            if (!cedula || !puesto || !jefatura) {
                return { error: 'Complete número de identificación, puesto y jefatura inmediata.' };
            }
            if (filas.length === 0) {
                return { error: 'Agregue al menos una fila con datos en el detalle de horas extraordinarias.' };
            }
        }
        return {
            datos: {
                cedula,
                puesto,
                nombre_empleado: document.getElementById('heNombreEmpleado')?.value?.trim() || '',
                area_departamento: area,
                jefatura_inmediata: jefatura,
                filas
            }
        };
    }

    static async handleCreateRequest(e, type) {
        e.preventDefault();
        if (type === 'horas_extraordinarias') {
            const res = this.collectHorasExtraFormDatos(true);
            if (res.error) {
                Toast.error('Formulario', res.error);
                return;
            }
            const observaciones = document.getElementById('heObservaciones')?.value || '';
            this._pendingRequest = { tipo: type, datos: res.datos, observaciones };
            this.openRequestSignatureModal();
            return;
        }

        const datos = {};
        const fields = {
            reqCedula: 'cedula', reqPuesto: 'puesto', reqFechaIngreso: 'fecha_ingreso',
            reqNombreEmpleado: 'nombre_empleado', reqDepartamentoNombre: 'departamento_nombre',
            reqFechaInicio: 'fecha_inicio', reqFechaFin: 'fecha_fin', reqFecha: 'fecha',
            reqHoraIngreso: 'hora_ingreso', reqHoraSalida: 'hora_salida',
            reqHorarioActual: 'horario_actual', reqHorarioSolicitado: 'horario_solicitado',
            reqInstitucion: 'institucion', reqDescripcion: 'descripcion', reqMotivo: 'motivo'
        };

        Object.keys(fields).forEach(elId => {
            const el = document.getElementById(elId);
            if (el && el.value) datos[fields[elId]] = el.value;
        });

        const observaciones = document.getElementById('reqObservaciones')?.value || '';

        // Guardar datos temporalmente y abrir flujo de firma (código + firma dibujada)
        this._pendingRequest = {
            tipo: type,
            datos,
            observaciones
        };

        this.openRequestSignatureModal();
    }

    // Abrir modal para firmar la solicitud (código personal + firma dibujada)
    static openRequestSignatureModal() {
        const user = AuthManager.getUser();
        if (!user) {
            Toast.error('Error', 'Usuario no autenticado');
            return;
        }

        if (!this._pendingRequest || !this._pendingRequest.tipo) {
            Toast.error('Error', 'No hay datos de la solicitud para firmar');
            return;
        }

        this.showModal('Firmar Solicitud', `
            <div>
                <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;">
                    Antes de enviar la solicitud, debe confirmar su identidad con su <strong>código personal</strong> y dibujar su firma, igual que en los documentos oficiales.
                </p>

                <!-- Paso 1: Código personal -->
                <div id="reqStepPersonalCode" style="margin-bottom:20px;">
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:10px;">
                        Ingrese su código personal para desbloquear la firma
                    </p>
                    <div style="display:flex;gap:10px;max-width:400px;margin:0 auto;margin-bottom:8px;">
                        <input type="password" class="form-control" id="reqSignPersonalCode" placeholder="Código personal" style="text-align:center;letter-spacing:2px;">
                        <button class="btn btn-primary" id="btnReqDesbloquearFirma" onclick="App.unlockRequestSignatureCanvas()">
                            <i class="fas fa-unlock"></i> Desbloquear
                        </button>
                    </div>
                    <p style="font-size:0.75rem;color:var(--text-light);margin-top:4px;text-align:center;">
                        <i class="fas fa-info-circle"></i> El código personal se configura en su perfil y es requerido para firmar.
                    </p>
                </div>

                <!-- Paso 2: Canvas de firma -->
                <div id="reqStepSignatureCanvas" style="display:none;">
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;text-align:center;">
                        Dibuje su firma en el recuadro para confirmar la solicitud
                    </p>
                    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                        <div style="position:relative;border:2px dashed #1565c0;border-radius:8px;background:white;padding:10px;">
                            <canvas id="signatureCanvas" width="500" height="200" style="display:block;cursor:crosshair;border-radius:4px;"
                                onmousedown="App.startDrawing(event)"
                                onmousemove="App.draw(event)"
                                onmouseup="App.stopDrawing()"
                                onmouseleave="App.stopDrawing()"
                                ontouchstart="App.startDrawing(event)"
                                ontouchmove="App.draw(event)"
                                ontouchend="App.stopDrawing()"></canvas>
                        </div>
                        <div style="display:flex;gap:10px;justify-content:center;">
                            <button class="btn btn-outline" id="btnReqLimpiarFirma" onclick="App.clearSignature()">
                                <i class="fas fa-eraser"></i> Limpiar
                            </button>
                            <button class="btn btn-primary" id="btnReqConfirmarFirma" onclick="App.confirmRequestSignature()">
                                <i class="fas fa-check"></i> Firmar y Enviar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // Inicializar estado de firma para solicitudes
        this.signatureUnlocked = false;
        this.currentPersonalCode = null;
    }

    // Desbloquear canvas de firma para solicitudes (valida código personal)
    static async unlockRequestSignatureCanvas() {
        const personalCode = document.getElementById('reqSignPersonalCode').value.trim();
        if (!personalCode) {
            Toast.error('Error', 'Ingrese su código personal');
            return;
        }

        const user = AuthManager.getUser();
        if (!user) {
            Toast.error('Error', 'Usuario no autenticado');
            return;
        }

        let isValid = false;
        if (user.codigoPersonal) {
            isValid = personalCode === user.codigoPersonal;
        } else {
            try {
                const email = user.email;
                const credential = firebase.auth.EmailAuthProvider.credential(email, personalCode);
                await auth.currentUser.reauthenticateWithCredential(credential);
                isValid = true;
            } catch (error) {
                isValid = false;
            }
        }

        if (!isValid) {
            Toast.error('Error', 'Código personal incorrecto');
            document.getElementById('reqSignPersonalCode').value = '';
            return;
        }

        this.currentPersonalCode = personalCode;
        this.signatureUnlocked = true;
        document.getElementById('reqStepPersonalCode').style.display = 'none';
        document.getElementById('reqStepSignatureCanvas').style.display = 'block';

        // Inicializar canvas
        setTimeout(() => {
            this.initSignatureCanvas();
        }, 100);

        Toast.success('Código válido', 'Puede dibujar su firma ahora');
    }

    // Confirmar firma de la solicitud y crear la solicitud en Firebase
    static async confirmRequestSignature() {
        if (!this.signatureUnlocked || !this.signatureCanvas) {
            Toast.error('Error', 'Debe desbloquear el canvas y dibujar su firma');
            return;
        }

        // Verificar que haya algo dibujado
        const imageData = this.signatureCtx.getImageData(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
        let hasDrawing = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i + 3] > 0) {
                hasDrawing = true;
                break;
            }
        }

        if (!hasDrawing) {
            Toast.error('Error', 'Debe dibujar su firma antes de confirmar');
            return;
        }

        if (!this._pendingRequest || !this._pendingRequest.tipo) {
            Toast.error('Error', 'No hay datos de la solicitud para enviar');
            return;
        }

        const signatureImage = this.signatureCanvas.toDataURL('image/png');

        const btn = document.getElementById('btnReqConfirmarFirma');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        const user = AuthManager.getUser();
        const firma = {
            userId: user.id,
            nombre: user.nombre + ' ' + user.apellido,
            rol: user.rol,
            departamento: user.departamento,
            fecha: new Date().toISOString(),
            codigoPersonal: this.currentPersonalCode || null,
            firmaDibujo: signatureImage
        };

        try {
            const request = await RequestManager.create({
                tipo: this._pendingRequest.tipo,
                datos: this._pendingRequest.datos,
                observaciones: this._pendingRequest.observaciones,
                firma
            });

            Toast.success('Solicitud enviada', `Su solicitud de ${request.tipoNombre} ha sido enviada`);
            this._pendingRequest = null;
            this.signatureUnlocked = false;
            this.currentPersonalCode = null;
            this.closeModal();
            this.navigate('solicitudes');
        } catch (error) {
            console.error('Error creando solicitud con firma:', error);
            Toast.error('Error', 'No se pudo enviar la solicitud');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Firmar y Enviar';
        }
    }

    // Previsualización de la solicitud (todos los tipos); lee el formulario y usa buildRequestText
    static updateRequestPreview(type) {
        const previewEl = document.getElementById('reqPreviewText');
        if (!previewEl) return;

        if (type === 'horas_extraordinarias') {
            const user = AuthManager.getUser() || {};
            const res = this.collectHorasExtraFormDatos(false);
            const d = res.datos || {};
            const depNombre = (App._depsMap[user.departamento] || DEPARTAMENTOS[user.departamento])?.nombre || '';
            if (!d.area_departamento && depNombre) d.area_departamento = depNombre;
            const fakeReq = {
                tipo: 'horas_extraordinarias',
                tipoNombre: TIPOS_SOLICITUD.horas_extraordinarias.nombre,
                datos: d,
                solicitanteNombre: user.nombre && user.apellido ? `${user.nombre} ${user.apellido}` : '[Nombre del colaborador]',
                departamento: user.departamento,
                fechaSolicitud: new Date().toISOString()
            };
            previewEl.textContent = this.buildRequestText(fakeReq);
            return;
        }

        const user = AuthManager.getUser() || {};
        const fieldMap = {
            reqCedula: 'cedula', reqPuesto: 'puesto', reqFechaIngreso: 'fecha_ingreso',
            reqNombreEmpleado: 'nombre_empleado', reqDepartamentoNombre: 'departamento_nombre',
            reqFechaInicio: 'fecha_inicio', reqFechaFin: 'fecha_fin', reqFecha: 'fecha',
            reqHoraIngreso: 'hora_ingreso', reqHoraSalida: 'hora_salida',
            reqHorarioActual: 'horario_actual', reqHorarioSolicitado: 'horario_solicitado',
            reqInstitucion: 'institucion', reqDescripcion: 'descripcion', reqMotivo: 'motivo',
            reqObservaciones: 'observaciones'
        };
        const datos = {};
        Object.keys(fieldMap).forEach(elId => {
            const el = document.getElementById(elId);
            if (el && el.value) datos[fieldMap[elId]] = el.value;
        });

        const fakeReq = {
            tipo: type,
            tipoNombre: TIPOS_SOLICITUD[type]?.nombre || type,
            datos,
            solicitanteNombre: user.nombre && user.apellido ? `${user.nombre} ${user.apellido}` : '[Nombre del empleado]',
            departamento: user.departamento,
            fechaSolicitud: new Date().toISOString()
        };

        previewEl.textContent = this.buildRequestText(fakeReq);
    }

    // ========================================================
    // GESTIONAR SOLICITUDES
    // ========================================================
    static async renderGestionarSolicitudes() {
        const user = AuthManager.getUser();
        if (!user || (!AuthManager.isAdmin() && user.rol !== 'encargado')) {
            document.getElementById('contentArea').innerHTML = `
                <div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso denegado</h3><p>Solo administradores y encargados de área pueden gestionar solicitudes.</p>
                <button type="button" class="btn btn-primary" onclick="App.navigate('dashboard')">Ir al inicio</button></div>`;
            return;
        }

        let requests;
        if (AuthManager.isAdmin()) {
            requests = await RequestManager.getAll();
        } else {
            const all = await RequestManager.getAll();
            const managed = AuthManager.getDepartamentosEncargado(user);
            const byManaged = new Map();
            for (const depId of managed) {
                const part = await RequestManager.getByDepartment(depId);
                part.forEach(r => byManaged.set(r.id, r));
            }
            const extra = [];
            if (AuthManager.encargadoGestionaDepartamento(user, SOLICITUD_HORAS_EXTRA_CONFIG.deptoTI)) {
                extra.push(...all.filter(r => r.tipo === 'horas_extraordinarias' && r.estado === 'pendiente_ti'));
            }
            if (AuthManager.encargadoGestionaDepartamento(user, SOLICITUD_HORAS_EXTRA_CONFIG.deptoGerencia)) {
                extra.push(...all.filter(r => r.estado === 'pendiente_gerencia'));
            }
            const map = new Map();
            [...byManaged.values(), ...extra].forEach(r => map.set(r.id, r));
            requests = Array.from(map.values());
        }
        requests = requests.sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));
        this._cachedMgrRequests = requests;

        const nPend = requests.filter(r => RequestManager.necesitaMiAprobacion(r, user)).length;

        const empMap = new Map();
        for (const r of requests) {
            if (r.solicitante) {
                empMap.set(r.solicitante, r.solicitanteNombre || '');
            }
        }
        const empOptions = [...empMap.entries()]
            .sort((a, b) => (a[1] || '').localeCompare(b[1] || '', 'es', { sensitivity: 'base' }))
            .map(([id, nombre]) => `<option value="${App.escapeHtml(id)}">${App.escapeHtml(nombre || id)}</option>`)
            .join('');

        const content = document.getElementById('contentArea');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-tasks" style="margin-right:8px;color:var(--primary);"></i>Gestionar Solicitudes</h3>
                </div>
                <div class="card-body">
                    <div class="form-group" style="margin-bottom:16px;max-width:min(100%, 420px);">
                        <label for="mgrEmployeeFilter"><i class="fas fa-user" style="margin-right:6px;color:var(--primary);"></i>Empleado</label>
                        <select id="mgrEmployeeFilter" class="form-control" onchange="App.applyMgrRequestFilters()">
                            <option value="">Todos los empleados</option>
                            ${empOptions}
                        </select>
                        <small style="display:block;margin-top:6px;color:var(--text-secondary);font-size:0.8rem;">Muestre todas las solicitudes visibles de una persona (según su rol y departamentos).</small>
                    </div>
                    <div class="tabs" id="mgrTabs">
                        <button class="tab active" data-tab="pendiente" onclick="App.filterMgrRequests('pendiente')">Pendientes <span class="mgr-tab-n" data-mgr-tab="pendiente">(${nPend})</span></button>
                        <button class="tab" data-tab="todas" onclick="App.filterMgrRequests('todas')">Todas <span class="mgr-tab-n" data-mgr-tab="todas">(${requests.length})</span></button>
                        <button class="tab" data-tab="aprobada" onclick="App.filterMgrRequests('aprobada')">Aprobadas <span class="mgr-tab-n" data-mgr-tab="aprobada">(${requests.filter(r=>r.estado==='aprobada').length})</span></button>
                        <button class="tab" data-tab="rechazada" onclick="App.filterMgrRequests('rechazada')">Rechazadas <span class="mgr-tab-n" data-mgr-tab="rechazada">(${requests.filter(r=>r.estado==='rechazada').length})</span></button>
                    </div>
                    <div id="mgrReqContainer">${this.renderManageRequestList(requests.filter(r => RequestManager.necesitaMiAprobacion(r, user)))}</div>
                </div>
            </div>
        `;
    }

    static _cachedMgrRequests = [];

    static renderManageRequestList(requests) {
        if (requests.length === 0) {
            return `<div class="empty-state"><i class="fas fa-check-circle"></i><h3>No hay solicitudes</h3><p>No hay solicitudes en esta categoría</p></div>`;
        }

        return requests.map(req => {
            const datos = req.datos || {};
            const userMgr = AuthManager.getUser();
            const puedoActuar = RequestManager.necesitaMiAprobacion(req, userMgr);
            let datesHtml = '';
            if (datos.fecha_inicio && datos.fecha_fin) {
                const days = RequestManager.calcDays(datos.fecha_inicio, datos.fecha_fin);
                datesHtml = `<div class="request-dates"><div class="date-item"><label>Inicio</label><span>${formatDate(datos.fecha_inicio)}</span></div>
                    <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                    <div class="date-item"><label>Fin</label><span>${formatDate(datos.fecha_fin)}</span></div>
                    <span class="request-days-badge"><i class="fas fa-calendar-day"></i> ${days} día(s)</span></div>`;
            } else if (datos.fecha) {
                datesHtml = `<div class="request-dates"><div class="date-item"><label>Fecha</label><span>${formatDate(datos.fecha)}</span></div>
                    ${datos.hora_ingreso ? `<div class="date-item"><label>Hora</label><span>${datos.hora_ingreso}</span></div>` : ''}
                    ${datos.hora_salida ? `<div class="date-item"><label>Hora</label><span>${datos.hora_salida}</span></div>` : ''}</div>`;
            } else if (req.tipo === 'horas_extraordinarias' && Array.isArray(datos.filas) && datos.filas.length) {
                datesHtml = `<div class="request-dates"><div class="date-item"><label>Filas reportadas</label><span>${datos.filas.length}</span></div></div>`;
            }

            // Texto completo del permiso sin goce salarial para encargados
            let detalleHtml = '';
            if (req.tipo === 'sin_goce') {
                const user = AuthManager.getUser() || {};
                const empresa = APP_CONFIG?.appName || 'La empresa';
                const nombreCompleto = req.solicitanteNombre || 'Empleado';
                const depNombre = (App._depsMap[req.departamento] || DEPARTAMENTOS[req.departamento])?.nombre || 'su departamento';

                const fechaInicioTxt = datos.fecha_inicio ? formatDate(datos.fecha_inicio) : '_____';
                const fechaFinTxt = datos.fecha_fin ? formatDate(datos.fecha_fin) : '_____';
                const diasTxt = (datos.fecha_inicio && datos.fecha_fin)
                    ? `${RequestManager.calcDays(datos.fecha_inicio, datos.fecha_fin)} día(s)`
                    : '_____';
                const fechaReintegroTxt = datos.fecha_fin
                    ? (() => {
                        const d = new Date(datos.fecha_fin + 'T12:00:00');
                        d.setDate(d.getDate() + 1);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return formatDate(`${y}-${m}-${day}`);
                    })()
                    : '_____';
                const motivoTxt = datos.motivo || '______________________________';
                const fechaSolicitudTxt = formatDate(req.fechaSolicitud);
                const fechaSolicitudTxtConDias = fechaSolicitudTxt.replace(/^(\d{1,2})\s+de\s+/i, '$1 dias de ');

                const texto = `SOLICITUD DE PERMISO SIN GOCE SALARIAL

Yo, ${nombreCompleto}, quien laboro para ${empresa}, adscrito(a) al departamento de ${depNombre}, por este medio solicito formalmente un permiso sin goce de salario.

El permiso se solicita para el período comprendido desde el día ${fechaInicioTxt} hasta el día ${fechaFinTxt}, para un total de ${diasTxt} calendario, con fecha de reintegro laboral el ${fechaReintegroTxt}, de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica y las disposiciones emitidas por el Ministerio de Trabajo y Seguridad Social, así como las políticas internas de ${empresa}.

Motivo del permiso:
${motivoTxt}

Manifiesto que entiendo y acepto que durante este período no devengaré salario ni beneficios salariales asociados, y que el puesto de trabajo, así como las obligaciones y responsabilidades, se mantienen vigentes al término del presente permiso, de acuerdo con la normativa laboral costarricense y la normativa interna de ${empresa}.

Declaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.

En Costa Rica, a los ${fechaSolicitudTxtConDias}.`;

                detalleHtml = `<details style="margin-top:12px;">
                    <summary style="cursor:pointer;font-size:0.82rem;color:var(--primary);">
                        <i class="fas fa-file-alt" style="margin-right:4px;"></i> Ver texto completo del permiso
                    </summary>
                    <pre style="white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:0.86rem;margin-top:8px;padding:10px;background:var(--bg-main);border-radius:var(--radius-sm);border:1px solid var(--border-light);">
${texto}</pre>
                </details>`;
            }

            if (req.tipo === 'horas_extraordinarias') {
                const filas = Array.isArray(datos.filas) ? datos.filas : [];
                const filasRows = filas.map(f => `<tr><td style="padding:4px 6px;border:1px solid var(--border-light);">${f.fecha ? formatDate(f.fecha) : '—'}</td>
                    <td style="padding:4px 6px;border:1px solid var(--border-light);">${f.hora_inicio || '—'}</td>
                    <td style="padding:4px 6px;border:1px solid var(--border-light);">${f.hora_fin || '—'}</td>
                    <td style="padding:4px 6px;border:1px solid var(--border-light);">${f.cantidad || '—'}</td>
                    <td style="padding:4px 6px;border:1px solid var(--border-light);">${f.justificacion || '—'}</td></tr>`).join('');
                detalleHtml += `<div style="margin-top:10px;font-size:0.82rem;">
                    <strong>Identificación:</strong> ${datos.cedula || '—'} &nbsp;|&nbsp; <strong>Puesto:</strong> ${datos.puesto || '—'}<br>
                    <strong>Área:</strong> ${datos.area_departamento || (App._depsMap[req.departamento] || DEPARTAMENTOS[req.departamento])?.nombre || '—'} &nbsp;|&nbsp; <strong>Jefatura:</strong> ${datos.jefatura_inmediata || '—'}
                    </div>
                    <div style="overflow-x:auto;margin-top:8px;"><table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
                    <thead><tr style="background:var(--bg-main);"><th style="padding:6px;border:1px solid var(--border-light);">Fecha</th><th style="padding:6px;">Inicio</th><th style="padding:6px;">Fin</th><th style="padding:6px;">Cantidad</th><th style="padding:6px;">Justificación</th></tr></thead>
                    <tbody>${filasRows || '<tr><td colspan="5" style="padding:8px;">Sin filas</td></tr>'}</tbody></table></div>`;
            }

            const firmaEnc = req.firmaEncargado;
            const firmaEncHtml = firmaEnc?.nombre ? `<p style="font-size:0.78rem;color:var(--text-secondary);margin-top:8px;padding:8px;background:var(--bg-main);border-radius:var(--radius-sm);"><strong>Firma Encargado de Área:</strong> ${firmaEnc.nombre} — ${formatDateTime(firmaEnc.fecha)}${firmaEnc.comentario ? `<br><em>${firmaEnc.comentario}</em>` : ''}</p>` : '';

            const revTi = req.revisionTI;
            const revTiHtml = revTi?.nombre ? `<p style="font-size:0.78rem;color:var(--text-secondary);margin-top:8px;padding:8px;background:var(--bg-main);border-radius:var(--radius-sm);"><strong>Revisión TI:</strong> ${revTi.nombre} — ${formatDateTime(revTi.fecha)}${revTi.comentario ? `<br><em>${revTi.comentario}</em>` : ''}</p>` : '';

            const cardEst = this.claseCardEstadoSolicitud(req.estado);
            const pendUi = RequestManager.isEstadoPendienteEmpleado(req.estado);
            let btnAprobarLabel = 'Firmar y aprobar';
            if (req.estado === 'pendiente') btnAprobarLabel = 'Firmar como Encargado';
            else if (req.estado === 'pendiente_ti') btnAprobarLabel = 'Firmar y certificar (TI)';
            else if (req.estado === 'pendiente_gerencia') btnAprobarLabel = 'Firmar y aprobar (Gerencia)';

            return `<div class="request-card status-${cardEst}">
                <div class="request-header">
                    <div>
                        <h4><i class="${TIPOS_SOLICITUD[req.tipo]?.icono || 'fas fa-file'}" style="margin-right:8px;color:${TIPOS_SOLICITUD[req.tipo]?.color || 'var(--primary)'};"></i>${req.tipoNombre}</h4>
                        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">Solicitado por: <strong>${req.solicitanteNombre}</strong> — ${(App._depsMap[req.departamento] || DEPARTAMENTOS[req.departamento])?.nombre || ''}</p>
                    </div>
                    <span class="status-badge ${cardEst}"><i class="fas fa-${pendUi ? 'clock' : req.estado === 'aprobada' ? 'check-circle' : 'times-circle'}"></i> ${this.etiquetaEstadoSolicitud(req.estado)}</span>
                </div>
                ${datesHtml}
                ${req.observaciones ? `<p style="font-size:0.85rem;color:var(--text-secondary);padding:10px;background:var(--bg-main);border-radius:var(--radius-sm);border-left:3px solid var(--primary);margin-bottom:10px;"><strong>Observaciones:</strong> ${req.observaciones}</p>` : ''}
                ${datos.motivo ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;"><strong>Motivo:</strong> ${datos.motivo}</p>` : ''}
                ${detalleHtml}
                ${firmaEncHtml}
                ${revTiHtml}
                ${req.justificacion ? `<p style="font-size:0.85rem;padding:10px;background:rgba(245,127,23,0.08);border-radius:var(--radius-sm);border-left:3px solid var(--warning);margin-bottom:10px;"><strong>Respuesta:</strong> ${req.justificacion}</p>` : ''}
                ${req.respondidoPorNombre ? `<p style="font-size:0.78rem;color:var(--text-light);">Respondido por: ${req.respondidoPorNombre} — ${formatDateTime(req.fechaRespuesta)}</p>` : ''}
                <p style="font-size:0.78rem;color:var(--text-light);margin-top:5px;">Solicitado: ${formatDateTime(req.fechaSolicitud)}</p>
                ${(puedoActuar || req.estado === 'aprobada') ? `
                <div style="display:flex;gap:10px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-light);flex-wrap:wrap;">
                    ${puedoActuar ? `
                        <button class="btn btn-success btn-sm" onclick="App.handleSignAndApproveRequest('${req.id}')"><i class="fas fa-pen-nib"></i> ${btnAprobarLabel}</button>
                        <button class="btn btn-danger btn-sm" onclick="App.handleRejectRequest('${req.id}')"><i class="fas fa-times"></i> Rechazar</button>
                    ` : ''}
                    ${req.estado === 'aprobada' ? `
                        <button class="btn btn-primary btn-sm" onclick="App.generateRequestPDF('${req.id}')"><i class="fas fa-file-pdf"></i> Generar PDF</button>
                    ` : ''}
                </div>` : ''}
            </div>`;
        }).join('');
    }

    static filterMgrRequests(status) {
        document.querySelectorAll('#mgrTabs .tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`#mgrTabs .tab[data-tab="${status}"]`)?.classList.add('active');
        this.applyMgrRequestFilters();
    }

    /** Recalcula los números de las pestañas según el empleado seleccionado (o todos). */
    static updateMgrTabCounts() {
        const user = AuthManager.getUser();
        let base = this._cachedMgrRequests;
        const empId = document.getElementById('mgrEmployeeFilter')?.value?.trim() || '';
        if (empId) {
            base = base.filter(r => r.solicitante === empId);
        }
        const nPend = base.filter(r => RequestManager.necesitaMiAprobacion(r, user)).length;
        const nTodas = base.length;
        const nAprob = base.filter(r => r.estado === 'aprobada').length;
        const nRech = base.filter(r => r.estado === 'rechazada').length;
        const map = { pendiente: nPend, todas: nTodas, aprobada: nAprob, rechazada: nRech };
        document.querySelectorAll('#mgrTabs .mgr-tab-n[data-mgr-tab]').forEach(span => {
            const key = span.getAttribute('data-mgr-tab');
            if (key != null && Object.prototype.hasOwnProperty.call(map, key)) {
                span.textContent = `(${map[key]})`;
            }
        });
    }

    /** Aplica pestaña activa + filtro por empleado (select #mgrEmployeeFilter). */
    static applyMgrRequestFilters() {
        this.updateMgrTabCounts();
        const user = AuthManager.getUser();
        let list = this._cachedMgrRequests;
        const empId = document.getElementById('mgrEmployeeFilter')?.value?.trim() || '';
        if (empId) {
            list = list.filter(r => r.solicitante === empId);
        }
        const tab = document.querySelector('#mgrTabs .tab.active')?.dataset.tab || 'pendiente';
        if (tab === 'pendiente') {
            list = list.filter(r => RequestManager.necesitaMiAprobacion(r, user));
        } else if (tab !== 'todas') {
            list = list.filter(r => r.estado === tab);
        }
        const container = document.getElementById('mgrReqContainer');
        if (container) {
            container.innerHTML = this.renderManageRequestList(list);
        }
    }

    static handleApproveRequest(id) {
        this.showModal('Aprobar Solicitud', `
            <form onsubmit="App.confirmApprove(event, '${id}')">
                <p style="margin-bottom:16px;">¿Está seguro de que desea <strong style="color:var(--success);">aprobar</strong> esta solicitud?</p>
                <div class="form-group"><label>Comentario (opcional)</label><textarea class="form-control" id="approveComment" rows="3" placeholder="Agregue un comentario..."></textarea></div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-success" id="btnConfirmApprove"><i class="fas fa-check"></i> Confirmar</button>
                </div>
            </form>
        `);
    }

    static async confirmApprove(e, id) {
        e.preventDefault();
        const btn = document.getElementById('btnConfirmApprove');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const comment = document.getElementById('approveComment').value;
        await RequestManager.approve(id, comment);
        this.closeModal();
        Toast.success('Solicitud aprobada', 'La solicitud ha sido aprobada exitosamente');
        this.navigate('gestionar-solicitudes');
    }

    static handleRejectRequest(id) {
        this.showModal('Rechazar Solicitud', `
            <form onsubmit="App.confirmReject(event, '${id}')">
                <p style="margin-bottom:16px;">¿Está seguro de que desea <strong style="color:var(--danger);">rechazar</strong> esta solicitud?</p>
                <div class="form-group"><label>Justificación <span class="required">*</span></label><textarea class="form-control" id="rejectReason" rows="3" placeholder="Explique el motivo del rechazo..." required></textarea></div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-danger" id="btnConfirmReject"><i class="fas fa-times"></i> Confirmar</button>
                </div>
            </form>
        `);
    }

    static async confirmReject(e, id) {
        e.preventDefault();
        const reason = document.getElementById('rejectReason').value;
        if (!reason.trim()) { Toast.error('Error', 'Debe ingresar una justificación'); return; }

        const btn = document.getElementById('btnConfirmReject');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        await RequestManager.reject(id, reason);
        this.closeModal();
        Toast.error('Solicitud rechazada', 'La solicitud ha sido rechazada');
        this.navigate('gestionar-solicitudes');
    }

    // ========================================================
    // FIRMA DE SOLICITUDES POR ADMINISTRADOR
    // ========================================================
    static _currentSignReqId = null;

    static async handleSignAndApproveRequest(id) {
        this._currentSignReqId = id;
        const req = this._cachedMgrRequests.find(r => r.id === id) || await RequestManager.getById(id);
        if (!req) { Toast.error('Error', 'No se encontró la solicitud'); return; }

        const nombreCompleto = req.solicitanteNombre || 'Empleado';
        const textoPermiso = this.buildRequestText(req);

        const firmaEmpleadoHtml = req.firma?.firmaDibujo
            ? `<img src="${req.firma.firmaDibujo}" alt="Firma empleado" style="max-width:100%;max-height:80px;display:block;margin:0 auto;" />`
            : `<p style="color:#999;font-size:11px;font-style:italic;text-align:center;margin:0;">Sin firma registrada</p>`;

        const etapa = RequestManager.etapaSolicitud(req); // 'encargado' | 'ti' | 'gerencia'
        let modalTitulo = `Firmar y aprobar: ${req.tipoNombre || 'Solicitud'}`;
        let labelComentario = 'Comentario de aprobación (opcional)';
        let textoPasoFirma = 'Dibuje su firma como administrador para aprobar la solicitud';
        let textoBotonFirma = 'Firmar y Aprobar';

        if (etapa === 'encargado') {
            modalTitulo = `Firma del Encargado de Área — ${req.tipoNombre || 'Solicitud'}`;
            labelComentario = 'Comentario del encargado (opcional)';
            textoPasoFirma = 'Dibuje su firma como Encargado de Área para avalar la solicitud y enviarla a la siguiente etapa.';
            textoBotonFirma = req.tipo === 'horas_extraordinarias'
                ? 'Firmar y enviar a TI'
                : 'Firmar y enviar a Gerencia';
        } else if (etapa === 'ti') {
            modalTitulo = `Revisión TI — ${req.tipoNombre || 'Horas extraordinarias'}`;
            labelComentario = 'Comentario de la revisión TI (opcional)';
            textoPasoFirma = 'Dibuje su firma como responsable de TI para certificar la revisión de los registros institucionales.';
            textoBotonFirma = 'Firmar y enviar a Gerencia';
        } else if (etapa === 'gerencia') {
            modalTitulo = `Resolución de Gerencia — ${req.tipoNombre || 'Solicitud'}`;
            labelComentario = 'Comentario de Gerencia (opcional)';
            textoPasoFirma = 'Dibuje su firma como Gerencia General para aprobar y cerrar la solicitud.';
            textoBotonFirma = 'Firmar y Aprobar';
        }
        this._pendingAdminSignButtonHtml = `<i class="fas fa-check"></i> ${textoBotonFirma}`;

        // Mostrar firmas previas ya registradas (según la etapa actual)
        const firmaEncPrev = req.firmaEncargado;
        const revisionTIprev = req.revisionTI;
        const prevSignBox = (titulo, firma, subFallback) => {
            if (!firma) return '';
            const img = firma.firmaDibujo
                ? `<img src="${firma.firmaDibujo}" alt="Firma" style="max-width:100%;max-height:70px;display:block;margin:0 auto;" />`
                : `<p style="color:#999;font-size:11px;font-style:italic;text-align:center;margin:0;">Sin dibujo</p>`;
            return `<div style="margin-bottom:14px;">
                <h4 style="font-size:0.72rem;color:var(--text-light);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">${titulo}</h4>
                <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;background:#f9fafb;display:flex;flex-direction:column;align-items:center;gap:4px;">
                    ${img}
                    <p style="font-size:0.78rem;color:var(--text-secondary);margin:4px 0 0;font-weight:600;">${firma.nombre || subFallback || '—'}</p>
                    ${firma.fecha ? `<p style="font-size:0.72rem;color:var(--text-light);margin:2px 0 0;">${formatDateTime(firma.fecha)}</p>` : ''}
                </div>
            </div>`;
        };
        const firmasPreviasHtml = `${prevSignBox('Firma Encargado de Área', firmaEncPrev)}${prevSignBox('Firma TI (revisión)', revisionTIprev)}`;

        this.showModal(modalTitulo, `
            <div>
                <div style="margin-bottom:18px;">
                    <h4 style="font-size:0.75rem;color:var(--text-light);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Documento de solicitud</h4>
                    <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;background:#f9fafb;max-height:190px;overflow:auto;">
                        <pre style="white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:0.82rem;line-height:1.5;margin:0;">${textoPermiso}</pre>
                    </div>
                </div>

                <div style="margin-bottom:18px;">
                    <h4 style="font-size:0.75rem;color:var(--text-light);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Firma del solicitante</h4>
                    <div style="border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;background:#f9fafb;display:flex;flex-direction:column;align-items:center;gap:4px;">
                        ${firmaEmpleadoHtml}
                        <p style="font-size:0.82rem;color:var(--text-secondary);margin:6px 0 0;font-weight:600;">${req.firma?.nombre || nombreCompleto}</p>
                        ${req.firma?.fecha ? `<p style="font-size:0.75rem;color:var(--text-light);margin:2px 0 0;">${formatDateTime(req.firma.fecha)}</p>` : ''}
                    </div>
                </div>

                ${firmasPreviasHtml}

                <div class="form-group" style="margin-bottom:16px;">
                    <label style="font-size:0.85rem;">${labelComentario}</label>
                    <textarea class="form-control" id="adminApproveComment" rows="2" placeholder="Comentario..."></textarea>
                </div>

                <div id="adminSignStep1" style="margin-bottom:20px;">
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:10px;">Ingrese su <strong>código personal</strong> para desbloquear la firma</p>
                    <div style="display:flex;gap:10px;max-width:420px;margin:0 auto;">
                        <input type="password" class="form-control" id="adminSignCode" placeholder="Código personal" style="text-align:center;letter-spacing:2px;">
                        <button class="btn btn-primary" onclick="App.unlockAdminSignCanvas()">
                            <i class="fas fa-unlock"></i> Desbloquear
                        </button>
                    </div>
                    <p style="font-size:0.75rem;color:var(--text-light);margin-top:6px;text-align:center;">
                        <i class="fas fa-info-circle"></i> El código personal se configura en su perfil.
                    </p>
                </div>

                <div id="adminSignStep2" style="display:none;">
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;text-align:center;">${textoPasoFirma}</p>
                    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
                        <div style="position:relative;border:2px dashed #1565c0;border-radius:8px;background:white;padding:10px;">
                            <canvas id="signatureCanvas" width="500" height="180" style="display:block;cursor:crosshair;border-radius:4px;"
                                onmousedown="App.startDrawing(event)"
                                onmousemove="App.draw(event)"
                                onmouseup="App.stopDrawing()"
                                onmouseleave="App.stopDrawing()"
                                ontouchstart="App.startDrawing(event)"
                                ontouchmove="App.draw(event)"
                                ontouchend="App.stopDrawing()"></canvas>
                        </div>
                        <div style="display:flex;gap:10px;justify-content:center;">
                            <button class="btn btn-outline" onclick="App.clearSignature()"><i class="fas fa-eraser"></i> Limpiar</button>
                            <button class="btn btn-success" id="btnConfirmAdminSign" onclick="App.confirmAdminSign()">
                                <i class="fas fa-check"></i> ${textoBotonFirma}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `, true);

        this.signatureUnlocked = false;
        this.currentPersonalCode = null;
    }

    static buildRequestText(req) {
        const datos = req.datos || {};
        const empresa = APP_CONFIG?.appName || 'La empresa';
        const nombre = req.solicitanteNombre || 'Empleado';
        const dep = (App._depsMap[req.departamento] || DEPARTAMENTOS[req.departamento])?.nombre || 'su departamento';
        const fSolicitud = formatDate(req.fechaSolicitud);
        const fSolicitudConDias = fSolicitud.replace(/^(\d{1,2})\s+de\s+/i, '$1 dias de ');
        const motivo = datos.motivo || '______________________________';
        const fi = datos.fecha_inicio ? formatDate(datos.fecha_inicio) : '_____';
        const ff = datos.fecha_fin ? formatDate(datos.fecha_fin) : '_____';
        const toYMD = (dateObj) => {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        const shiftDate = (dateStr, days) => {
            if (!dateStr) return '_____';
            const d = new Date(dateStr + 'T12:00:00');
            d.setDate(d.getDate() + days);
            return formatDate(toYMD(d));
        };
        const ultimoDiaLabora = shiftDate(datos.fecha_inicio, -1);
        const fechaReincorporacion = shiftDate(datos.fecha_fin, 1);
        const dias = (datos.fecha_inicio && datos.fecha_fin)
            ? `${RequestManager.calcDays(datos.fecha_inicio, datos.fecha_fin)} día(s)` : '_____';

        switch (req.tipo) {
            case 'sin_goce':
                return `SOLICITUD DE PERMISO SIN GOCE SALARIAL\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente un permiso sin goce de salario.\n\nEl permiso se solicita para el período comprendido desde el día ${fi} hasta el día ${ff}, para un total de ${dias} calendario, con fecha de reintegro laboral el ${fechaReincorporacion}, de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica y las disposiciones emitidas por el Ministerio de Trabajo y Seguridad Social, así como las políticas internas de ${empresa}.\n\nMotivo del permiso:\n${motivo}\n\nManifiesto que entiendo y acepto que durante este período no devengaré salario ni beneficios salariales asociados, y que el puesto de trabajo, así como las obligaciones y responsabilidades, se mantienen vigentes al término del presente permiso, de acuerdo con la normativa laboral costarricense y la normativa interna de ${empresa}.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitudConDias}.`;

            case 'vacaciones': {
                const obs = datos.observaciones ? `\n\nObservaciones:\n${datos.observaciones}` : '';
                const ced = datos.cedula || '_____';
                const puesto = datos.puesto || '_____';
                const fechaIngreso = datos.fecha_ingreso ? formatDate(datos.fecha_ingreso) : '_____';
                return `SOLICITUD DE DISFRUTE DE VACACIONES\n\n1. DATOS DEL COLABORADOR\n\nYo, ${nombre}, número de cédula ${ced}, con el puesto de ${puesto}, del departamento / área de ${dep}, con fecha de ingreso a la empresa ${fechaIngreso}.\n\n2. PERIODO DE VACACIONES SOLICITADO\nDe conformidad con lo establecido en el artículo 153 del Código de Trabajo de Costa Rica, solicito el disfrute de mis vacaciones anuales correspondientes al período laborado, en la cantidad de ${dias} naturales, siendo mi último día que labora el ${ultimoDiaLabora}, con fecha de inicio ${fi}, fecha de finalización ${ff} y fecha de reincorporación laboral ${fechaReincorporacion}.${obs}\n\n3. DECLARACIÓN DEL COLABORADOR\n\nDeclaro que he sido informado(a) de mis derechos y deberes en relación con el disfrute de vacaciones, conforme al Código de Trabajo de Costa Rica, y que el presente período ha sido coordinado con la empresa para no afectar la continuidad del servicio.\n\n4. AUTORIZACIÓN DEL PATRONO / REPRESENTANTE LEGAL\n\nHago constar que el período de vacaciones solicitado ha sido revisado y aprobado, cumpliendo con la normativa laboral vigente, y que durante dicho período el colaborador conservará todos sus derechos laborales.`;
            }

            case 'ingreso_posterior': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const hora = datos.hora_ingreso || '_____';
                return `SOLICITUD DE INGRESO POSTERIOR\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio notifico formalmente que el día ${fecha} realizaré mi ingreso de forma posterior al horario habitual establecido.\n\nHora de ingreso: ${hora}\n\nMotivo:\n${motivo}\n\nManifiesto que tomaré las medidas necesarias para compensar el tiempo de ausencia de conformidad con las políticas internas de ${empresa} y lo dispuesto en el Código de Trabajo. Entiendo que los ingresos posteriores deben ser debidamente justificados y que la empresa podrá solicitar los comprobantes que estime convenientes. Me comprometo a cumplir con la jornada laboral correspondiente y a no afectar el normal desarrollo de las actividades del departamento.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitudConDias}.`;
            }

            case 'salida_anticipada': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const hora = datos.hora_salida || '_____';
                return `SOLICITUD DE SALIDA ANTICIPADA\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente autorización para retirarme antes del horario laboral establecido.\n\nFecha: ${fecha}\nHora de salida anticipada: ${hora}\n\nMotivo:\n${motivo}\n\nManifiesto que coordinaré con mi jefatura la compensación del tiempo correspondiente de conformidad con las políticas internas de ${empresa}. Entiendo que la salida anticipada queda sujeta a las necesidades del servicio y al criterio del superior inmediato. Me comprometo a dejar en orden las labores bajo mi responsabilidad y a reponer las horas no trabajadas según lo acordado con la empresa.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitudConDias}.`;
            }

            case 'cambio_horario': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const actual = datos.horario_actual || '_____';
                const solicitado = datos.horario_solicitado || '_____';
                return `SOLICITUD DE CAMBIO DE HORARIO\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente la modificación de mi horario de trabajo.\n\nHorario actual:      ${actual}\nHorario solicitado:  ${solicitado}\nFecha de aplicación: ${fecha}\n\nMotivo del cambio:\n${motivo}\n\nManifiesto que el cambio de horario solicitado no afectará negativamente el desempeño de mis funciones ni la prestación de los servicios de ${empresa}, y me comprometo a cumplir con la totalidad de las horas laborales establecidas. Entiendo que la modificación del horario queda sujeta a la aprobación de la jefatura y a las necesidades operativas de la organización. Una vez aprobado, me comprometo a cumplir de manera puntual y responsable el nuevo horario.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitudConDias}.`;
            }

            case 'estudio': {
                const inst = datos.institucion || '_____';
                return `SOLICITUD DE PERMISO DE ESTUDIO\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente un permiso para actividades de formación académica.\n\nInstitución educativa: ${inst}\nPeríodo: desde el día ${fi} hasta el día ${ff}, para un total de ${dias}.\n\nMotivo:\n${motivo}\n\nEl presente permiso se solicita de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica respecto a permisos de capacitación y estudio, así como las políticas internas de ${empresa}. Manifiesto que la formación que recibiré contribuirá a mi desarrollo profesional y, en consecuencia, al mejor desempeño de mis labores. Me comprometo a coordinar con mi jefatura las fechas de ausencia y a no afectar el normal desarrollo de las actividades del departamento.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitudConDias}.`;
            }

            case 'dias_festivos': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const desc = datos.descripcion || '_____';
                return `NOTIFICACIÓN DE DÍA FESTIVO\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio registro formalmente la siguiente ausencia por día festivo, de conformidad con el calendario oficial de días feriados de la República de Costa Rica y con lo dispuesto en el Código de Trabajo en materia de descansos obligatorios.\n\nFecha: ${fecha}\nDescripción: ${desc}\n\nLa presente notificación tiene como fin dejar constancia formal del día festivo señalado, según lo establecido en el Código de Trabajo y la normativa laboral vigente. Entiendo que en los días feriados de carácter nacional el trabajador tiene derecho al descanso remunerado, salvo las excepciones previstas en la ley. Dejo constancia de que he informado con la debida anticipación a mi jefatura para que se tomen las medidas organizativas que correspondan.\n\nDeclaro que la información aquí consignada es veraz.\n\nEn Costa Rica, a los ${fSolicitudConDias}.`;
            }

            case 'horas_extraordinarias': {
                const ced = datos.cedula || '_____';
                const puesto = datos.puesto || '_____';
                const area = datos.area_departamento || dep;
                const jef = datos.jefatura_inmediata || '_____';
                const filas = Array.isArray(datos.filas) ? datos.filas : [];
                let tabla = '';
                filas.forEach((f, idx) => {
                    const fd = f.fecha ? formatDate(f.fecha) : '_____';
                    tabla += `${idx + 1}) Fecha: ${fd}  Inicio: ${f.hora_inicio || '_____'}  Fin: ${f.hora_fin || '_____'}  Cantidad: ${f.cantidad || '_____'}\n   Justificación: ${f.justificacion || '_____'}\n`;
                });
                return `FORMULARIO OFICIAL DE REPORTE Y AUTORIZACIÓN DE HORAS EXTRAORDINARIAS (RC.400.5.1)\n\n1. IDENTIFICACIÓN DEL COLABORADOR\n\nNombre completo: ${nombre}\nNúmero de identificación: ${ced}\nPuesto: ${puesto}\nDepartamento / Área: ${area}\nJefatura inmediata: ${jef}\n\n2. DETALLE DE LAS HORAS EXTRAORDINARIAS REPORTADAS\n\n${tabla || '(Sin filas registradas)'}\n\nDeclaro que la información consignada es veraz.\n\nEn Costa Rica, a los ${fSolicitudConDias}.`;
            }

            default:
                return `${req.tipoNombre || req.tipo}\n\nSolicitante: ${nombre}\nDepartamento: ${dep}\nFecha: ${fSolicitud}`;
        }
    }

    static async unlockAdminSignCanvas() {
        const personalCode = document.getElementById('adminSignCode').value.trim();
        if (!personalCode) { Toast.error('Error', 'Ingrese su código personal'); return; }

        const user = AuthManager.getUser();
        if (!user) { Toast.error('Error', 'Usuario no autenticado'); return; }

        let isValid = false;
        if (user.codigoPersonal) {
            isValid = personalCode === user.codigoPersonal;
        } else {
            try {
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, personalCode);
                await auth.currentUser.reauthenticateWithCredential(credential);
                isValid = true;
            } catch (e) { isValid = false; }
        }

        if (!isValid) {
            Toast.error('Error', 'Código personal incorrecto');
            document.getElementById('adminSignCode').value = '';
            return;
        }

        this.currentPersonalCode = personalCode;
        this.signatureUnlocked = true;
        document.getElementById('adminSignStep1').style.display = 'none';
        document.getElementById('adminSignStep2').style.display = 'block';
        setTimeout(() => this.initSignatureCanvas(), 100);
        Toast.success('Código válido', 'Puede dibujar su firma ahora');
    }

    static async confirmAdminSign() {
        if (!this.signatureUnlocked || !this.signatureCanvas) {
            Toast.error('Error', 'Debe desbloquear el canvas y dibujar su firma');
            return;
        }

        const imageData = this.signatureCtx.getImageData(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
        let hasDrawing = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i + 3] > 0) { hasDrawing = true; break; }
        }
        if (!hasDrawing) { Toast.error('Error', 'Debe dibujar su firma antes de confirmar'); return; }

        const signatureImage = this.signatureCanvas.toDataURL('image/png');
        const user = AuthManager.getUser();
        const firmaAdmin = {
            userId: user.id,
            nombre: user.nombre + ' ' + user.apellido,
            rol: user.rol,
            fecha: new Date().toISOString(),
            firmaDibujo: signatureImage
        };

        const comment = document.getElementById('adminApproveComment')?.value || '';
        const btn = document.getElementById('btnConfirmAdminSign');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        const reqFresh = await RequestManager.getById(this._currentSignReqId);
        let result;
        let okTitulo = 'Aprobada';
        let okMsg = 'Solicitud firmada y aprobada exitosamente';
        if (reqFresh?.estado === 'pendiente') {
            // Etapa 1: Encargado de Área
            result = await RequestManager.approveEncargado(this._currentSignReqId, comment, firmaAdmin);
            okTitulo = 'Firma del Encargado';
            okMsg = reqFresh.tipo === 'horas_extraordinarias'
                ? 'Solicitud firmada por el encargado. Enviada a revisión del Departamento de TI.'
                : 'Solicitud firmada por el encargado. Enviada a Gerencia General.';
        } else if (reqFresh?.tipo === 'horas_extraordinarias' && reqFresh.estado === 'pendiente_ti') {
            // Etapa 2: TI (solo horas extraordinarias)
            result = await RequestManager.approveRevisionTI(this._currentSignReqId, comment, firmaAdmin);
            okTitulo = 'Revisión TI';
            okMsg = 'Certificación registrada. La solicitud fue enviada a Gerencia General.';
        } else {
            // Etapa final: Gerencia (admin)
            result = await RequestManager.approve(this._currentSignReqId, comment, firmaAdmin);
        }

        if (result) {
            Toast.success(okTitulo, okMsg);
            this.closeModal();
            this.signatureUnlocked = false;
            this.currentPersonalCode = null;
            this._currentSignReqId = null;
            this._pendingAdminSignButtonHtml = null;
            this.navigate('gestionar-solicitudes');
        } else {
            Toast.error('Error', 'No se pudo completar la acción');
            btn.disabled = false;
            btn.innerHTML = this._pendingAdminSignButtonHtml || '<i class="fas fa-check"></i> Firmar y Aprobar';
        }
    }

    static async generateRequestPDF(id) {
        const req = this._cachedMgrRequests.find(r => r.id === id) || await RequestManager.getById(id);
        if (!req) { Toast.error('Error', 'No se encontró la solicitud'); return; }
        Toast.info('Generando PDF', 'Por favor espere...');
        const result = await PDFGenerator.generateRequestPDF(req);
        if (!result.success) Toast.error('Error', 'No se pudo generar el PDF');
    }

    // ========================================================
    // SEGUIMIENTO DE SANCIONES / QUEJAS
    // ========================================================
    static _cachedSanctionTickets = [];
    static _sanctionMainTab = '';
    static _sanctionSubTab = 'todas';

    static _sanctionTicketAbierto(t) {
        if (!t) return false;
        if (SanctionFollowupManager.ticketTieneFlujoEtapa(t)) {
            return t.flujoEtapa !== SanctionFollowupManager.FLUJO_CERRADO;
        }
        return t.estado !== SanctionFollowupManager.ESTADO_TERMINADO;
    }

    static openSanctionDetalle(id, source) {
        App._sanctionDetalleSource = source === 'shared' ? 'shared' : 'manager';
        App.navigate('seguimiento-sanciones-detalle', { id });
    }

    static async renderSeguimientoSanciones() {
        const user = AuthManager.getUser();
        if (!user) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>Sesión</h3><p>Inicie sesión.</p></div>`;
            return;
        }

        const d = SANCTION_FOLLOWUP_DEPT;
        const isAdmin = AuthManager.isAdmin();
        const isEnc = user.rol === 'encargado' || isAdmin;
        const deptTi = AuthManager.usuarioEnDepartamento(user, d.TI);
        const deptRh = AuthManager.usuarioEnDepartamento(user, d.RRHH);
        const deptGg = AuthManager.usuarioEnDepartamento(user, d.GERENCIA);

        if (!isEnc && !deptTi && !deptRh && !deptGg) {
            document.getElementById('contentArea').innerHTML = `
                <div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso denegado</h3><p>Este módulo es para encargados de área (crear casos) o personal de TI, Recursos Humanos o Gerencia General (colas de revisión).</p>
                <button type="button" class="btn btn-primary" onclick="App.navigate('dashboard')">Ir al inicio</button></div>`;
            return;
        }

        const [misTodos, colaTi, colaRrhh, colaGg] = await Promise.all([
            (isAdmin || user.rol === 'encargado') ? SanctionFollowupManager.listForManager() : Promise.resolve([]),
            (isAdmin || deptTi) ? SanctionFollowupManager.listColaTi() : Promise.resolve([]),
            (isAdmin || deptRh) ? SanctionFollowupManager.listColaRrhh() : Promise.resolve([]),
            (isAdmin || deptGg) ? SanctionFollowupManager.listColaGerencia() : Promise.resolve([])
        ]);

        const mis = isAdmin ? misTodos : misTodos;
        const packs = { mis, cola_ti: colaTi, cola_rrhh: colaRrhh, cola_gg: colaGg, todos: isAdmin ? misTodos : [] };

        const allowedTabs = [];
        if (user.rol === 'encargado') allowedTabs.push({ key: 'mis', label: 'Mis envíos', list: mis });
        if (isAdmin || deptTi) allowedTabs.push({ key: 'cola_ti', label: 'Cola TI', list: colaTi });
        if (isAdmin || deptRh) allowedTabs.push({ key: 'cola_rrhh', label: 'Cola RRHH', list: colaRrhh });
        if (isAdmin || deptGg) allowedTabs.push({ key: 'cola_gg', label: 'Cola Gerencia', list: colaGg });
        if (isAdmin) allowedTabs.push({ key: 'todos', label: 'Todos los casos', list: misTodos });

        if (!allowedTabs.find((t) => t.key === this._sanctionMainTab)) {
            this._sanctionMainTab = allowedTabs[0]?.key || 'cola_ti';
        }

        const currentPack = packs[this._sanctionMainTab] || [];
        this._cachedSanctionTickets = currentPack;
        this._sanctionSubTab = this._sanctionSubTab || 'todas';

        const nAb = currentPack.filter((t) => App._sanctionTicketAbierto(t)).length;
        const nCe = currentPack.length - nAb;

        const mainTabsHtml = allowedTabs.map((t) => {
            const active = t.key === this._sanctionMainTab ? 'active' : '';
            const k = App.escapeJsString(t.key);
            return `<button type="button" class="tab ${active}" data-main="${t.key}" onclick="App.filterSanctionMainTab('${k}')">${App.escapeHtml(t.label)} (${t.list.length})</button>`;
        }).join('');

        const content = document.getElementById('contentArea');
        const btnNuevo = (isAdmin || user.rol === 'encargado')
            ? `<button type="button" class="btn btn-primary btn-sm" onclick="App.showSanctionCreateModal()"><i class="fas fa-plus"></i> Nueva queja</button>`
            : '';

        content.innerHTML = `
            <div class="card">
                <div class="card-header" style="flex-wrap:wrap;gap:12px;">
                    <h3 style="flex:1;min-width:200px;"><i class="fas fa-gavel" style="margin-right:8px;color:var(--primary);"></i>Quejas y sanciones</h3>
                    ${btnNuevo}
                </div>
                <div class="card-body">
                    <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:12px;">
                        Flujo: <strong>Encargado</strong> registra → <strong>TI</strong> revisa (apartado solo TI) → <strong>RRHH</strong> anota → <strong>Gerencia</strong> cierra y aprueba.
                    </p>
                    <div class="tabs" id="sanctionMainTabs" style="flex-wrap:wrap;margin-bottom:10px;">${mainTabsHtml}</div>
                    <div class="tabs" id="sanctionMgrTabs" style="flex-wrap:wrap;margin-bottom:16px;">
                        <button type="button" class="tab ${this._sanctionSubTab === 'todas' ? 'active' : ''}" data-tab="todas" onclick="App.filterSanctionTickets('todas')">Todos (${currentPack.length})</button>
                        <button type="button" class="tab ${this._sanctionSubTab === 'abiertos' ? 'active' : ''}" data-tab="abiertos" onclick="App.filterSanctionTickets('abiertos')">En trámite (${nAb})</button>
                        <button type="button" class="tab ${this._sanctionSubTab === 'cerrados' ? 'active' : ''}" data-tab="cerrados" onclick="App.filterSanctionTickets('cerrados')">Cerrados (${nCe})</button>
                    </div>
                    <div id="sanctionMgrListContainer">${this.renderSanctionManagerCards(currentPack)}</div>
                </div>
            </div>`;
    }

    static async filterSanctionMainTab(key) {
        this._sanctionMainTab = key;
        this._sanctionSubTab = 'todas';
        await this.renderSeguimientoSanciones();
    }

    static renderSanctionManagerCards(tickets) {
        if (!tickets || tickets.length === 0) {
            return `<div class="empty-state"><i class="fas fa-inbox"></i><h3>Sin registros</h3><p>No hay casos en esta vista.</p></div>`;
        }
        return tickets.map((t) => {
            const abierto = App._sanctionTicketAbierto(t);
            const raw = t.texto || '';
            const excerpt = App.escapeHtml(raw.slice(0, 220)) + (raw.length > 220 ? '…' : '');
            const flujoLabel = SanctionFollowupManager.ticketTieneFlujoEtapa(t)
                ? SanctionFollowupManager.etiquetaFlujo(t.flujoEtapa)
                : (t.estado === SanctionFollowupManager.ESTADO_TERMINADO ? 'Cerrado (hist.)' : 'En proceso (hist.)');
            const puede = SanctionFollowupManager.puedeEditarCuerpo(t);
            const idJs = App.escapeJsString(t.id);
            return `
            <div class="request-card ${abierto ? 'status-pendiente' : ''}" style="margin-bottom:12px;">
                <div class="request-header">
                    <div>
                        <h4>${App.escapeHtml(t.titulo || 'Sin título')}</h4>
                        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">
                            ${App.escapeHtml(t.creadoPorNombre || '')} · ${formatDateTime(t.fechaCreacion)}
                            ${t.departamento ? ` · ${App.escapeHtml((App._depsMap[t.departamento] || DEPARTAMENTOS[t.departamento])?.nombre || t.departamento)}` : ''}
                        </p>
                    </div>
                    <span class="status-badge ${abierto ? 'pendiente' : 'aprobada'}"><i class="fas fa-${abierto ? 'clock' : 'check'}"></i> ${App.escapeHtml(flujoLabel)}</span>
                </div>
                <p style="font-size:0.88rem;color:var(--text-secondary);white-space:pre-wrap;margin-top:10px;">${excerpt}</p>
                <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
                    <button type="button" class="btn btn-sm btn-outline" onclick="App.openSanctionDetalle('${idJs}','manager')"><i class="fas fa-eye"></i> Ver detalle</button>
                    ${puede ? `<button type="button" class="btn btn-sm btn-primary" onclick="App.showSanctionEditModal('${idJs}')"><i class="fas fa-edit"></i> Editar</button>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    static filterSanctionTickets(tab) {
        this._sanctionSubTab = tab;
        document.querySelectorAll('#sanctionMgrTabs .tab').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
        let list = this._cachedSanctionTickets || [];
        if (tab === 'abiertos') list = list.filter((t) => App._sanctionTicketAbierto(t));
        else if (tab === 'cerrados') list = list.filter((t) => !App._sanctionTicketAbierto(t));
        const container = document.getElementById('sanctionMgrListContainer');
        if (container) container.innerHTML = this.renderSanctionManagerCards(list);
    }

    static async showSanctionCreateModal() {
        const users = (await AuthManager.getAllUsers()).filter(u => u.activo && u.id !== AuthManager.getUser().id);
        users.sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'));
        const checks = users.map(u => `
            <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;cursor:pointer;">
                <input type="checkbox" name="sanctionVisible" value="${App.escapeHtml(u.id)}">
                <span style="font-size:0.88rem;"><strong>${App.escapeHtml(u.nombre)} ${App.escapeHtml(u.apellido)}</strong>
                <span style="color:var(--text-secondary);"> — ${App.escapeHtml(u.email || '')}</span></span>
            </label>
        `).join('');

        this.showModal('Nuevo seguimiento (sanción o queja)', `
            <form id="sanctionCreateForm" onsubmit="App.submitSanctionCreate(event)">
                <div class="form-group">
                    <label>Título</label>
                    <input class="form-control" id="sanctionCreateTitulo" placeholder="Referencia breve" maxlength="280">
                </div>
                <div class="form-group">
                    <label>Texto del caso <span class="required">*</span></label>
                    <textarea class="form-control" id="sanctionCreateTexto" rows="8" required placeholder="Descripción del caso..."></textarea>
                </div>
                <div class="form-group">
                    <label>Usuarios que pueden ver el seguimiento (no ven la revisión interna de TI)</label>
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">Podrá cambiar esta lista después editando el ticket.</p>
                    <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px;">
                        ${checks || '<p style="font-size:0.85rem;color:var(--text-secondary);">No hay otros usuarios activos.</p>'}
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Crear ticket</button>
                </div>
            </form>
        `, true);
    }

    static async submitSanctionCreate(e) {
        e.preventDefault();
        const titulo = document.getElementById('sanctionCreateTitulo')?.value || '';
        const texto = document.getElementById('sanctionCreateTexto')?.value || '';
        const form = document.getElementById('sanctionCreateForm');
        const boxes = form ? form.querySelectorAll('input[name="sanctionVisible"]:checked') : [];
        const visiblesParaIds = Array.from(boxes).map(b => b.value);
        try {
            await SanctionFollowupManager.create({ titulo, texto, visiblesParaIds });
            Toast.success('Creado', 'El caso fue enviado. Pasará primero a revisión de TI.');
            App.closeModal();
            await App.refreshSanctionSharedNavItem();
            App.navigate('seguimiento-sanciones');
        } catch (err) {
            Toast.error('Error', err.message || String(err));
        }
    }

    static async showSanctionEditModal(ticketId) {
        const t = await SanctionFollowupManager.getById(ticketId);
        if (!t || !SanctionFollowupManager.puedeEditarCuerpo(t)) {
            Toast.error('Error', 'No puede editar este caso en esta etapa');
            return;
        }
        const users = (await AuthManager.getAllUsers()).filter(u => u.activo && u.id !== t.creadoPor);
        users.sort((a, b) => `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`, 'es'));
        const vis = t.visiblesPara || {};
        const checks = users.map(u => `
            <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;cursor:pointer;">
                <input type="checkbox" name="sanctionVisible" value="${App.escapeHtml(u.id)}" ${vis[u.id] ? 'checked' : ''}>
                <span style="font-size:0.88rem;"><strong>${App.escapeHtml(u.nombre)} ${App.escapeHtml(u.apellido)}</strong>
                <span style="color:var(--text-secondary);"> — ${App.escapeHtml(u.email || '')}</span></span>
            </label>
        `).join('');

        const eTitulo = App.escapeHtml(t.titulo || '');
        const eTexto = App.escapeHtml(t.texto || '');
        const eId = App.escapeHtml(ticketId);
        const ev = SanctionFollowupManager.ESTADO_ESPERA;
        const et = SanctionFollowupManager.ESTADO_TERMINADO;
        const estadoBlock = AuthManager.isAdmin() ? `
                <div class="form-group">
                    <label>Estado (histórico)</label>
                    <select class="form-control" id="sanctionEditEstado">
                        <option value="${ev}" ${t.estado === ev ? 'selected' : ''}>En espera</option>
                        <option value="${et}" ${t.estado === et ? 'selected' : ''}>Terminado</option>
                    </select>
                </div>` : '';

        this.showModal('Editar seguimiento', `
            <form id="sanctionEditForm" data-ticket-id="${eId}" onsubmit="App.submitSanctionEdit(event)">
                <div class="form-group">
                    <label>Título</label>
                    <input class="form-control" id="sanctionEditTitulo" value="${eTitulo}" maxlength="280">
                </div>
                <div class="form-group">
                    <label>Texto <span class="required">*</span></label>
                    <textarea class="form-control" id="sanctionEditTexto" rows="8" required>${eTexto}</textarea>
                </div>
                ${estadoBlock}
                <div class="form-group">
                    <label>Usuarios que pueden ver este seguimiento</label>
                    <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px;">
                        ${checks || '<p style="font-size:0.85rem;color:var(--text-secondary);">No hay otros usuarios activos.</p>'}
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </form>
        `, true);
    }

    static async submitSanctionEdit(e) {
        e.preventDefault();
        const form = e.target;
        const ticketId = form?.dataset?.ticketId;
        if (!ticketId) return;
        const titulo = document.getElementById('sanctionEditTitulo')?.value || '';
        const texto = document.getElementById('sanctionEditTexto')?.value || '';
        const estadoEl = document.getElementById('sanctionEditEstado');
        const estado = estadoEl ? estadoEl.value : undefined;
        const boxes = form.querySelectorAll('input[name="sanctionVisible"]:checked');
        const visiblesParaIds = Array.from(boxes).map((b) => b.value);
        const patch = { titulo, texto, visiblesParaIds };
        if (AuthManager.isAdmin() && estado !== undefined) patch.estado = estado;
        try {
            await SanctionFollowupManager.updateTicket(ticketId, patch);
            Toast.success('Guardado', 'Los cambios fueron aplicados');
            App.closeModal();
            await App.refreshSanctionSharedNavItem();
            App.navigate('seguimiento-sanciones-detalle', { id: ticketId });
        } catch (err) {
            Toast.error('Error', err.message || String(err));
        }
    }

    static async cambiarEstadoSanction(id, estado) {
        try {
            await SanctionFollowupManager.updateTicket(id, { estado });
            Toast.success('Estado actualizado', SanctionFollowupManager.etiquetaEstado(estado));
            await App.refreshSanctionSharedNavItem();
            App.navigate('seguimiento-sanciones-detalle', { id });
        } catch (e) {
            Toast.error('Error', e.message || String(e));
        }
    }

    static async eliminarSanction(id) {
        if (!confirm('¿Eliminar definitivamente este seguimiento?')) return;
        try {
            await SanctionFollowupManager.deleteTicket(id);
            Toast.success('Eliminado', 'El ticket fue eliminado');
            await App.refreshSanctionSharedNavItem();
            App.navigate('seguimiento-sanciones');
        } catch (e) {
            Toast.error('Error', e.message || String(e));
        }
    }

    static async renderSeguimientoCompartidos() {
        const list = await SanctionFollowupManager.listSharedWithMe();
        const content = document.getElementById('contentArea');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-user-shield" style="margin-right:8px;color:var(--primary);"></i>Seguimientos compartidos conmigo</h3>
                </div>
                <div class="card-body">
                    <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:16px;">Solo lectura. Quien creó el ticket eligió que usted pueda verlo.</p>
                    <div id="sanctionSharedListContainer">${this.renderSanctionSharedCards(list)}</div>
                </div>
            </div>`;
    }

    static renderSanctionSharedCards(tickets) {
        if (!tickets || tickets.length === 0) {
            return `<div class="empty-state"><i class="fas fa-folder-open"></i><h3>Nada por aquí</h3><p>Aún no hay seguimientos compartidos con su usuario.</p></div>`;
        }
        return tickets.map((t) => {
            const abierto = App._sanctionTicketAbierto(t);
            const raw = t.texto || '';
            const excerpt = App.escapeHtml(raw.slice(0, 240)) + (raw.length > 240 ? '…' : '');
            const idJs = App.escapeJsString(t.id);
            const flujoLabel = SanctionFollowupManager.ticketTieneFlujoEtapa(t)
                ? SanctionFollowupManager.etiquetaFlujo(t.flujoEtapa)
                : (t.estado === SanctionFollowupManager.ESTADO_TERMINADO ? 'Cerrado' : 'En proceso');
            return `
            <div class="request-card ${abierto ? 'status-pendiente' : ''}" style="margin-bottom:12px;cursor:pointer;" onclick="App.openSanctionDetalle('${idJs}','shared')">
                <div class="request-header">
                    <div>
                        <h4>${App.escapeHtml(t.titulo || 'Sin título')}</h4>
                        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">${App.escapeHtml(t.creadoPorNombre || '')} · ${formatDateTime(t.fechaCreacion)}</p>
                    </div>
                    <span class="status-badge ${abierto ? 'pendiente' : 'aprobada'}"><i class="fas fa-${abierto ? 'clock' : 'check'}"></i> ${App.escapeHtml(flujoLabel)}</span>
                </div>
                <p style="font-size:0.88rem;color:var(--text-secondary);white-space:pre-wrap;margin-top:10px;">${excerpt}</p>
            </div>`;
        }).join('');
    }

    static async renderSeguimientoSancionesDetalle(id) {
        if (!id) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-link-slash"></i><h3>Sin referencia</h3></div>`;
            return;
        }
        const ticket = await SanctionFollowupManager.getById(id);
        const content = document.getElementById('contentArea');
        if (!ticket || !SanctionFollowupManager.puedeVer(ticket)) {
            content.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>No disponible</h3><p>No tiene permiso para ver este seguimiento o no existe.</p>
                <button type="button" class="btn btn-primary" onclick="App.navigate('dashboard')">Volver</button></div>`;
            return;
        }

        const flujoEtapa = SanctionFollowupManager.getFlujoEtapa(ticket);
        const flujoLabel = SanctionFollowupManager.etiquetaFlujo(flujoEtapa);

        let tiReview = null;
        if (SanctionFollowupManager.puedeVerRevisionTi()) {
            tiReview = await SanctionFollowupManager.getTiReview(id);
        }
        let rrhh = null;
        if (SanctionFollowupManager.puedeVerNotasRrhhGerencia()) {
            rrhh = await SanctionFollowupManager.getRrhhNotas(id);
        }

        const puedeEditarCuerpo = SanctionFollowupManager.puedeEditarCuerpo(ticket);
        const puedeTi = SanctionFollowupManager.puedeMarcarRevisionTi(ticket);
        const puedeRrhh = SanctionFollowupManager.puedeActuarRrhh(ticket);
        const puedeGg = SanctionFollowupManager.puedeActuarGerencia(ticket);
        const volver = App._sanctionDetalleSource === 'shared' ? 'seguimiento-compartidos' : 'seguimiento-sanciones';
        const visibles = Object.keys(ticket.visiblesPara || {});
        let visLine = 'Ningún otro usuario además del flujo interno y quien creó el caso';
        if (visibles.length) {
            const all = await AuthManager.getAllUsers();
            const map = Object.fromEntries(all.map((u) => [u.id, u]));
            visLine = visibles.map((uid) => {
                const u = map[uid];
                return u ? `${u.nombre} ${u.apellido}` : uid;
            }).join(', ');
        }

        const idJs = App.escapeJsString(id);
        const abierto = App._sanctionTicketAbierto(ticket);
        const curUser = AuthManager.getUser();
        const ocultarTiParaStaffTi = !AuthManager.isAdmin() &&
            AuthManager.usuarioEnDepartamento(curUser, SANCTION_FOLLOWUP_DEPT.TI) &&
            (!SanctionFollowupManager.ticketTieneFlujoEtapa(ticket) || ticket.flujoEtapa !== SanctionFollowupManager.FLUJO_PENDIENTE_TI);

        let bloqueTi = '';
        if (SanctionFollowupManager.puedeVerRevisionTi() && !ocultarTiParaStaffTi) {
            if (tiReview && tiReview.revisado) {
                bloqueTi = `
                    <div class="card" style="margin-top:16px;border-left:4px solid #006064;">
                        <div class="card-body">
                            <h4 style="margin:0 0 8px;font-size:1rem;"><i class="fas fa-shield-halved" style="margin-right:8px;color:#006064;"></i>Revisión TI (confidencial)</h4>
                            <p style="font-size:0.85rem;color:var(--text-secondary);">Marcado el ${formatDateTime(tiReview.fecha || '')}</p>
                            <div style="white-space:pre-wrap;margin-top:8px;font-size:0.9rem;">${App.escapeHtml(tiReview.notas || '(sin notas)')}</div>
                        </div>
                    </div>`;
            } else if (puedeTi) {
                bloqueTi = `
                    <div class="card" style="margin-top:16px;border-left:4px solid #006064;">
                        <div class="card-body">
                            <h4 style="margin:0 0 8px;font-size:1rem;"><i class="fas fa-shield-halved" style="margin-right:8px;color:#006064;"></i>Revisión TI — solo su departamento</h4>
                            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;">Marque revisión y envíe el caso a Recursos Humanos.</p>
                            <div class="form-group">
                                <label>Notas internas TI</label>
                                <textarea class="form-control" id="sanctionTiNotas" rows="4" placeholder="Observaciones técnicas o de revisión..."></textarea>
                            </div>
                            <button type="button" class="btn btn-primary" onclick="App.submitSanctionTiRevision('${idJs}')"><i class="fas fa-check"></i> Revisado — enviar a RRHH</button>
                        </div>
                    </div>`;
            } else if (flujoEtapa === SanctionFollowupManager.FLUJO_PENDIENTE_TI && SanctionFollowupManager.ticketTieneFlujoEtapa(ticket)) {
                bloqueTi = `<p style="margin-top:16px;font-size:0.85rem;color:var(--text-secondary);"><i class="fas fa-hourglass-half"></i> Pendiente de revisión por TI.</p>`;
            }
        }

        let bloqueRrhh = '';
        if (SanctionFollowupManager.puedeVerNotasRrhhGerencia()) {
            const txt = rrhh && rrhh.anotaciones ? App.escapeHtml(rrhh.anotaciones) : '';
            const puedeEditarRrhh = puedeRrhh;
            bloqueRrhh = `
                <div class="card" style="margin-top:16px;border-left:4px solid #e65100;">
                    <div class="card-body">
                        <h4 style="margin:0 0 8px;font-size:1rem;"><i class="fas fa-users" style="margin-right:8px;color:#e65100;"></i>Recursos Humanos</h4>
                        ${rrhh && rrhh.fecha ? `<p style="font-size:0.82rem;color:var(--text-secondary);">Última actualización: ${formatDateTime(rrhh.fecha)}</p>` : ''}
                        <div class="form-group" style="margin-top:10px;">
                            <label>Anotaciones (amonestación, medidas, etc.)</label>
                            <textarea class="form-control" id="sanctionRrhhAnot" rows="6" ${puedeEditarRrhh ? '' : 'readonly'} placeholder="Registre las anotaciones del caso...">${txt}</textarea>
                        </div>
                        ${puedeEditarRrhh ? `
                            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                <button type="button" class="btn btn-outline" onclick="App.submitSanctionRrhhGuardar('${idJs}')"><i class="fas fa-save"></i> Guardar anotaciones</button>
                                <button type="button" class="btn btn-primary" onclick="App.submitSanctionRrhhEnviarGerencia('${idJs}')"><i class="fas fa-arrow-right"></i> Enviar a Gerencia General</button>
                            </div>` : ''}
                    </div>
                </div>`;
        }

        let bloqueGg = '';
        if (puedeGg) {
            bloqueGg = `
                    <div class="card" style="margin-top:16px;border-left:4px solid #1a237e;">
                        <div class="card-body">
                            <h4 style="margin:0 0 8px;font-size:1rem;"><i class="fas fa-building" style="margin-right:8px;color:#1a237e;"></i>Gerencia General — cierre</h4>
                            <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;">Revise el caso y cierre el expediente.</p>
                            <div class="form-group">
                                <label>Comentario de cierre</label>
                                <textarea class="form-control" id="sanctionGgComent" rows="3" placeholder="Resolución o comentario final..."></textarea>
                            </div>
                            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;">
                                <input type="checkbox" id="sanctionGgAprueba" checked> <span>Caso aprobado / resuelto favorablemente para el cierre</span>
                            </label>
                            <button type="button" class="btn btn-primary" onclick="App.submitSanctionGerenciaCerrar('${idJs}')"><i class="fas fa-flag-checkered"></i> Cerrar expediente</button>
                        </div>
                    </div>`;
        } else if (flujoEtapa === SanctionFollowupManager.FLUJO_CERRADO) {
            bloqueGg = `
                    <div class="card" style="margin-top:16px;border-left:4px solid #37474f;">
                        <div class="card-body">
                            <h4 style="margin:0 0 8px;font-size:1rem;">Cierre — Gerencia General</h4>
                            <p><strong>Aprobación:</strong> ${ticket.gerenciaAprobado ? 'Sí' : 'No'}</p>
                            <p style="white-space:pre-wrap;font-size:0.9rem;">${App.escapeHtml(ticket.gerenciaComentario || '—')}</p>
                            ${ticket.gerenciaFecha ? `<p style="font-size:0.82rem;color:var(--text-secondary);">${formatDateTime(ticket.gerenciaFecha)}</p>` : ''}
                        </div>
                    </div>`;
        }

        const accionesCreador = puedeEditarCuerpo ? `
                    <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
                        <button type="button" class="btn btn-primary btn-sm" onclick="App.showSanctionEditModal('${idJs}')"><i class="fas fa-edit"></i> Editar texto / visibilidad</button>
                        <button type="button" class="btn btn-danger btn-sm" onclick="App.eliminarSanction('${idJs}')"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>` : '';

        content.innerHTML = `
            <div class="card">
                <div class="card-header" style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div>
                        <button type="button" class="btn btn-outline btn-sm" onclick="App.navigate('${volver}')"><i class="fas fa-arrow-left"></i> Volver</button>
                        <h3 style="margin-top:12px;"><i class="fas fa-file-alt" style="margin-right:8px;color:var(--primary);"></i>${App.escapeHtml(ticket.titulo || 'Sin título')}</h3>
                    </div>
                    <span class="status-badge ${abierto ? 'pendiente' : 'aprobada'}" style="align-self:flex-start;"><i class="fas fa-${abierto ? 'clock' : 'check'}"></i> ${App.escapeHtml(flujoLabel)}</span>
                </div>
                <div class="card-body">
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px;">
                        Creado por <strong>${App.escapeHtml(ticket.creadoPorNombre || '')}</strong>
                        · ${formatDateTime(ticket.fechaCreacion)}
                        ${ticket.fechaCierre ? ` · Cierre: ${formatDateTime(ticket.fechaCierre)}` : ''}
                    </p>
                    <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px;"><strong>Pueden ver el relato del caso:</strong> ${App.escapeHtml(visLine)}</p>
                    <div style="padding:16px;background:var(--bg-main);border-radius:var(--radius-md);border:1px solid var(--border-light);white-space:pre-wrap;font-size:0.92rem;line-height:1.5;">${App.escapeHtml(ticket.texto || '')}</div>
                    ${accionesCreador}
                    ${bloqueTi}
                    ${bloqueRrhh}
                    ${bloqueGg}
                </div>
            </div>`;
    }

    static async submitSanctionTiRevision(id) {
        const notas = document.getElementById('sanctionTiNotas')?.value || '';
        try {
            await SanctionFollowupManager.tiCompletarRevision(id, notas);
            Toast.success('Listo', 'El caso pasó a Recursos Humanos.');
            await App.refreshSanctionSharedNavItem();
            App.navigate('seguimiento-sanciones-detalle', { id });
        } catch (e) {
            Toast.error('Error', e.message || String(e));
        }
    }

    static async submitSanctionRrhhGuardar(id) {
        const anotaciones = document.getElementById('sanctionRrhhAnot')?.value || '';
        try {
            await SanctionFollowupManager.rrhhGuardarAnotaciones(id, anotaciones);
            Toast.success('Guardado', 'Anotaciones de RRHH actualizadas.');
            App.navigate('seguimiento-sanciones-detalle', { id });
        } catch (e) {
            Toast.error('Error', e.message || String(e));
        }
    }

    static async submitSanctionRrhhEnviarGerencia(id) {
        try {
            await SanctionFollowupManager.rrhhEnviarAGerencia(id);
            Toast.success('Enviado', 'El caso está en Gerencia General.');
            await App.refreshSanctionSharedNavItem();
            App.navigate('seguimiento-sanciones-detalle', { id });
        } catch (e) {
            Toast.error('Error', e.message || String(e));
        }
    }

    static async submitSanctionGerenciaCerrar(id) {
        const comentario = document.getElementById('sanctionGgComent')?.value || '';
        const aprobado = Boolean(document.getElementById('sanctionGgAprueba')?.checked);
        try {
            await SanctionFollowupManager.gerenciaCerrar(id, { comentario, aprobado });
            Toast.success('Cerrado', 'El expediente fue cerrado.');
            await App.refreshSanctionSharedNavItem();
            App.navigate('seguimiento-sanciones-detalle', { id });
        } catch (e) {
            Toast.error('Error', e.message || String(e));
        }
    }

    // ========================================================
    // USUARIOS (ADMIN)
    // ========================================================
    static async renderUsuarios() {
        if (!AuthManager.isAdmin()) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso Denegado</h3><p>No tiene permisos</p></div>`;
            return;
        }

        const content = document.getElementById('contentArea');
        
        // Mostrar loading mientras se cargan los usuarios
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-users-cog" style="margin-right:8px;color:var(--primary);"></i>Gestión de Usuarios</h3>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="App.showChangePasswordModal(false)"><i class="fas fa-key"></i> Mi Contraseña</button>
                        <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Usuario</button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="text-align:center;padding:40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i>
                        <p style="margin-top:16px;color:var(--text-secondary);">Cargando usuarios...</p>
                    </div>
                </div>
            </div>
        `;

        try {
            const users = await AuthManager.getAllUsers();
            await this.ensureDepsLoaded();
            console.log('Usuarios obtenidos:', users);

            if (!users || users.length === 0) {
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-users-cog" style="margin-right:8px;color:var(--primary);"></i>Gestión de Usuarios</h3>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-outline btn-sm" onclick="App.showChangePasswordModal(false)"><i class="fas fa-key"></i> Mi Contraseña</button>
                            <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Usuario</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="empty-state">
                            <i class="fas fa-users" style="font-size:3rem;color:var(--text-light);margin-bottom:16px;"></i>
                            <h3>No hay usuarios registrados</h3>
                            <p>Comience creando el primer usuario del sistema</p>
                            <button class="btn btn-primary" onclick="App.showCreateUserModal()" style="margin-top:16px;"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Crear Usuario</button>
                        </div>
                    </div>
                </div>
            `;
                return;
            }

            let depFilterHtml = '<option value="">Todos los departamentos</option>';
            Object.keys(App._depsMap).forEach(key => {
                depFilterHtml += `<option value="${key}">${App._depsMap[key].nombre}</option>`;
            });

            content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-users-cog" style="margin-right:8px;color:var(--primary);"></i>Gestión de Usuarios</h3>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="App.showChangePasswordModal(false)"><i class="fas fa-key"></i> Mi Contraseña</button>
                        <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus"></i> Nuevo Usuario</button>
                    </div>
                </div>
                <div class="card-body no-padding">
                    <div class="filters-bar" style="padding:16px 16px 0 16px;">
                        <div class="search-input">
                            <i class="fas fa-search"></i>
                            <input type="text" placeholder="Buscar usuario, cédula, puesto, correo, rol o departamento..." id="userSearchInput" oninput="App.filterUsers()">
                        </div>
                        <select class="filter-select" id="userDepFilter" onchange="App.filterUsers()">
                            ${depFilterHtml}
                        </select>
                    </div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Usuario</th><th>Cédula</th><th>Puesto</th><th>Email</th><th>Rol</th><th>Departamento</th><th>Código Firma</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody id="usersTableBody">${this.renderUsersRows(users)}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
            this._cachedUsers = users;
        } catch (error) {
            console.error('Error renderizando usuarios:', error);
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-users-cog" style="margin-right:8px;color:var(--primary);"></i>Gestión de Usuarios</h3>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-outline btn-sm" onclick="App.showChangePasswordModal(false)"><i class="fas fa-key"></i> Mi Contraseña</button>
                            <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Usuario</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--danger);margin-bottom:16px;"></i>
                            <h3>Error al cargar usuarios</h3>
                            <p>${error.message || 'Ocurrió un error al obtener los usuarios'}</p>
                            <button class="btn btn-primary" onclick="App.navigate('usuarios')" style="margin-top:16px;"><i class="fas fa-redo"></i> Reintentar</button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    static _cachedUsers = [];

    static renderUsersRows(users) {
        if (!users || users.length === 0) {
            return `
                <tr>
                    <td colspan="9" style="text-align:center;padding:24px;color:var(--text-secondary);">
                        No se encontraron usuarios con los filtros seleccionados
                    </td>
                </tr>
            `;
        }

        return users.map(u => {
            const dep = App._depsMap[u.departamento] || DEPARTAMENTOS[u.departamento];
            const managedExtra = u.rol === 'encargado'
                ? AuthManager.getDepartamentosEncargado(u).filter(id => id !== u.departamento)
                : [];
            const deptExtraHtml = managedExtra.length
                ? `<small style="display:block;margin-top:4px;color:var(--text-light);font-weight:400;">Encarga también: ${managedExtra.map(id => App.escapeHtml((App._depsMap[id] || DEPARTAMENTOS[id])?.nombre || id)).join(', ')}</small>`
                : '';
            const initials = (u.nombre[0] + u.apellido[0]).toUpperCase();
            const hasCode = u.codigoPersonal ? true : false;
            return `<tr>
                <td><div style="display:flex;align-items:center;gap:10px;">
                    <div class="user-avatar-sm" style="background:${dep?.color || 'var(--primary)'};">${initials}</div>
                    <div><strong>${u.nombre} ${u.apellido}</strong><br><small style="color:var(--text-light);">${u.id.substring(0,12)}...</small></div>
                </div></td>
                <td>${u.cedula || '<span style="color:var(--text-light);">Sin cédula</span>'}</td>
                <td>${u.puesto || '<span style="color:var(--text-light);">Sin puesto</span>'}</td>
                <td>${u.email}</td>
                <td><span class="role-badge ${u.rol}">${ROLES[u.rol]?.nombre || u.rol}</span></td>
                <td><span class="dep-chip" style="background:${dep?.color || '#546e7a'};"><i class="${dep?.icono || 'fas fa-building'}"></i> ${dep?.nombre || 'N/A'}${deptExtraHtml}</span></td>
                <td>
                    ${hasCode ?
                        `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;background:var(--success-light);color:var(--success);border-radius:4px;font-size:0.85rem;">
                            <i class="fas fa-check-circle"></i> Configurado
                        </span>` :
                        `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;background:var(--warning-light);color:var(--warning);border-radius:4px;font-size:0.85rem;">
                            <i class="fas fa-exclamation-circle"></i> Sin código
                        </span>`
                    }
                </td>
                <td><span class="status-badge ${u.activo ? 'aprobada' : 'rechazada'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td><div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="btn btn-sm btn-outline" onclick="App.showEditUserModal('${u.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline" onclick="App.handleResetUserPassword('${u.id}')" title="Forzar cambio de contraseña" style="border-color:var(--warning);color:var(--warning);">
                        <i class="fas fa-unlock-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="App.showManageCodeModal('${u.id}')" title="Gestionar código de firma" style="border-color:var(--primary);color:var(--primary);">
                        <i class="fas fa-key"></i>
                    </button>
                    ${u.id !== AuthManager.getUser().id ? `<button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="App.handleDeleteUser('${u.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                </div></td>
            </tr>`;
        }).join('');
    }

    static filterUsers() {
        const searchInput = document.getElementById('userSearchInput');
        const depSelect = document.getElementById('userDepFilter');
        const tableBody = document.getElementById('usersTableBody');
        if (!searchInput || !depSelect || !tableBody) return;

        const query = searchInput.value.toLowerCase().trim();
        const depFilter = depSelect.value;
        let users = this._cachedUsers;

        if (depFilter) {
            users = users.filter(u => AuthManager.getDepartamentosEncargado(u).includes(depFilter));
        }

        if (query) {
            users = users.filter(u => {
                const dep = App._depsMap[u.departamento] || DEPARTAMENTOS[u.departamento];
                const extraDepNames = AuthManager.getDepartamentosEncargado(u)
                    .map(id => (App._depsMap[id] || DEPARTAMENTOS[id])?.nombre || '')
                    .join(' ')
                    .toLowerCase();
                const fullName = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
                const cedula = (u.cedula || '').toLowerCase();
                const puesto = (u.puesto || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const roleName = (ROLES[u.rol]?.nombre || u.rol || '').toLowerCase();
                const depName = (dep?.nombre || '').toLowerCase();
                const depCode = (dep?.codigo || u.departamento || '').toLowerCase();

                return fullName.includes(query) ||
                    cedula.includes(query) ||
                    puesto.includes(query) ||
                    email.includes(query) ||
                    roleName.includes(query) ||
                    depName.includes(query) ||
                    depCode.includes(query) ||
                    extraDepNames.includes(query);
            });
        }

        tableBody.innerHTML = this.renderUsersRows(users);
    }

    static buildEncargadoDepartamentosCheckboxesHtml(nameAttr, preselectedIds = []) {
        const selected = new Set(preselectedIds);
        let html = '';
        Object.keys(App._depsMap).forEach(key => {
            const dep = App._depsMap[key];
            const chk = selected.has(key) ? 'checked' : '';
            html += `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;"><input type="checkbox" name="${nameAttr}" value="${key}" ${chk}> <span>${App.escapeHtml(dep.nombre)} <small style="color:var(--text-secondary);">(${App.escapeHtml(key)})</small></span></label>`;
        });
        return html;
    }

    static syncEncargadoDepartamentosUI(mode) {
        const rolEl = document.getElementById(mode === 'new' ? 'newUserRol' : 'editUserRol');
        const wrap = document.getElementById(mode === 'new' ? 'newUserEncDepsWrap' : 'editUserEncDepsWrap');
        if (!rolEl || !wrap) return;
        const show = rolEl.value === 'encargado';
        wrap.style.display = show ? 'block' : 'none';
        if (show) App.syncPrimaryDepCheckbox(mode);
    }

    static syncPrimaryDepCheckbox(mode) {
        const depSel = document.getElementById(mode === 'new' ? 'newUserDep' : 'editUserDep');
        const wrap = document.getElementById(mode === 'new' ? 'newUserEncDepsWrap' : 'editUserEncDepsWrap');
        if (!depSel || !wrap || wrap.style.display === 'none') return;
        const v = depSel.value;
        if (!v) return;
        wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (cb.value === v) cb.checked = true;
        });
    }

    static async showCreateUserModal() {
        await this.ensureDepsLoaded();
        let depsOpts = '';
        Object.keys(App._depsMap).forEach(key => { depsOpts += `<option value="${key}">${App._depsMap[key].nombre}</option>`; });

        const encChecks = App.buildEncargadoDepartamentosCheckboxesHtml('newUserEncDep', []);

        this.showModal('Crear Nuevo Usuario', `
            <form onsubmit="App.handleCreateUser(event)">
                <div class="form-row">
                    <div class="form-group"><label>Nombre <span class="required">*</span></label><input type="text" class="form-control" id="newUserNombre" required></div>
                    <div class="form-group"><label>Apellido <span class="required">*</span></label><input type="text" class="form-control" id="newUserApellido" required></div>
                </div>
                <div class="form-group"><label>Cédula <span class="required">*</span></label><input type="text" class="form-control" id="newUserCedula" required></div>
                <div class="form-group"><label>Puesto <span class="required">*</span></label><input type="text" class="form-control" id="newUserPuesto" required></div>
                <div class="form-group"><label>Email <span class="required">*</span></label><input type="email" class="form-control" id="newUserEmail" required></div>
                <div class="form-group">
                    <label>Contraseña temporal <span class="required">*</span> (mín. 6 caracteres)</label>
                    <input type="password" class="form-control" id="newUserPassword" value="123456" required minlength="6">
                    <small style="display:block;margin-top:6px;color:var(--text-light);">El usuario deberá cambiarla al primer ingreso.</small>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Rol <span class="required">*</span></label><select class="form-control" id="newUserRol" required onchange="App.syncEncargadoDepartamentosUI('new')"><option value="">Seleccionar...</option>
                        ${Object.keys(ROLES).map(r => `<option value="${r}">${ROLES[r].nombre}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Departamento principal <span class="required">*</span></label><select class="form-control" id="newUserDep" required onchange="App.syncPrimaryDepCheckbox('new')"><option value="">Seleccionar...</option>${depsOpts}</select></div>
                </div>
                <div class="form-group" id="newUserEncDepsWrap" style="display:none;">
                    <label>Departamentos donde es encargado de área</label>
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">Marque cada área que esta persona supervisa. El departamento principal queda incluido automáticamente.</p>
                    <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px;">
                        ${encChecks}
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnCreateUser"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Crear</button>
                </div>
            </form>
        `);
        App.syncEncargadoDepartamentosUI('new');
    }

    static async handleCreateUser(e) {
        e.preventDefault();
        const btn = document.getElementById('btnCreateUser');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        const rol = document.getElementById('newUserRol').value;
        const dep = document.getElementById('newUserDep').value;
        let departamentosEncargado = null;
        if (rol === 'encargado') {
            departamentosEncargado = {};
            document.querySelectorAll('input[name="newUserEncDep"]:checked').forEach(cb => {
                departamentosEncargado[cb.value] = true;
            });
            departamentosEncargado[dep] = true;
        }

        const userData = {
            nombre: document.getElementById('newUserNombre').value,
            apellido: document.getElementById('newUserApellido').value,
            cedula: document.getElementById('newUserCedula').value.trim(),
            puesto: document.getElementById('newUserPuesto').value.trim(),
            email: document.getElementById('newUserEmail').value,
            password: document.getElementById('newUserPassword').value,
            rol,
            departamento: dep,
            departamentosEncargado
        };

        const result = await AuthManager.createUser(userData);

        if (result.success) {
            this.closeModal();
            Toast.success('Usuario creado', `${userData.nombre} ${userData.apellido} ha sido creado`);
            this.navigate('usuarios');
        } else {
            Toast.error('Error', result.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Crear';
        }
    }

    static showChangePasswordModal(forced = false) {
        this._forcePasswordModal = Boolean(forced);
        const forcedHtml = forced
            ? `<div style="padding:12px;border-radius:8px;background:var(--warning-light);color:var(--warning);margin-bottom:14px;">
                    <i class="fas fa-exclamation-triangle"></i> Debe cambiar su contraseña temporal para continuar usando el sistema.
               </div>`
            : '';
        this.showModal('Cambiar Mi Contraseña', `
            ${forcedHtml}
            <form onsubmit="App.handleChangePassword(event)">
                <div class="form-group">
                    <label>Contraseña actual</label>
                    <input type="password" class="form-control" id="currentPasswordInput" required minlength="6">
                </div>
                <div class="form-group">
                    <label>Nueva contraseña</label>
                    <input type="password" class="form-control" id="newPasswordInput" required minlength="6">
                </div>
                <div class="form-group">
                    <label>Confirmar nueva contraseña</label>
                    <input type="password" class="form-control" id="confirmPasswordInput" required minlength="6">
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    ${forced ? '' : '<button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>'}
                    <button type="submit" class="btn btn-primary" id="btnChangePassword"><i class="fas fa-save"></i> Guardar contraseña</button>
                </div>
            </form>
        `);
    }

    static async handleChangePassword(e) {
        e.preventDefault();
        const btn = document.getElementById('btnChangePassword');
        const currentPassword = document.getElementById('currentPasswordInput').value;
        const newPassword = document.getElementById('newPasswordInput').value;
        const confirmPassword = document.getElementById('confirmPasswordInput').value;

        if (newPassword !== confirmPassword) {
            Toast.error('Validación', 'La confirmación de contraseña no coincide');
            return;
        }
        if (newPassword.length < 6) {
            Toast.error('Validación', 'La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (currentPassword === newPassword) {
            Toast.error('Validación', 'La nueva contraseña debe ser distinta a la actual');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const result = await AuthManager.changeCurrentPassword(currentPassword, newPassword);
        if (!result.success) {
            Toast.error('Error', result.message || 'No se pudo actualizar la contraseña');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar contraseña';
            return;
        }

        this._forcePasswordModal = false;
        this.closeModal();
        Toast.success('Éxito', 'Su contraseña personal se actualizó correctamente');
        if (this.currentView === 'usuarios') {
            this.navigate('usuarios');
        }
    }

    static async handleResetUserPassword(userId) {
        const user = await AuthManager.getUserById(userId);
        if (!user || !user.email) {
            Toast.error('Error', 'No se encontró el usuario o su correo');
            return;
        }

        const markResult = await AuthManager.markUserMustChangePassword(userId, true);
        if (!markResult.success) {
            Toast.error('Error', markResult.message || 'No se pudo actualizar el estado del usuario');
            return;
        }

        const resetResult = await AuthManager.sendPasswordReset(user.email);
        if (!resetResult.success) {
            Toast.warning('Aviso', 'Se marcó el cambio obligatorio, pero no se pudo enviar correo automático');
            return;
        }

        Toast.success('Listo', `Se envió correo de restablecimiento a ${user.email}`);
    }

    static async showEditUserModal(userId) {
        const user = await AuthManager.getUserById(userId);
        if (!user) return;

        await this.ensureDepsLoaded();
        let depsOpts = '';
        Object.keys(App._depsMap).forEach(key => { depsOpts += `<option value="${key}" ${user.departamento === key ? 'selected' : ''}>${App._depsMap[key].nombre}</option>`; });

        const encPreselected = AuthManager.getDepartamentosEncargado(user);
        const encChecks = App.buildEncargadoDepartamentosCheckboxesHtml('editUserEncDep', encPreselected);

        this.showModal('Editar Usuario', `
            <form onsubmit="App.handleEditUser(event, '${userId}')">
                <div class="form-row">
                    <div class="form-group"><label>Nombre</label><input type="text" class="form-control" id="editUserNombre" value="${user.nombre}" required></div>
                    <div class="form-group"><label>Apellido</label><input type="text" class="form-control" id="editUserApellido" value="${user.apellido}" required></div>
                </div>
                <div class="form-group"><label>Cédula</label><input type="text" class="form-control" id="editUserCedula" value="${user.cedula || ''}" required></div>
                <div class="form-group"><label>Puesto</label><input type="text" class="form-control" id="editUserPuesto" value="${user.puesto || ''}" required></div>
                <div class="form-group"><label>Email</label><input type="email" class="form-control" id="editUserEmail" value="${user.email}" required></div>
                <div class="form-row">
                    <div class="form-group"><label>Rol</label><select class="form-control" id="editUserRol" required onchange="App.syncEncargadoDepartamentosUI('edit')">
                        ${Object.keys(ROLES).map(r => `<option value="${r}" ${user.rol === r ? 'selected' : ''}>${ROLES[r].nombre}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Departamento principal</label><select class="form-control" id="editUserDep" required onchange="App.syncPrimaryDepCheckbox('edit')">${depsOpts}</select></div>
                </div>
                <div class="form-group" id="editUserEncDepsWrap" style="display:none;">
                    <label>Departamentos donde es encargado de área</label>
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">Marque cada área que esta persona supervisa. El departamento principal queda incluido automáticamente.</p>
                    <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-sm);padding:10px;">
                        ${encChecks}
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnEditUser"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </form>
        `);
        App.syncEncargadoDepartamentosUI('edit');
    }

    static async handleEditUser(e, userId) {
        e.preventDefault();
        const btn = document.getElementById('btnEditUser');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const rol = document.getElementById('editUserRol').value;
        const dep = document.getElementById('editUserDep').value;
        let departamentosEncargado = null;
        if (rol === 'encargado') {
            departamentosEncargado = {};
            document.querySelectorAll('input[name="editUserEncDep"]:checked').forEach(cb => {
                departamentosEncargado[cb.value] = true;
            });
            departamentosEncargado[dep] = true;
        }

        const updates = {
            nombre: document.getElementById('editUserNombre').value,
            apellido: document.getElementById('editUserApellido').value,
            cedula: document.getElementById('editUserCedula').value.trim(),
            puesto: document.getElementById('editUserPuesto').value.trim(),
            email: document.getElementById('editUserEmail').value,
            rol,
            departamento: dep,
            departamentosEncargado
        };

        await AuthManager.updateUser(userId, updates);
        this.closeModal();
        Toast.success('Actualizado', 'Los cambios han sido guardados');
        this.updateSidebar();
        this.navigate('usuarios');
    }

    static handleDeleteUser(userId) {
        this.showModal('Eliminar Usuario', `
            <p style="margin-bottom:20px;">¿Está seguro de que desea <strong style="color:var(--danger);">eliminar</strong> este usuario? Esta acción no se puede deshacer.</p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                <button class="btn btn-danger" onclick="App.confirmDeleteUser('${userId}')"><i class="fas fa-trash"></i> Eliminar</button>
            </div>
        `);
    }

    static async confirmDeleteUser(userId) {
        const result = await AuthManager.deleteUser(userId);
        if (!result.success) {
            Toast.error('Error', result.message || 'No se pudo eliminar el usuario');
            return;
        }

        this.closeModal();
        Toast.success('Usuario eliminado', 'El usuario ha sido eliminado correctamente');
        this.navigate('usuarios');
    }

    static async showManageCodeModal(userId) {
        const user = await AuthManager.getUserById(userId);
        if (!user) {
            Toast.error('Error', 'Usuario no encontrado');
            return;
        }

        const hasCode = user.codigoPersonal ? true : false;
        const codeDisplay = hasCode ? 
            `<div style="background:var(--success-light);padding:12px;border-radius:6px;margin-bottom:16px;">
                <p style="margin:0;font-size:0.9rem;color:var(--text-secondary);margin-bottom:8px;">Código actual:</p>
                <div style="display:flex;align-items:center;gap:10px;">
                    <code style="font-size:1.2rem;letter-spacing:3px;font-weight:600;color:var(--success);background:white;padding:8px 12px;border-radius:4px;flex:1;text-align:center;">${user.codigoPersonal}</code>
                    <button class="btn btn-sm btn-outline" onclick="App.copyCodeToClipboard('${user.codigoPersonal}')" title="Copiar">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>` : 
            `<div style="background:var(--warning-light);padding:12px;border-radius:6px;margin-bottom:16px;">
                <p style="margin:0;font-size:0.9rem;color:var(--text-secondary);">
                    <i class="fas fa-exclamation-circle"></i> Este usuario no tiene un código personal configurado.
                </p>
            </div>`;

        this.showModal('Gestionar Código de Firma', `
            <div style="margin-bottom:20px;">
                <p style="color:var(--text-secondary);margin-bottom:16px;">
                    El código personal es necesario para que el usuario pueda firmar documentos. 
                    Puede generar un código automático o crear uno personalizado.
                </p>
                ${codeDisplay}
            </div>
            <form onsubmit="App.handleManageCode(event, '${userId}')">
                <div class="form-group">
                    <label>Nuevo Código Personal <span class="required">*</span></label>
                    <input type="text" class="form-control" id="newPersonalCode" 
                           placeholder="Ingrese o genere un código" 
                           minlength="4" 
                           maxlength="20"
                           required
                           style="letter-spacing:2px;text-align:center;">
                    <small style="color:var(--text-light);margin-top:6px;display:block;">
                        Mínimo 4 caracteres, máximo 20. Solo letras y números.
                    </small>
                </div>
                <div style="display:flex;gap:10px;margin-bottom:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.generateRandomCode()" style="flex:1;">
                        <i class="fas fa-dice"></i> Generar Aleatorio
                    </button>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnSaveCode">
                        <i class="fas fa-save"></i> ${hasCode ? 'Actualizar' : 'Crear'} Código
                    </button>
                </div>
            </form>
        `);

        // Generar código aleatorio por defecto si no tiene código
        if (!hasCode) {
            this.generateRandomCode();
        }
    }

    static generateRandomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, O, 0, 1 para evitar confusión
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const codeInput = document.getElementById('newPersonalCode');
        if (codeInput) {
            codeInput.value = code;
        }
    }

    static copyCodeToClipboard(code) {
        navigator.clipboard.writeText(code).then(() => {
            Toast.success('Copiado', 'Código copiado al portapapeles');
        }).catch(() => {
            Toast.error('Error', 'No se pudo copiar el código');
        });
    }

    static async handleManageCode(e, userId) {
        e.preventDefault();
        const btn = document.getElementById('btnSaveCode');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const code = document.getElementById('newPersonalCode').value.trim().toUpperCase();
        
        // Validar formato (solo letras y números)
        if (!/^[A-Z0-9]{4,20}$/.test(code)) {
            Toast.error('Error', 'El código debe contener solo letras y números, entre 4 y 20 caracteres');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar Código';
            return;
        }

        const result = await AuthManager.updateUserCode(userId, code);

        if (result.success) {
            this.closeModal();
            Toast.success('Éxito', 'Código personal actualizado correctamente');
            this.navigate('usuarios');
        } else {
            Toast.error('Error', result.message || 'No se pudo actualizar el código');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar Código';
        }
    }

    // ========================================================
    // DEPARTAMENTOS (ADMIN)
    // ========================================================
    static async renderDepartamentos() {
        if (!AuthManager.isAdmin()) {
            document.getElementById('contentArea').innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso Denegado</h3><p>No tiene permisos</p></div>`;
            return;
        }

        const content = document.getElementById('contentArea');
        
        // Mostrar loading mientras se cargan los departamentos
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-building" style="margin-right:8px;color:var(--primary);"></i>Gestión de Departamentos</h3>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="App.syncDepartamentos()" title="Sincronizar desde configuración">
                            <i class="fas fa-sync-alt"></i> Sincronizar
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="App.showCreateDepartamentoModal()">
                            <i class="fas fa-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Departamento
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="text-align:center;padding:40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i>
                        <p style="margin-top:16px;color:var(--text-secondary);">Cargando departamentos...</p>
                    </div>
                </div>
            </div>
        `;

        try {
            const departamentos = await DepartamentoManager.getAll();
            console.log('Departamentos obtenidos:', departamentos);

            if (!departamentos || departamentos.length === 0) {
                content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-building" style="margin-right:8px;color:var(--primary);"></i>Gestión de Departamentos</h3>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-outline btn-sm" onclick="App.syncDepartamentos()" title="Sincronizar desde configuración">
                                <i class="fas fa-sync-alt"></i> Sincronizar
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="App.showCreateDepartamentoModal()">
                                <i class="fas fa-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Departamento
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="empty-state">
                            <i class="fas fa-building" style="font-size:3rem;color:var(--text-light);margin-bottom:16px;"></i>
                            <h3>No hay departamentos registrados</h3>
                            <p>Comience creando el primer departamento o sincronizando desde la configuración</p>
                            <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
                                <button class="btn btn-outline" onclick="App.syncDepartamentos()">
                                    <i class="fas fa-sync-alt" style="vertical-align:middle;margin-right:6px;"></i> Sincronizar
                                </button>
                                <button class="btn btn-primary" onclick="App.showCreateDepartamentoModal()">
                                    <i class="fas fa-plus" style="vertical-align:middle;margin-right:6px;"></i> Crear Departamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
                return;
            }

            content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-building" style="margin-right:8px;color:var(--primary);"></i>Gestión de Departamentos</h3>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm" onclick="App.syncDepartamentos()" title="Sincronizar desde configuración">
                            <i class="fas fa-sync-alt"></i> Sincronizar
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="App.showCreateDepartamentoModal()">
                            <i class="fas fa-plus"></i> Nuevo Departamento
                        </button>
                    </div>
                </div>
                <div class="card-body no-padding">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nombre</th>
                                    <th>Color</th>
                                    <th>Icono</th>
                                    <th>Categorías</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${departamentos.map(dep => {
                                    const categoriasCount = dep.categorias ? Object.keys(dep.categorias).length : 0;
                                    const activo = dep.activo !== false; // Por defecto activo
                                    const depKey = dep.codigo || dep.id;
                                    const depKeyEscaped = this.escapeJsString(depKey);
                                    return `<tr>
                                        <td><strong>${this.escapeHtml(depKey)}</strong></td>
                                        <td>
                                            <div style="display:flex;align-items:center;gap:10px;">
                                                <div style="width:40px;height:40px;background:${dep.color || '#546e7a'};border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;">
                                                    <i class="${dep.icono || 'fas fa-building'}"></i>
                                                </div>
                                                <div><strong>${dep.nombre}</strong></div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style="display:flex;align-items:center;gap:8px;">
                                                <div style="width:30px;height:30px;background:${dep.color || '#546e7a'};border-radius:4px;border:1px solid rgba(0,0,0,0.1);"></div>
                                                <span style="font-family:monospace;font-size:0.85rem;">${dep.color || '#546e7a'}</span>
                                            </div>
                                        </td>
                                        <td><i class="${dep.icono || 'fas fa-building'}" style="font-size:1.2rem;color:${dep.color || '#546e7a'};"></i></td>
                                        <td><span class="badge" style="background:var(--primary-light);color:var(--primary);">${categoriasCount} categoría(s)</span></td>
                                        <td><span class="status-badge ${activo ? 'aprobada' : 'rechazada'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
                                        <td>
                                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                                <button class="btn btn-sm btn-outline" onclick="App.showEditDepartamentoModal('${depKeyEscaped}')" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline" onclick="App.showViewDepartamentoModal('${depKeyEscaped}')" title="Ver detalles">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="App.handleDeleteDepartamento('${depKeyEscaped}')" title="Eliminar">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        } catch (error) {
            console.error('Error renderizando departamentos:', error);
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-building" style="margin-right:8px;color:var(--primary);"></i>Gestión de Departamentos</h3>
                        <button class="btn btn-primary btn-sm" onclick="App.showCreateDepartamentoModal()">
                            <i class="fas fa-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Departamento
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:var(--danger);margin-bottom:16px;"></i>
                            <h3>Error al cargar departamentos</h3>
                            <p>${error.message || 'Ocurrió un error al obtener los departamentos'}</p>
                            <button class="btn btn-primary" onclick="App.navigate('departamentos')" style="margin-top:16px;">
                                <i class="fas fa-redo"></i> Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    static showCreateDepartamentoModal() {
        // Iconos disponibles comunes
        const iconos = [
            { value: 'fas fa-building', label: 'Edificio' },
            { value: 'fas fa-chart-line', label: 'Finanzas' },
            { value: 'fas fa-file-medical', label: 'Documentos' },
            { value: 'fas fa-users', label: 'Recursos Humanos' },
            { value: 'fas fa-concierge-bell', label: 'Recepción' },
            { value: 'fas fa-hospital', label: 'Hospital' },
            { value: 'fas fa-stethoscope', label: 'Médico' },
            { value: 'fas fa-briefcase', label: 'Oficina' },
            { value: 'fas fa-clipboard', label: 'Administración' }
        ];

        const iconosOptions = iconos.map(icon => 
            `<option value="${icon.value}">${icon.label}</option>`
        ).join('');

        this.showModal('Crear Nuevo Departamento', `
            <form onsubmit="App.handleCreateDepartamento(event)">
                <div class="form-group">
                    <label>Código <span class="required">*</span></label>
                    <input type="text" class="form-control" id="newDepCodigo" placeholder="Ej: DG-100" required pattern="[A-Za-z0-9\-]+" style="text-transform:uppercase;" oninput="this.value=this.value.replace(/[^A-Za-z0-9\-]/g,'').toUpperCase()">
                    <p class="form-help" style="color:var(--text-secondary);">Solo letras, números y guiones (<strong>-</strong>). No se permiten puntos ni caracteres especiales.</p>
                </div>
                <div class="form-group">
                    <label>Nombre <span class="required">*</span></label>
                    <input type="text" class="form-control" id="newDepNombre" placeholder="Ej: Gerencia General" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Color <span class="required">*</span></label>
                        <input type="color" class="form-control" id="newDepColor" value="#546e7a" required style="height:45px;">
                    </div>
                    <div class="form-group">
                        <label>Icono <span class="required">*</span></label>
                        <select class="form-control" id="newDepIcono" required>
                            ${iconosOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Categorías (Opcional)</label>
                    <p class="form-help">Las categorías se pueden agregar después de crear el departamento</p>
                    <textarea class="form-control" id="newDepCategorias" rows="3" placeholder='Formato JSON: {"1": {"nombre": "Categoría", "subcategorias": {"1.1": "Subcategoría"}}}' style="font-family:monospace;font-size:0.85rem;"></textarea>
                    <p class="form-help" style="font-size:0.75rem;margin-top:4px;">Deje vacío para agregar categorías después, o ingrese JSON válido</p>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnCreateDep">
                        <i class="fas fa-plus" style="vertical-align:middle;margin-right:6px;"></i> Crear
                    </button>
                </div>
            </form>
        `);
    }

    static async handleCreateDepartamento(e) {
        e.preventDefault();
        const btn = document.getElementById('btnCreateDep');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        const codigo = document.getElementById('newDepCodigo').value.toUpperCase().trim();
        const nombre = document.getElementById('newDepNombre').value.trim();
        const color = document.getElementById('newDepColor').value;
        const icono = document.getElementById('newDepIcono').value;
        let categorias = {};

        // Validar que el código no tenga caracteres inválidos para Firebase
        const FIREBASE_INVALID = /[.#$\[\]\/]/;
        if (FIREBASE_INVALID.test(codigo)) {
            Toast.error('Código inválido', 'El código no puede contener ".", "#", "$", "/", "[" o "]". Use solo letras, números y guiones.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Crear';
            return;
        }

        // Intentar parsear categorías si se proporcionaron
        const categoriasText = document.getElementById('newDepCategorias').value.trim();
        if (categoriasText) {
            try {
                categorias = JSON.parse(categoriasText);
            } catch (error) {
                Toast.error('Error', 'Formato JSON inválido en categorías');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus"></i> Crear';
                return;
            }
        }

        const depData = {
            codigo,
            nombre,
            color,
            icono,
            categorias
        };

        const result = await DepartamentoManager.create(depData);

        if (result.success) {
            this.closeModal();
            Toast.success('Departamento creado', `${nombre} ha sido creado correctamente`);
            this.navigate('departamentos');
        } else {
            Toast.error('Error', result.message || 'No se pudo crear el departamento');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Crear';
        }
    }

    static async showEditDepartamentoModal(depId) {
        const dep = await DepartamentoManager.getById(depId);
        if (!dep) {
            Toast.error('Error', 'Departamento no encontrado');
            return;
        }

        const iconos = [
            { value: 'fas fa-building', label: 'Edificio' },
            { value: 'fas fa-chart-line', label: 'Finanzas' },
            { value: 'fas fa-file-medical', label: 'Documentos' },
            { value: 'fas fa-users', label: 'Recursos Humanos' },
            { value: 'fas fa-concierge-bell', label: 'Recepción' },
            { value: 'fas fa-hospital', label: 'Hospital' },
            { value: 'fas fa-stethoscope', label: 'Médico' },
            { value: 'fas fa-briefcase', label: 'Oficina' },
            { value: 'fas fa-clipboard', label: 'Administración' }
        ];

        const iconosOptions = iconos.map(icon => 
            `<option value="${icon.value}" ${dep.icono === icon.value ? 'selected' : ''}>${icon.label}</option>`
        ).join('');

        // Si Firebase no tiene categorías guardadas, usar las de data.js como base
        const depCategorias = (dep.categorias && Object.keys(dep.categorias).length > 0)
            ? dep.categorias
            : (DEPARTAMENTOS[depId]?.categorias || {});
        const categoriasJson = JSON.stringify(depCategorias, null, 2);
        const depIdEscaped = this.escapeJsString(depId);
        const depCodigoEscaped = this.escapeHtml(dep.codigo || depId);
        const depNombreEscaped = this.escapeHtml(dep.nombre || '');
        const categoriasJsonEscaped = this.escapeHtml(categoriasJson);
        const tieneCatsDeDataJs = !(dep.categorias && Object.keys(dep.categorias).length > 0) && Object.keys(depCategorias).length > 0;

        this.showModal('Editar Departamento', `
            <form onsubmit="App.handleEditDepartamento(event, '${depIdEscaped}')">
                <div class="form-group">
                    <label>Código</label>
                    <input type="text" class="form-control" id="editDepCodigo" value="${depCodigoEscaped}" disabled style="background:var(--bg-secondary);">
                    <p class="form-help">El código no se puede modificar</p>
                </div>
                <div class="form-group">
                    <label>Nombre <span class="required">*</span></label>
                    <input type="text" class="form-control" id="editDepNombre" value="${depNombreEscaped}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Color <span class="required">*</span></label>
                        <input type="color" class="form-control" id="editDepColor" value="${dep.color || '#546e7a'}" required style="height:45px;">
                    </div>
                    <div class="form-group">
                        <label>Icono <span class="required">*</span></label>
                        <select class="form-control" id="editDepIcono" required>
                            ${iconosOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Categorías</label>
                    ${tieneCatsDeDataJs ? `<div style="padding:8px 12px;background:rgba(255,152,0,0.12);border-left:3px solid var(--warning);border-radius:4px;margin-bottom:8px;font-size:0.82rem;color:var(--warning);">
                        <i class="fas fa-info-circle" style="margin-right:6px;"></i>
                        Categorías cargadas desde la configuración base. Guarda para sincronizarlas con Firebase.
                    </div>` : ''}
                    <textarea class="form-control" id="editDepCategorias" rows="12" style="font-family:monospace;font-size:0.82rem;">${categoriasJsonEscaped}</textarea>
                    <p class="form-help" style="font-size:0.75rem;margin-top:4px;">Formato JSON. Modifique con cuidado para mantener la estructura válida.</p>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnEditDep">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                </div>
            </form>
        `);
    }

    static async handleEditDepartamento(e, depId) {
        e.preventDefault();
        const btn = document.getElementById('btnEditDep');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const nombre = document.getElementById('editDepNombre').value.trim();
        const color = document.getElementById('editDepColor').value;
        const icono = document.getElementById('editDepIcono').value;
        let categorias = {};

        // Parsear categorías
        const categoriasText = document.getElementById('editDepCategorias').value.trim();
        try {
            categorias = categoriasText ? JSON.parse(categoriasText) : {};
        } catch (error) {
            Toast.error('Error', 'Formato JSON inválido en categorías');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
            return;
        }

        const updates = {
            nombre,
            color,
            icono,
            categorias
        };

        const result = await DepartamentoManager.update(depId, updates);

        if (result.success) {
            this.closeModal();
            Toast.success('Actualizado', 'Los cambios han sido guardados');
            this.navigate('departamentos');
        } else {
            Toast.error('Error', result.message || 'No se pudo actualizar el departamento');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    }

    static async showViewDepartamentoModal(depId) {
        const dep = await DepartamentoManager.getById(depId);
        if (!dep) {
            Toast.error('Error', 'Departamento no encontrado');
            return;
        }

        const categorias = dep.categorias || {};
        const categoriasHtml = Object.keys(categorias).length > 0 
            ? Object.entries(categorias).map(([catKey, cat]) => {
                const subcats = cat.subcategorias || {};
                const subcatsHtml = Object.entries(subcats).map(([subKey, subName]) => 
                    `<div style="padding:8px 12px;background:var(--bg-secondary);border-radius:4px;margin-left:20px;margin-top:4px;">
                        <strong>${subKey}:</strong> ${subName}
                    </div>`
                ).join('');
                return `
                    <div style="margin-bottom:12px;padding:12px;background:var(--bg-secondary);border-radius:8px;">
                        <strong style="color:var(--primary);">${catKey}: ${cat.nombre}</strong>
                        ${subcatsHtml}
                    </div>
                `;
            }).join('')
            : '<p style="color:var(--text-light);font-style:italic;">No hay categorías definidas</p>';

        this.showModal('Detalles del Departamento', `
            <div style="margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:var(--bg-secondary);border-radius:8px;">
                    <div style="width:60px;height:60px;background:${dep.color || '#546e7a'};border-radius:12px;display:flex;align-items:center;justify-content:center;color:white;font-size:1.5rem;">
                        <i class="${dep.icono || 'fas fa-building'}"></i>
                    </div>
                    <div>
                        <h3 style="margin:0;color:var(--text-primary);">${dep.nombre}</h3>
                        <p style="margin:4px 0 0 0;color:var(--text-secondary);font-size:0.9rem;"><strong>Código:</strong> ${dep.codigo || depId}</p>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-primary);">Color</label>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:50px;height:50px;background:${dep.color || '#546e7a'};border-radius:8px;border:2px solid rgba(0,0,0,0.1);"></div>
                        <span style="font-family:monospace;font-size:1rem;color:var(--text-secondary);">${dep.color || '#546e7a'}</span>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;margin-bottom:8px;font-weight:600;color:var(--text-primary);">Icono</label>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <i class="${dep.icono || 'fas fa-building'}" style="font-size:2rem;color:${dep.color || '#546e7a'};"></i>
                        <span style="font-family:monospace;font-size:0.9rem;color:var(--text-secondary);">${dep.icono || 'fas fa-building'}</span>
                    </div>
                </div>
                <div>
                    <label style="display:block;margin-bottom:12px;font-weight:600;color:var(--text-primary);">Categorías (${Object.keys(categorias).length})</label>
                    ${categoriasHtml}
                </div>
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                <button class="btn btn-outline" onclick="App.closeModal()">Cerrar</button>
                <button class="btn btn-primary" onclick="App.closeModal(); App.showEditDepartamentoModal('${depId}')">
                    <i class="fas fa-edit" style="margin-right:6px;"></i> Editar
                </button>
            </div>
        `);
    }

    static handleDeleteDepartamento(depId) {
        this.showModal('Eliminar Departamento', `
            <p style="margin-bottom:20px;">¿Está seguro de que desea <strong style="color:var(--danger);">eliminar</strong> este departamento?</p>
            <p style="margin-bottom:20px;padding:12px;background:var(--warning-light);border-left:4px solid var(--warning);border-radius:4px;font-size:0.9rem;">
                <i class="fas fa-exclamation-triangle" style="margin-right:6px;"></i>
                <strong>Advertencia:</strong> Esta acción no se puede deshacer. El departamento solo se puede eliminar si no tiene usuarios ni documentos asociados.
            </p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                <button class="btn btn-danger" onclick="App.confirmDeleteDepartamento('${depId}')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `);
    }

    static async confirmDeleteDepartamento(depId) {
        const btn = event.target;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

        const result = await DepartamentoManager.delete(depId);

        if (result.success) {
            this.closeModal();
            Toast.success('Eliminado', 'El departamento ha sido eliminado');
            this.navigate('departamentos');
        } else {
            Toast.error('Error', result.message || 'No se pudo eliminar el departamento');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
        }
    }

    static async syncDepartamentos() {
        const confirmed = confirm('¿Desea sincronizar los departamentos desde la configuración inicial? Esto agregará los departamentos que no existen en Firebase.');
        if (!confirmed) return;

        Toast.info('Sincronizando', 'Sincronizando departamentos...');
        const result = await DepartamentoManager.syncFromDataJs();

        if (result.success) {
            const msg = result.synced === 0
                ? 'Todos los departamentos ya estaban actualizados'
                : `${result.created || 0} creado(s), ${result.updated || 0} actualizado(s) con categorías`;
            Toast.success('Sincronizado', msg);
            this.navigate('departamentos');
        } else {
            Toast.error('Error', result.message || 'No se pudo sincronizar');
        }
    }

    // ========================================================
    // NOTIFICACIONES
    // ========================================================
    static toggleNotifications() {
        const panel = document.getElementById('notifPanel');
        const overlay = document.getElementById('notifOverlay');
        const isOpen = panel.classList.contains('open');

        if (isOpen) {
            panel.classList.remove('open');
            overlay.classList.remove('open');
        } else {
            this.renderNotifications();
            panel.classList.add('open');
            overlay.classList.add('open');
        }
    }

    static async renderNotifications() {
        const user = AuthManager.getUser();
        if (!user) return;

        const notifications = await NotificationManager.getByUser(user.id);
        const container = document.getElementById('notifList');

        if (notifications.length === 0) {
            container.innerHTML = `<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>No hay notificaciones</p></div>`;
            return;
        }

        container.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.leida ? '' : 'unread'}" onclick="App.handleNotifClick('${n.id}', '${n.referenciaType}', '${n.referencia}')">
                <div class="notif-icon" style="background:${NotificationManager.getColor(n.tipo)};"><i class="${NotificationManager.getIcon(n.tipo)}"></i></div>
                <div class="notif-content">
                    <h4>${n.titulo}</h4>
                    <p>${n.mensaje}</p>
                    <span class="notif-time">${timeAgo(n.fecha)}</span>
                </div>
            </div>
        `).join('');
    }

    static async handleNotifClick(notifId, refType, refId) {
        await NotificationManager.markAsRead(notifId);
        this.toggleNotifications();

        if (refType === 'document' && refId && refId !== 'null') {
            this.navigate('ver-documento', { id: refId });
        } else if (refType === 'request' && refId && refId !== 'null') {
            this.navigate(AuthManager.isEncargado() ? 'gestionar-solicitudes' : 'solicitudes');
        }
    }

    static async markAllNotifRead() {
        const user = AuthManager.getUser();
        if (user) {
            await NotificationManager.markAllAsRead(user.id);
            this.renderNotifications();
            Toast.success('Listo', 'Notificaciones marcadas como leídas');
        }
    }

    // ========================================================
    // MODAL
    // ========================================================
    static showModal(title, content, wide = false) {
        const modal = document.getElementById('modalOverlay');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        modal.querySelector('.modal').style.maxWidth = wide ? '900px' : '600px';
        modal.classList.add('open');
    }

    static closeModal() {
        if (this._forcePasswordModal) return;
        document.getElementById('modalOverlay').classList.remove('open');
    }
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
class Toast {
    static container = null;
    static init() { this.container = document.getElementById('toastContainer'); }

    static show(type, title, message) {
        if (!this.container) this.init();
        const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <div class="toast-text"><h4>${title}</h4>${message ? `<p>${message}</p>` : ''}</div>
            <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        `;
        this.container.appendChild(toast);
        setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 300); }, 4000);
    }

    static success(title, message) { this.show('success', title, message); }
    static error(title, message) { this.show('error', title, message); }
    static warning(title, message) { this.show('warning', title, message); }
    static info(title, message) { this.show('info', title, message); }
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
