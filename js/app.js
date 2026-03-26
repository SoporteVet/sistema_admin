// ============================================================
// APP.JS - Controlador Principal (Firebase Edition)
// Veterinaria San Martín de Porres
// ============================================================

class App {
    static currentView = 'dashboard';
    static isLoading = false;

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
        if (estado === 'pendiente') return 'Pendiente';
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
        this.navigate('dashboard');
    }

    static async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        const loginBtn = document.querySelector('.login-btn');

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Ingresando...';

        const result = await AuthManager.login(email, password);

        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:8px;"></i> Iniciar Sesión';

        if (result.success) {
            errorEl.classList.remove('show');
            this.showApp();
            Toast.success('Bienvenido', `Hola, ${result.user.nombre}!`);
        } else {
            errorEl.textContent = result.message;
            errorEl.classList.add('show');
        }
    }

    static async handleLogout() {
        NotificationManager.stopListening();
        await AuthManager.logout();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        this.showLogin();
    }

    static demoLogin(email, password) {
        document.getElementById('loginEmail').value = email;
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
                case 'ver-documento': await this.renderVerDocumento(params.id); break;
                case 'solicitudes': await this.renderSolicitudes(); break;
                case 'nueva-solicitud': this.renderNuevaSolicitud(); break;
                case 'gestionar-solicitudes': await this.renderGestionarSolicitudes(); break;
                case 'estado-firmas': await this.renderEstadoFirmas(params.id); break;
                case 'usuarios': await this.renderUsuarios(); break;
                case 'departamentos': await this.renderDepartamentos(); break;
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
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
    }

    static updatePageTitle(view) {
        const titles = {
            'dashboard': { title: 'Dashboard', desc: 'Panel de control general' },
            'crear-documento': { title: 'Crear Documento', desc: 'Nuevo comunicado oficial' },
            'documentos': { title: 'Documentos', desc: 'Gestión de documentos por departamento' },
            'ver-documento': { title: 'Ver Documento', desc: 'Detalle del documento' },
            'solicitudes': { title: 'Mis Solicitudes', desc: 'Vacaciones y permisos' },
            'nueva-solicitud': { title: 'Nueva Solicitud', desc: 'Solicitar vacaciones o permisos' },
            'gestionar-solicitudes': { title: 'Gestionar Solicitudes', desc: 'Aprobar o rechazar solicitudes' },
            'estado-firmas': { title: 'Estado de Firmas', desc: 'Ver quién ha firmado y quién no' },
            'usuarios': { title: 'Usuarios', desc: 'Administración de usuarios' },
            'departamentos': { title: 'Departamentos', desc: 'Gestión de departamentos' }
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
            const roles = item.dataset.role.split(',');
            const show = roles.includes(user.rol) || roles.includes('all') || user.rol === 'admin';
            item.style.display = show ? 'flex' : 'none';
        });
    }

    static toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('open');
    }

    // ========================================================
    // DASHBOARD
    // ========================================================
    static async renderDashboard() {
        const user = AuthManager.getUser();
        const [docStats, reqStats, myDocs, pendingReqs] = await Promise.all([
            DocumentManager.getStats(),
            RequestManager.getStats(),
            DocumentManager.getByDepartment(user.departamento),
            AuthManager.isEncargado()
                ? RequestManager.getPendingActionsForUser(user)
                : RequestManager.getByUser(user.id).then(reqs => reqs.filter(r => RequestManager.isEstadoPendienteEmpleado(r.estado)))
        ]);

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
                        <p>Docs. Mi Departamento</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--gradient-accent);"><i class="fas fa-clock"></i></div>
                    <div class="stat-info">
                        <h3>${pendingReqs.length}</h3>
                        <p>${AuthManager.isEncargado() ? 'Solicitudes Pendientes' : 'Mis Solicitudes Pendientes'}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: var(--gradient-success);"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-info">
                        <h3>${reqStats.aprobadas}</h3>
                        <p>Solicitudes Aprobadas</p>
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
                                    const dep = DEPARTAMENTOS[doc.departamento];
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
                                <p>Crea tu primer documento</p>
                                <button class="btn btn-primary" onclick="App.navigate('crear-documento')">Crear documento</button>
                            </div>
                        `}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-bell" style="margin-right:8px;color:var(--warning);"></i>Solicitudes Pendientes</h3>
                        <button class="btn btn-sm btn-outline" onclick="App.navigate('${AuthManager.isEncargado() ? 'gestionar-solicitudes' : 'solicitudes'}')">Ver todas</button>
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
            </div>
        `;
    }

    // ========================================================
    // CREAR DOCUMENTO
    // ========================================================
    static async renderCrearDocumento() {
        const user = AuthManager.getUser();
        const content = document.getElementById('contentArea');

        let depsHtml = '';
        if (AuthManager.isAdmin()) {
            Object.keys(DEPARTAMENTOS).forEach(key => {
                const dep = DEPARTAMENTOS[key];
                depsHtml += `<option value="${key}">${dep.nombre} (${dep.codigo})</option>`;
            });
        } else {
            const dep = DEPARTAMENTOS[user.departamento];
            if (dep) {
                depsHtml = `<option value="${user.departamento}">${dep.nombre} (${dep.codigo})</option>`;
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
                                <input type="text" class="form-control" id="docPara" placeholder="Ej: Personal de Administración..." required>
                                <small style="color:var(--text-light);margin-top:4px;display:block;">Este texto aparecerá en el PDF del documento</small>
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

        if (depId && DEPARTAMENTOS[depId]) {
            const dep = DEPARTAMENTOS[depId];
            Object.keys(dep.categorias).forEach(key => {
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

        if (depId && catId && DEPARTAMENTOS[depId]) {
            const cat = DEPARTAMENTOS[depId].categorias[catId];
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
        if (!container) return;
        
        container.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando firmantes...';

        const users = await AuthManager.getAllUsers();
        const currentUser = AuthManager.getUser();
        const available = users.filter(u => u.activo && u.id !== currentUser.id);

        if (available.length === 0) {
            container.innerHTML = '<p class="form-help">No hay usuarios disponibles para firmar</p>';
            return;
        }

        // Agrupar por departamento para mejor organización
        const usersByDep = {};
        available.forEach(u => {
            const dep = DEPARTAMENTOS[u.departamento];
            const depName = dep ? dep.nombre : 'Sin departamento';
            if (!usersByDep[depName]) usersByDep[depName] = [];
            usersByDep[depName].push(u);
        });

        let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
        Object.keys(usersByDep).sort().forEach(depName => {
            html += `<div style="margin-bottom:8px;"><strong style="font-size:0.85rem;color:var(--text-secondary);display:block;margin-bottom:6px;">${depName}</strong><div style="display:flex;flex-wrap:wrap;gap:8px;">`;
            usersByDep[depName].forEach(u => {
                const dep = DEPARTAMENTOS[u.departamento];
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

        const dep = DEPARTAMENTOS[depId];
        const cat = dep.categorias[catId];
        const tipoNombre = cat.subcategorias[subId];

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
        const dep = DEPARTAMENTOS[depId];
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
        
        const content = document.getElementById('contentArea');

        let depFilterHtml = '<option value="">Todos los departamentos</option>';
        Object.keys(DEPARTAMENTOS).forEach(key => {
            depFilterHtml += `<option value="${key}">${DEPARTAMENTOS[key].nombre}</option>`;
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

    static _cachedDocs = [];

    static renderDocList(docs) {
        if (docs.length === 0) {
            return `<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No hay documentos</h3><p>No se encontraron documentos con los filtros seleccionados</p></div>`;
        }

        return `<div class="doc-list">
            ${docs.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).map(doc => {
                const dep = DEPARTAMENTOS[doc.departamento];
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

        const dep = DEPARTAMENTOS[doc.departamento];
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
                                    <div class="sig-role">${ROLES[f.rol]?.nombre || f.rol} — ${DEPARTAMENTOS[f.departamento]?.nombre || ''}</div>
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
                                        const dep = DEPARTAMENTOS[user.departamento];
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
                    <button class="btn btn-primary btn-sm" onclick="App.navigate('nueva-solicitud')"><i class="fas fa-plus"></i> Nueva</button>
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
                <button class="btn btn-primary btn-sm" onclick="App.navigate('nueva-solicitud')"><i class="fas fa-plus"></i> Nueva</button></div>`;
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
                    <div class="form-group"><label>Departamento / área</label><input type="text" class="form-control" id="heArea" placeholder="Si difiere del departamento del sistema"></div>
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
        ['heCedula', 'hePuesto', 'heArea', 'heJefatura', 'heObservaciones'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.addEventListener('input', upd); el.addEventListener('change', upd); }
        });
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
            const depNombre = DEPARTAMENTOS[user.departamento]?.nombre || '';
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
        let requests;
        if (AuthManager.isAdmin()) {
            requests = await RequestManager.getAll();
        } else {
            const byDep = await RequestManager.getByDepartment(user.departamento);
            const all = await RequestManager.getAll();
            const extra = [];
            if (user.departamento === SOLICITUD_HORAS_EXTRA_CONFIG.deptoTI) {
                extra.push(...all.filter(r => r.tipo === 'horas_extraordinarias' && r.estado === 'pendiente_ti'));
            }
            if (user.departamento === SOLICITUD_HORAS_EXTRA_CONFIG.deptoGerencia) {
                extra.push(...all.filter(r => r.tipo === 'horas_extraordinarias' && r.estado === 'pendiente_gerencia'));
            }
            const map = new Map();
            [...byDep, ...extra].forEach(r => map.set(r.id, r));
            requests = Array.from(map.values());
        }
        requests = requests.sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));
        this._cachedMgrRequests = requests;

        const nPend = requests.filter(r => RequestManager.necesitaMiAprobacion(r, user)).length;

        const content = document.getElementById('contentArea');
        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-tasks" style="margin-right:8px;color:var(--primary);"></i>Gestionar Solicitudes</h3>
                </div>
                <div class="card-body">
                    <div class="tabs" id="mgrTabs">
                        <button class="tab active" data-tab="pendiente" onclick="App.filterMgrRequests('pendiente')">Pendientes (${nPend})</button>
                        <button class="tab" data-tab="todas" onclick="App.filterMgrRequests('todas')">Todas (${requests.length})</button>
                        <button class="tab" data-tab="aprobada" onclick="App.filterMgrRequests('aprobada')">Aprobadas (${requests.filter(r=>r.estado==='aprobada').length})</button>
                        <button class="tab" data-tab="rechazada" onclick="App.filterMgrRequests('rechazada')">Rechazadas (${requests.filter(r=>r.estado==='rechazada').length})</button>
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
                const depNombre = DEPARTAMENTOS[req.departamento]?.nombre || 'su departamento';

                const fechaInicioTxt = datos.fecha_inicio ? formatDate(datos.fecha_inicio) : '_____';
                const fechaFinTxt = datos.fecha_fin ? formatDate(datos.fecha_fin) : '_____';
                const diasTxt = (datos.fecha_inicio && datos.fecha_fin)
                    ? `${RequestManager.calcDays(datos.fecha_inicio, datos.fecha_fin)} día(s)`
                    : '_____';
                const motivoTxt = datos.motivo || '______________________________';
                const fechaSolicitudTxt = formatDate(req.fechaSolicitud);

                const texto = `SOLICITUD DE PERMISO SIN GOCE SALARIAL

Yo, ${nombreCompleto}, quien laboro para ${empresa}, adscrito(a) al departamento de ${depNombre}, por este medio solicito formalmente un permiso sin goce de salario.

El permiso se solicita para el período comprendido desde el día ${fechaInicioTxt} hasta el día ${fechaFinTxt}, para un total de ${diasTxt} calendario, de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica y las disposiciones emitidas por el Ministerio de Trabajo y Seguridad Social, así como las políticas internas de ${empresa}.

Motivo del permiso:
${motivoTxt}

Manifiesto que entiendo y acepto que durante este período no devengaré salario ni beneficios salariales asociados, y que el puesto de trabajo, así como las obligaciones y responsabilidades, se mantienen vigentes al término del presente permiso, de acuerdo con la normativa laboral costarricense y la normativa interna de ${empresa}.

Declaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.

En Costa Rica, a los ${fechaSolicitudTxt}.`;

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
                    <strong>Área:</strong> ${datos.area_departamento || DEPARTAMENTOS[req.departamento]?.nombre || '—'} &nbsp;|&nbsp; <strong>Jefatura:</strong> ${datos.jefatura_inmediata || '—'}
                    </div>
                    <div style="overflow-x:auto;margin-top:8px;"><table style="width:100%;border-collapse:collapse;font-size:0.78rem;">
                    <thead><tr style="background:var(--bg-main);"><th style="padding:6px;border:1px solid var(--border-light);">Fecha</th><th style="padding:6px;">Inicio</th><th style="padding:6px;">Fin</th><th style="padding:6px;">Cantidad</th><th style="padding:6px;">Justificación</th></tr></thead>
                    <tbody>${filasRows || '<tr><td colspan="5" style="padding:8px;">Sin filas</td></tr>'}</tbody></table></div>`;
            }

            const revTi = req.revisionTI;
            const revTiHtml = revTi?.nombre ? `<p style="font-size:0.78rem;color:var(--text-secondary);margin-top:8px;padding:8px;background:var(--bg-main);border-radius:var(--radius-sm);"><strong>Revisión TI:</strong> ${revTi.nombre} — ${formatDateTime(revTi.fecha)}${revTi.comentario ? `<br><em>${revTi.comentario}</em>` : ''}</p>` : '';

            const cardEst = this.claseCardEstadoSolicitud(req.estado);
            const pendUi = RequestManager.isEstadoPendienteEmpleado(req.estado);
            const btnAprobarLabel = req.estado === 'pendiente_ti' ? 'Firmar y certificar (TI)' : 'Firmar y aprobar';

            return `<div class="request-card status-${cardEst}">
                <div class="request-header">
                    <div>
                        <h4><i class="${TIPOS_SOLICITUD[req.tipo]?.icono || 'fas fa-file'}" style="margin-right:8px;color:${TIPOS_SOLICITUD[req.tipo]?.color || 'var(--primary)'};"></i>${req.tipoNombre}</h4>
                        <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">Solicitado por: <strong>${req.solicitanteNombre}</strong> — ${DEPARTAMENTOS[req.departamento]?.nombre || ''}</p>
                    </div>
                    <span class="status-badge ${cardEst}"><i class="fas fa-${pendUi ? 'clock' : req.estado === 'aprobada' ? 'check-circle' : 'times-circle'}"></i> ${this.etiquetaEstadoSolicitud(req.estado)}</span>
                </div>
                ${datesHtml}
                ${req.observaciones ? `<p style="font-size:0.85rem;color:var(--text-secondary);padding:10px;background:var(--bg-main);border-radius:var(--radius-sm);border-left:3px solid var(--primary);margin-bottom:10px;"><strong>Observaciones:</strong> ${req.observaciones}</p>` : ''}
                ${datos.motivo ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;"><strong>Motivo:</strong> ${datos.motivo}</p>` : ''}
                ${detalleHtml}
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
        const user = AuthManager.getUser();
        let requests = this._cachedMgrRequests;
        if (status === 'pendiente') {
            requests = requests.filter(r => RequestManager.necesitaMiAprobacion(r, user));
        } else if (status !== 'todas') {
            requests = requests.filter(r => r.estado === status);
        }
        document.getElementById('mgrReqContainer').innerHTML = this.renderManageRequestList(requests);
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

        const esCertTi = req.tipo === 'horas_extraordinarias' && req.estado === 'pendiente_ti';
        const modalTitulo = esCertTi ? `Revisión TI — ${req.tipoNombre || 'Horas extraordinarias'}` : `Firmar y aprobar: ${req.tipoNombre || 'Solicitud'}`;
        const labelComentario = esCertTi ? 'Comentario de la revisión TI (opcional)' : 'Comentario de aprobación (opcional)';
        const textoPasoFirma = esCertTi
            ? 'Dibuje su firma como responsable de TI para certificar la revisión de los registros institucionales.'
            : 'Dibuje su firma como administrador para aprobar la solicitud';
        const textoBotonFirma = esCertTi ? 'Firmar y enviar a Gerencia' : 'Firmar y Aprobar';
        this._pendingAdminSignButtonHtml = `<i class="fas fa-check"></i> ${textoBotonFirma}`;

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
        const dep = DEPARTAMENTOS[req.departamento]?.nombre || 'su departamento';
        const fSolicitud = formatDate(req.fechaSolicitud);
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
                return `SOLICITUD DE PERMISO SIN GOCE SALARIAL\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente un permiso sin goce de salario.\n\nEl permiso se solicita para el período comprendido desde el día ${fi} hasta el día ${ff}, para un total de ${dias} calendario, de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica y las disposiciones emitidas por el Ministerio de Trabajo y Seguridad Social, así como las políticas internas de ${empresa}.\n\nMotivo del permiso:\n${motivo}\n\nManifiesto que entiendo y acepto que durante este período no devengaré salario ni beneficios salariales asociados, y que el puesto de trabajo, así como las obligaciones y responsabilidades, se mantienen vigentes al término del presente permiso, de acuerdo con la normativa laboral costarricense y la normativa interna de ${empresa}.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitud}.`;

            case 'vacaciones': {
                const obs = datos.observaciones ? `\n\nObservaciones:\n${datos.observaciones}` : '';
                const ced = datos.cedula || '_____';
                const puesto = datos.puesto || '_____';
                const fechaIngreso = datos.fecha_ingreso ? formatDate(datos.fecha_ingreso) : '_____';
                return `SOLICITUD DE DISFRUTE DE VACACIONES\n\n1. DATOS DEL COLABORADOR\n\nYo, ${nombre}, número de cédula ${ced}, con el puesto de ${puesto}, del departamento / área de ${dep}, con fecha de ingreso a la empresa ${fechaIngreso}.\n\n2. PERIODO DE VACACIONES SOLICITADO\nDe conformidad con lo establecido en el artículo 153 del Código de Trabajo de Costa Rica, solicito el disfrute de mis vacaciones anuales correspondientes al período laborado, en la cantidad de ${dias} hábiles, siendo mi último día que labora el ${ultimoDiaLabora}, con fecha de inicio ${fi}, fecha de finalización ${ff} y fecha de reincorporación laboral ${fechaReincorporacion}.${obs}\n\n3. DECLARACIÓN DEL COLABORADOR\n\nDeclaro que he sido informado(a) de mis derechos y deberes en relación con el disfrute de vacaciones, conforme al Código de Trabajo de Costa Rica, y que el presente período ha sido coordinado con la empresa para no afectar la continuidad del servicio.\n\n4. AUTORIZACIÓN DEL PATRONO / REPRESENTANTE LEGAL\n\nHago constar que el período de vacaciones solicitado ha sido revisado y aprobado, cumpliendo con la normativa laboral vigente, y que durante dicho período el colaborador conservará todos sus derechos laborales.`;
            }

            case 'ingreso_posterior': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const hora = datos.hora_ingreso || '_____';
                return `SOLICITUD DE INGRESO POSTERIOR\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio notifico formalmente que el día ${fecha} realizaré mi ingreso de forma posterior al horario habitual establecido.\n\nHora de ingreso: ${hora}\n\nMotivo:\n${motivo}\n\nManifiesto que tomaré las medidas necesarias para compensar el tiempo de ausencia de conformidad con las políticas internas de ${empresa} y lo dispuesto en el Código de Trabajo. Entiendo que los ingresos posteriores deben ser debidamente justificados y que la empresa podrá solicitar los comprobantes que estime convenientes. Me comprometo a cumplir con la jornada laboral correspondiente y a no afectar el normal desarrollo de las actividades del departamento.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitud}.`;
            }

            case 'salida_anticipada': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const hora = datos.hora_salida || '_____';
                return `SOLICITUD DE SALIDA ANTICIPADA\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente autorización para retirarme antes del horario laboral establecido.\n\nFecha: ${fecha}\nHora de salida anticipada: ${hora}\n\nMotivo:\n${motivo}\n\nManifiesto que coordinaré con mi jefatura la compensación del tiempo correspondiente de conformidad con las políticas internas de ${empresa}. Entiendo que la salida anticipada queda sujeta a las necesidades del servicio y al criterio del superior inmediato. Me comprometo a dejar en orden las labores bajo mi responsabilidad y a reponer las horas no trabajadas según lo acordado con la empresa.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitud}.`;
            }

            case 'cambio_horario': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const actual = datos.horario_actual || '_____';
                const solicitado = datos.horario_solicitado || '_____';
                return `SOLICITUD DE CAMBIO DE HORARIO\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente la modificación de mi horario de trabajo.\n\nHorario actual:      ${actual}\nHorario solicitado:  ${solicitado}\nFecha de aplicación: ${fecha}\n\nMotivo del cambio:\n${motivo}\n\nManifiesto que el cambio de horario solicitado no afectará negativamente el desempeño de mis funciones ni la prestación de los servicios de ${empresa}, y me comprometo a cumplir con la totalidad de las horas laborales establecidas. Entiendo que la modificación del horario queda sujeta a la aprobación de la jefatura y a las necesidades operativas de la organización. Una vez aprobado, me comprometo a cumplir de manera puntual y responsable el nuevo horario.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitud}.`;
            }

            case 'estudio': {
                const inst = datos.institucion || '_____';
                return `SOLICITUD DE PERMISO DE ESTUDIO\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio solicito formalmente un permiso para actividades de formación académica.\n\nInstitución educativa: ${inst}\nPeríodo: desde el día ${fi} hasta el día ${ff}, para un total de ${dias}.\n\nMotivo:\n${motivo}\n\nEl presente permiso se solicita de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica respecto a permisos de capacitación y estudio, así como las políticas internas de ${empresa}. Manifiesto que la formación que recibiré contribuirá a mi desarrollo profesional y, en consecuencia, al mejor desempeño de mis labores. Me comprometo a coordinar con mi jefatura las fechas de ausencia y a no afectar el normal desarrollo de las actividades del departamento.\n\nDeclaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.\n\nEn Costa Rica, a los ${fSolicitud}.`;
            }

            case 'dias_festivos': {
                const fecha = datos.fecha ? formatDate(datos.fecha) : '_____';
                const desc = datos.descripcion || '_____';
                return `NOTIFICACIÓN DE DÍA FESTIVO\n\nYo, ${nombre}, quien laboro para ${empresa}, adscrito(a) al departamento de ${dep}, por este medio registro formalmente la siguiente ausencia por día festivo, de conformidad con el calendario oficial de días feriados de la República de Costa Rica y con lo dispuesto en el Código de Trabajo en materia de descansos obligatorios.\n\nFecha: ${fecha}\nDescripción: ${desc}\n\nLa presente notificación tiene como fin dejar constancia formal del día festivo señalado, según lo establecido en el Código de Trabajo y la normativa laboral vigente. Entiendo que en los días feriados de carácter nacional el trabajador tiene derecho al descanso remunerado, salvo las excepciones previstas en la ley. Dejo constancia de que he informado con la debida anticipación a mi jefatura para que se tomen las medidas organizativas que correspondan.\n\nDeclaro que la información aquí consignada es veraz.\n\nEn Costa Rica, a los ${fSolicitud}.`;
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
                return `FORMULARIO OFICIAL DE REPORTE Y AUTORIZACIÓN DE HORAS EXTRAORDINARIAS (RC.400.5.1)\n\n1. IDENTIFICACIÓN DEL COLABORADOR\n\nNombre completo: ${nombre}\nNúmero de identificación: ${ced}\nPuesto: ${puesto}\nDepartamento / Área: ${area}\nJefatura inmediata: ${jef}\n\n2. DETALLE DE LAS HORAS EXTRAORDINARIAS REPORTADAS\n\n${tabla || '(Sin filas registradas)'}\n\nDeclaro que la información consignada es veraz.\n\nEn Costa Rica, a los ${fSolicitud}.`;
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
        if (reqFresh?.tipo === 'horas_extraordinarias' && reqFresh.estado === 'pendiente_ti') {
            result = await RequestManager.approveRevisionTI(this._currentSignReqId, comment, firmaAdmin);
            okTitulo = 'Revisión TI';
            okMsg = 'Certificación registrada. La solicitud fue enviada a Gerencia General.';
        } else {
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
                    <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Usuario</button>
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
            console.log('Usuarios obtenidos:', users);

            if (!users || users.length === 0) {
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-users-cog" style="margin-right:8px;color:var(--primary);"></i>Gestión de Usuarios</h3>
                        <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Usuario</button>
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

            content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-users-cog" style="margin-right:8px;color:var(--primary);"></i>Gestión de Usuarios</h3>
                    <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus"></i> Nuevo Usuario</button>
                </div>
                <div class="card-body no-padding">
                    <div class="table-container">
                        <table class="data-table">
                            <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Departamento</th><th>Código Firma</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                ${users.map(u => {
                                    const dep = DEPARTAMENTOS[u.departamento];
                                    const initials = (u.nombre[0] + u.apellido[0]).toUpperCase();
                                    const hasCode = u.codigoPersonal ? true : false;
                                    return `<tr>
                                        <td><div style="display:flex;align-items:center;gap:10px;">
                                            <div class="user-avatar-sm" style="background:${dep?.color || 'var(--primary)'};">${initials}</div>
                                            <div><strong>${u.nombre} ${u.apellido}</strong><br><small style="color:var(--text-light);">${u.id.substring(0,12)}...</small></div>
                                        </div></td>
                                        <td>${u.email}</td>
                                        <td><span class="role-badge ${u.rol}">${ROLES[u.rol]?.nombre || u.rol}</span></td>
                                        <td><span class="dep-chip" style="background:${dep?.color || '#546e7a'};"><i class="${dep?.icono || 'fas fa-building'}"></i> ${dep?.nombre || 'N/A'}</span></td>
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
                                            <button class="btn btn-sm btn-outline" onclick="App.showManageCodeModal('${u.id}')" title="Gestionar código de firma" style="border-color:var(--primary);color:var(--primary);">
                                                <i class="fas fa-key"></i>
                                            </button>
                                            ${u.id !== AuthManager.getUser().id ? `<button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="App.handleDeleteUser('${u.id}')" title="Desactivar"><i class="fas fa-ban"></i></button>` : ''}
                                        </div></td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        } catch (error) {
            console.error('Error renderizando usuarios:', error);
            content.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-users-cog" style="margin-right:8px;color:var(--primary);"></i>Gestión de Usuarios</h3>
                        <button class="btn btn-primary btn-sm" onclick="App.showCreateUserModal()"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Nuevo Usuario</button>
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

    static showCreateUserModal() {
        let depsOpts = '';
        Object.keys(DEPARTAMENTOS).forEach(key => { depsOpts += `<option value="${key}">${DEPARTAMENTOS[key].nombre}</option>`; });

        this.showModal('Crear Nuevo Usuario', `
            <form onsubmit="App.handleCreateUser(event)">
                <div class="form-row">
                    <div class="form-group"><label>Nombre <span class="required">*</span></label><input type="text" class="form-control" id="newUserNombre" required></div>
                    <div class="form-group"><label>Apellido <span class="required">*</span></label><input type="text" class="form-control" id="newUserApellido" required></div>
                </div>
                <div class="form-group"><label>Email <span class="required">*</span></label><input type="email" class="form-control" id="newUserEmail" required></div>
                <div class="form-group"><label>Contraseña <span class="required">*</span> (mín. 6 caracteres)</label><input type="password" class="form-control" id="newUserPassword" required minlength="6"></div>
                <div class="form-row">
                    <div class="form-group"><label>Rol <span class="required">*</span></label><select class="form-control" id="newUserRol" required><option value="">Seleccionar...</option>
                        ${Object.keys(ROLES).map(r => `<option value="${r}">${ROLES[r].nombre}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Departamento <span class="required">*</span></label><select class="form-control" id="newUserDep" required><option value="">Seleccionar...</option>${depsOpts}</select></div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnCreateUser"><i class="fas fa-user-plus" style="vertical-align:middle;margin-right:6px;"></i> Crear</button>
                </div>
            </form>
        `);
    }

    static async handleCreateUser(e) {
        e.preventDefault();
        const btn = document.getElementById('btnCreateUser');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

        const userData = {
            nombre: document.getElementById('newUserNombre').value,
            apellido: document.getElementById('newUserApellido').value,
            email: document.getElementById('newUserEmail').value,
            password: document.getElementById('newUserPassword').value,
            rol: document.getElementById('newUserRol').value,
            departamento: document.getElementById('newUserDep').value
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

    static async showEditUserModal(userId) {
        const user = await AuthManager.getUserById(userId);
        if (!user) return;

        let depsOpts = '';
        Object.keys(DEPARTAMENTOS).forEach(key => { depsOpts += `<option value="${key}" ${user.departamento === key ? 'selected' : ''}>${DEPARTAMENTOS[key].nombre}</option>`; });

        this.showModal('Editar Usuario', `
            <form onsubmit="App.handleEditUser(event, '${userId}')">
                <div class="form-row">
                    <div class="form-group"><label>Nombre</label><input type="text" class="form-control" id="editUserNombre" value="${user.nombre}" required></div>
                    <div class="form-group"><label>Apellido</label><input type="text" class="form-control" id="editUserApellido" value="${user.apellido}" required></div>
                </div>
                <div class="form-group"><label>Email</label><input type="email" class="form-control" id="editUserEmail" value="${user.email}" required></div>
                <div class="form-row">
                    <div class="form-group"><label>Rol</label><select class="form-control" id="editUserRol" required>
                        ${Object.keys(ROLES).map(r => `<option value="${r}" ${user.rol === r ? 'selected' : ''}>${ROLES[r].nombre}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Departamento</label><select class="form-control" id="editUserDep" required>${depsOpts}</select></div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnEditUser"><i class="fas fa-save"></i> Guardar</button>
                </div>
            </form>
        `);
    }

    static async handleEditUser(e, userId) {
        e.preventDefault();
        const btn = document.getElementById('btnEditUser');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const updates = {
            nombre: document.getElementById('editUserNombre').value,
            apellido: document.getElementById('editUserApellido').value,
            email: document.getElementById('editUserEmail').value,
            rol: document.getElementById('editUserRol').value,
            departamento: document.getElementById('editUserDep').value
        };

        await AuthManager.updateUser(userId, updates);
        this.closeModal();
        Toast.success('Actualizado', 'Los cambios han sido guardados');
        this.updateSidebar();
        this.navigate('usuarios');
    }

    static handleDeleteUser(userId) {
        this.showModal('Desactivar Usuario', `
            <p style="margin-bottom:20px;">¿Está seguro de que desea <strong style="color:var(--danger);">desactivar</strong> este usuario?</p>
            <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button class="btn btn-outline" onclick="App.closeModal()">Cancelar</button>
                <button class="btn btn-danger" onclick="App.confirmDeleteUser('${userId}')"><i class="fas fa-ban"></i> Desactivar</button>
            </div>
        `);
    }

    static async confirmDeleteUser(userId) {
        await AuthManager.deleteUser(userId);
        this.closeModal();
        Toast.success('Desactivado', 'El usuario ha sido desactivado');
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
                                    return `<tr>
                                        <td><strong>${dep.codigo || dep.id}</strong></td>
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
                                                <button class="btn btn-sm btn-outline" onclick="App.showEditDepartamentoModal('${dep.codigo || dep.id}')" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline" onclick="App.showViewDepartamentoModal('${dep.codigo || dep.id}')" title="Ver detalles">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline" style="border-color:var(--danger);color:var(--danger);" onclick="App.handleDeleteDepartamento('${dep.codigo || dep.id}')" title="Eliminar">
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
                    <input type="text" class="form-control" id="newDepCodigo" placeholder="Ej: DG-100" required pattern="[A-Z0-9-]+" style="text-transform:uppercase;">
                    <p class="form-help">Código único del departamento (solo letras mayúsculas, números y guiones)</p>
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

        const categoriasJson = JSON.stringify(dep.categorias || {}, null, 2);

        this.showModal('Editar Departamento', `
            <form onsubmit="App.handleEditDepartamento(event, '${depId}')">
                <div class="form-group">
                    <label>Código</label>
                    <input type="text" class="form-control" id="editDepCodigo" value="${dep.codigo || depId}" disabled style="background:var(--bg-secondary);">
                    <p class="form-help">El código no se puede modificar</p>
                </div>
                <div class="form-group">
                    <label>Nombre <span class="required">*</span></label>
                    <input type="text" class="form-control" id="editDepNombre" value="${dep.nombre}" required>
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
                    <textarea class="form-control" id="editDepCategorias" rows="8" style="font-family:monospace;font-size:0.85rem;">${categoriasJson}</textarea>
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
            Toast.success('Sincronizado', `Se sincronizaron ${result.synced} departamento(s)`);
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
