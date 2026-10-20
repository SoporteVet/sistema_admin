// ============================================================
// DOCUMENTACION-TI-UI.JS — Vistas del módulo Documentación TI
// ============================================================

class DocumentacionTiUI {
    static state = {
        tab: 'resumen',
        filtrosAct: {},
        filtrosArt: {},
        pageAct: 1,
        pageArt: 1,
        dirty: false,
        editor: null,
        previewMode: false
    };

    static _onLeave = null;

    static esc(v) { return App.escapeHtml(v); }
    static js(v) { return App.escapeJsString(v); }

    static async render(params = {}) {
        const content = document.getElementById('contentArea');
        const user = AuthManager.getUser();
        if (!DocumentacionTiPermiso.puedeLeer(user)) {
            content.innerHTML = `<div class="empty-state"><i class="fas fa-lock"></i><h3>Acceso denegado</h3><p>Documentación TI está disponible para Tecnologías de Información y administración.</p></div>`;
            return;
        }
        try {
            const on = await DocumentacionTiManager.moduloHabilitado();
            if (!on) {
                content.innerHTML = `<div class="empty-state"><i class="fas fa-eye-slash"></i><h3>Módulo oculto</h3><p>La interfaz está deshabilitada. Los registros en la base no se borran.</p></div>`;
                return;
            }
        } catch (e) {
            const permiso = /permission_denied|PERMISSION_DENIED/i.test(`${e.code || ''} ${e.message || ''}`);
            content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>${permiso ? 'Sin permiso de lectura' : 'No se pudo comprobar el módulo'}</h3><p>${this.esc(e.message || '')}</p></div>`;
            return;
        }

        if (params.tab) this.state.tab = params.tab;
        if (params.equipoId) this.state.filtrosAct.equipoId = params.equipoId;
        if (params.sistemaId) this.state.filtrosAct.sistemaId = params.sistemaId;
        if (params.view === 'actividad' && params.id) return this.renderActividad(params.id);
        if (params.view === 'articulo' && params.id) return this.renderArticulo(params.id);
        if (params.view === 'sistema' && params.id) return this.renderSistema(params.id);
        if (params.view === 'nueva-actividad') return this.renderFormActividad(params.id || null);
        if (params.view === 'nuevo-articulo') return this.renderFormArticulo(params.id || null, params);
        if (params.view === 'nuevo-sistema') return this.renderFormSistema(params.id || null);

        this._bindLeave(false);
        const tabs = [
            ['resumen', 'Resumen', 'fa-chart-line'],
            ['bitacora', 'Bitácora', 'fa-clipboard-list'],
            ['biblioteca', 'Biblioteca técnica', 'fa-book'],
            ['sistemas', 'Sistemas', 'fa-server']
        ];
        content.innerHTML = `
            <div class="doc-ti-shell">
                <div class="tabs" role="tablist">
                    ${tabs.map(([id, label, icon]) => `
                        <button type="button" class="tab ${this.state.tab === id ? 'active' : ''}" data-tab="${id}">
                            <i class="fas ${icon}"></i> ${label}
                        </button>`).join('')}
                </div>
                <div id="docTiTabBody"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando...</p></div></div>
            </div>`;
        content.querySelectorAll('.tab').forEach((btn) => {
            btn.onclick = () => {
                this.state.tab = btn.dataset.tab;
                this.render({ tab: this.state.tab });
            };
        });
        await this._paintTab();
    }

    static async _paintTab() {
        const body = document.getElementById('docTiTabBody');
        if (!body) return;
        try {
            if (this.state.tab === 'resumen') await this._tabResumen(body);
            else if (this.state.tab === 'bitacora') await this._tabBitacora(body);
            else if (this.state.tab === 'biblioteca') await this._tabBiblioteca(body);
            else await this._tabSistemas(body);
        } catch (e) {
            body.innerHTML = this._errorBox(e);
        }
    }

    static _errorBox(e) {
        const permiso = e.code === 'PERMISSION' || /permission_denied|PERMISSION_DENIED/i.test(`${e.code || ''} ${e.message || ''}`);
        return `<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:var(--danger);"></i>
            <h3>${permiso ? 'Permiso denegado' : 'Error de carga'}</h3>
            <p>${this.esc(e.message || 'No se pudo completar la operación.')}</p>
            <button type="button" class="btn btn-primary" onclick="App.navigate('documentacion-ti')">Reintentar</button></div>`;
    }

    static _empty(title, text, action) {
        return `<div class="empty-state"><i class="fas fa-inbox"></i><h3>${title}</h3><p>${text}</p>${action || ''}</div>`;
    }

    static async _tabResumen(body) {
        const data = await DocumentacionTiManager.resumen({
            desde: document.getElementById('docTiDesde')?.value,
            hasta: document.getElementById('docTiHasta')?.value
        });
        const card = (n, label, extra) => `
            <div class="card doc-ti-kpi"><div class="card-body">
                <div class="doc-ti-kpi-n">${n}</div>
                <div class="doc-ti-kpi-l">${label}</div>
                ${extra ? `<p class="doc-ti-hint">${extra}</p>` : ''}
            </div></div>`;
        body.innerHTML = `
            <div class="doc-ti-toolbar">
                <div class="filters-bar">
                    <div class="form-group"><label for="docTiDesde">Desde</label>
                        <input type="date" class="form-control" id="docTiDesde" value="${this.esc(data.periodo.desde)}"></div>
                    <div class="form-group"><label for="docTiHasta">Hasta</label>
                        <input type="date" class="form-control" id="docTiHasta" value="${this.esc(data.periodo.hasta)}"></div>
                    <button type="button" class="btn btn-outline" id="docTiFiltrarResumen">Aplicar fechas</button>
                </div>
                <div class="doc-ti-actions">
                    <button type="button" class="btn btn-primary" onclick="App.navigate('documentacion-ti',{view:'nueva-actividad'})"><i class="fas fa-plus"></i> Nueva actividad</button>
                    <button type="button" class="btn btn-outline" onclick="App.navigate('documentacion-ti',{view:'nuevo-articulo'})"><i class="fas fa-file-alt"></i> Nuevo documento</button>
                    <button type="button" class="btn btn-outline" onclick="App.navigate('documentacion-ti',{view:'nuevo-sistema'})"><i class="fas fa-server"></i> Nuevo sistema</button>
                </div>
            </div>
            <p class="doc-ti-hint">${this.esc(data.alcance)}</p>
            <div class="doc-ti-kpis">
                ${card(data.pendientes.length, 'Pendientes o en progreso')}
                ${card(data.completadasPeriodo.length, 'Completadas en el período')}
                ${card(data.enRevision.length, 'Documentos en revisión')}
                ${card(data.vencidas.length, 'Revisión vencida')}
            </div>
            <div class="card"><div class="card-header"><h3>Cambios recientes</h3></div>
                <div class="card-body">${data.recientes.length ? data.recientes.map((r) => `
                    <div class="doc-ti-row" onclick="App.navigate('documentacion-ti',{view:'${r.kind === 'actividad' ? 'actividad' : 'articulo'}',id:'${this.js(r.id)}'})">
                        <strong>${this.esc(r.titulo)}</strong>
                        <span>${this.esc(r.kind === 'actividad' ? 'Actividad' : 'Documento')} · ${DocumentacionTiManager.formatFecha(r.actualizadoMs || r.fechaCreacionMs)}</span>
                    </div>`).join('') : this._empty('Sin cambios', 'Aún no hay actividad reciente en los metadatos cargados.')}
                </div>
            </div>
            ${this._demoBtn()}`;
        body.querySelector('#docTiFiltrarResumen').onclick = () => this._tabResumen(body);
    }

    static _demoBtn() {
        const host = String(location.hostname || '');
        if (host !== 'localhost' && host !== '127.0.0.1') return '';
        return `<p class="doc-ti-hint">Entorno local: <button type="button" class="btn btn-sm btn-outline" onclick="DocumentacionTiUI.cargarDemo()">Cargar datos de demostración</button> (no se ejecuta solo).</p>`;
    }

    static async cargarDemo() {
        if (!confirm('¿Crear registros ficticios de demostración en esta base?')) return;
        try {
            await DocumentacionTiManager.seedDemo();
            Toast.success('Documentación TI', 'Datos de demostración creados');
            this.render({ tab: 'resumen' });
        } catch (e) {
            Toast.error('Documentación TI', e.message);
        }
    }

    static async _selectores() {
        const [sistemas, users] = await Promise.all([
            DocumentacionTiManager.listSistemas().catch(() => []),
            AuthManager.getUsersByDepartment(DocumentacionTiPermiso.codigoTI()).catch(() => [])
        ]);
        let equipos = [];
        try {
            if (typeof InventarioManager !== 'undefined') {
                equipos = (await InventarioManager.getAll()).map((e) => ({ id: e.id, nombre: e.nombre || e.codigo }));
            }
        } catch (_) { /* selector de equipos opcional */ }
        const deptos = (typeof DEPARTAMENTOS !== 'undefined') ? Object.keys(DEPARTAMENTOS) : [];
        return { sistemas, users, equipos, deptos };
    }

    static _opts(list, value, getId, getLabel, empty) {
        const items = [`<option value="">${empty || '—'}</option>`];
        list.forEach((it) => {
            const id = getId(it);
            items.push(`<option value="${this.esc(id)}" ${id === value ? 'selected' : ''}>${this.esc(getLabel(it))}</option>`);
        });
        return items.join('');
    }

    static async _tabBitacora(body) {
        const f = this.state.filtrosAct;
        const { sistemas, users, equipos } = await this._selectores();
        const list = await DocumentacionTiManager.listActividades({ page: this.state.pageAct, filtros: f });
        body.innerHTML = `
            <div class="doc-ti-toolbar">
                <div class="filters-bar doc-ti-filters">
                    <input type="search" class="form-control" id="fActQ" placeholder="Buscar título" value="${this.esc(f.q || '')}">
                    <input type="date" class="form-control" id="fActDesde" value="${this.esc(f.desde || '')}" aria-label="Desde">
                    <input type="date" class="form-control" id="fActHasta" value="${this.esc(f.hasta || '')}" aria-label="Hasta">
                    <select class="form-control" id="fActTipo">${this._opts(Object.entries(DOC_TI_TIPOS_ACTIVIDAD).map(([k, v]) => ({ k, v })), f.tipo, (x) => x.k, (x) => x.v, 'Tipo')}</select>
                    <select class="form-control" id="fActEstado">${this._opts(Object.entries(DOC_TI_ESTADOS_ACTIVIDAD).map(([k, v]) => ({ k, v })), f.estado, (x) => x.k, (x) => x.v, 'Estado')}</select>
                    <select class="form-control" id="fActResp">${this._opts(users, f.responsableId, (u) => u.id, (u) => `${u.nombre} ${u.apellido}`, 'Responsable')}</select>
                    <select class="form-control" id="fActSis">${this._opts(sistemas, f.sistemaId, (s) => s.id, (s) => s.nombre, 'Sistema')}</select>
                    <select class="form-control" id="fActEq">${this._opts(equipos, f.equipoId, (s) => s.id, (s) => s.nombre, 'Equipo')}</select>
                    <button type="button" class="btn btn-outline" id="fActGo">Filtrar</button>
                    <button type="button" class="btn btn-outline" id="fActCsv">CSV</button>
                </div>
                <button type="button" class="btn btn-primary" onclick="App.navigate('documentacion-ti',{view:'nueva-actividad'})"><i class="fas fa-plus"></i> Nueva actividad</button>
            </div>
            <p class="doc-ti-hint">${this.esc(list.alcance)} Búsqueda sobre título y metadatos cargados (hasta ${DOCUMENTACION_TI_SEARCH_CAP}), no sobre el cuerpo completo.</p>
            ${list.items.length ? `<div class="table-container"><table class="data-table"><thead><tr>
                <th>Fecha</th><th>Título</th><th>Tipo</th><th>Responsable</th><th>Sistema</th><th>Estado</th>
            </tr></thead><tbody>${list.items.map((a) => `<tr class="doc-ti-click" onclick="App.navigate('documentacion-ti',{view:'actividad',id:'${this.js(a.id)}'})">
                <td>${this.esc(DocumentacionTiManager.formatFecha(a.fechaEjecucion))}</td>
                <td><strong>${this.esc(a.titulo)}</strong></td>
                <td>${this.esc(DOC_TI_TIPOS_ACTIVIDAD[a.tipo] || a.tipo)}</td>
                <td>${this.esc(a.responsableNombre || '—')}</td>
                <td>${this.esc(a.sistemaNombre || '—')}</td>
                <td><span class="status-badge ${a.estado === 'completada' ? 'aprobada' : a.estado === 'cancelada' ? 'rechazada' : 'pendiente'}">${this.esc(DOC_TI_ESTADOS_ACTIVIDAD[a.estado] || a.estado)}</span></td>
            </tr>`).join('')}</tbody></table></div>
            ${this._pager('act', list)}` : this._empty('Sin actividades', 'No hay registros con esos filtros en los metadatos cargados.', '<button type="button" class="btn btn-primary" onclick="App.navigate(\'documentacion-ti\',{view:\'nueva-actividad\'})">Nueva actividad</button>')}`;
        body.querySelector('#fActGo').onclick = () => {
            this.state.filtrosAct = {
                q: body.querySelector('#fActQ').value,
                desde: body.querySelector('#fActDesde').value,
                hasta: body.querySelector('#fActHasta').value,
                tipo: body.querySelector('#fActTipo').value,
                estado: body.querySelector('#fActEstado').value,
                responsableId: body.querySelector('#fActResp').value,
                sistemaId: body.querySelector('#fActSis').value,
                equipoId: body.querySelector('#fActEq').value
            };
            this.state.pageAct = 1;
            this._tabBitacora(body);
        };
        body.querySelector('#fActCsv').onclick = () => {
            const csv = DocumentacionTiManager.exportCsvActividades(list.items);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'bitacora-ti.csv';
            a.click();
            Toast.success('CSV', `Exportación de ${list.items.length} filas de esta página filtrada. ${list.alcance}`);
        };
    }

    static _pager(kind, list) {
        const pages = Math.max(1, Math.ceil(list.totalFiltrado / list.pageSize));
        return `<div class="doc-ti-pager">
            <button type="button" class="btn btn-sm btn-outline" ${list.page <= 1 ? 'disabled' : ''} onclick="DocumentacionTiUI._page('${kind}',${list.page - 1})">Anterior</button>
            <span>Página ${list.page} de ${pages} · ${list.totalFiltrado} coincidencias en metadatos cargados</span>
            <button type="button" class="btn btn-sm btn-outline" ${list.page >= pages ? 'disabled' : ''} onclick="DocumentacionTiUI._page('${kind}',${list.page + 1})">Siguiente</button>
        </div>`;
    }

    static _page(kind, n) {
        if (kind === 'act') this.state.pageAct = n;
        else this.state.pageArt = n;
        this.render({ tab: kind === 'act' ? 'bitacora' : 'biblioteca' });
    }

    static async _tabBiblioteca(body) {
        const f = this.state.filtrosArt;
        const { sistemas, users } = await this._selectores();
        const list = await DocumentacionTiManager.listArticulos({ page: this.state.pageArt, filtros: f });
        body.innerHTML = `
            <div class="doc-ti-toolbar">
                <div class="filters-bar doc-ti-filters">
                    <input type="search" class="form-control" id="fArtQ" placeholder="Título, resumen, etiquetas" value="${this.esc(f.q || '')}">
                    <select class="form-control" id="fArtTipo">${this._opts(Object.entries(DOC_TI_TIPOS_ARTICULO).map(([k, v]) => ({ k, v })), f.tipo, (x) => x.k, (x) => x.v, 'Tipo')}</select>
                    <select class="form-control" id="fArtCat">${this._opts(Object.entries(DOC_TI_CATEGORIAS).map(([k, v]) => ({ k, v })), f.categoria, (x) => x.k, (x) => x.v, 'Categoría')}</select>
                    <select class="form-control" id="fArtEst">${this._opts(Object.entries(DOC_TI_ESTADOS_ARTICULO).map(([k, v]) => ({ k, v })), f.estado, (x) => x.k, (x) => x.v, 'Estado')}</select>
                    <select class="form-control" id="fArtSis">${this._opts(sistemas, f.sistemaId, (s) => s.id, (s) => s.nombre, 'Sistema')}</select>
                    <select class="form-control" id="fArtResp">${this._opts(users, f.responsableId, (u) => u.id, (u) => `${u.nombre} ${u.apellido}`, 'Responsable')}</select>
                    <button type="button" class="btn btn-outline" id="fArtGo">Buscar</button>
                </div>
                <button type="button" class="btn btn-primary" onclick="App.navigate('documentacion-ti',{view:'nuevo-articulo'})"><i class="fas fa-plus"></i> Nuevo documento</button>
            </div>
            <p class="doc-ti-hint">${this.esc(list.alcance)} La búsqueda ignora mayúsculas y tildes sobre título, resumen, etiquetas y código de los metadatos cargados. No es búsqueda de texto completo sobre todos los cuerpos.</p>
            ${list.items.length ? list.items.map((a) => `
                <div class="card doc-ti-doc" onclick="App.navigate('documentacion-ti',{view:'articulo',id:'${this.js(a.id)}'})">
                    <div class="card-body">
                        <div class="doc-ti-doc-head">
                            <h3>${this.esc(a.titulo)}</h3>
                            <span class="status-badge ${a.estado === 'publicado' ? 'aprobada' : a.estado === 'archivado' ? 'rechazada' : 'pendiente'}">${this.esc(DOC_TI_ESTADOS_ARTICULO[a.estado] || a.estado)}</span>
                        </div>
                        <p>${this.esc(a.resumen || 'Sin resumen')}</p>
                        <div class="doc-ti-meta">${this.esc(DOC_TI_TIPOS_ARTICULO[a.tipo] || a.tipo)} · ${this.esc(a.responsableNombre || '—')} · ${this.esc(a.sistemaNombre || 'Sin sistema')}</div>
                    </div>
                </div>`).join('') + this._pager('art', list)
                : this._empty('Sin documentos', 'No hay artículos en el alcance cargado con esos filtros.')}`;
        body.querySelector('#fArtGo').onclick = () => {
            this.state.filtrosArt = {
                q: body.querySelector('#fArtQ').value,
                tipo: body.querySelector('#fArtTipo').value,
                categoria: body.querySelector('#fArtCat').value,
                estado: body.querySelector('#fArtEst').value,
                sistemaId: body.querySelector('#fArtSis').value,
                responsableId: body.querySelector('#fArtResp').value
            };
            this.state.pageArt = 1;
            this._tabBiblioteca(body);
        };
    }

    static async _tabSistemas(body) {
        const list = await DocumentacionTiManager.listSistemas();
        const user = AuthManager.getUser();
        body.innerHTML = `
            <div class="doc-ti-toolbar">
                <p class="doc-ti-hint">Catálogo pequeño de aplicaciones y servicios. No es una CMDB. Los sistemas en uso se archivan (retirado), no se borran.</p>
                ${DocumentacionTiPermiso.esGestor(user) ? `<button type="button" class="btn btn-primary" onclick="App.navigate('documentacion-ti',{view:'nuevo-sistema'})"><i class="fas fa-plus"></i> Nuevo sistema</button>` : ''}
            </div>
            ${list.length ? `<div class="doc-ti-grid">${list.map((s) => `
                <div class="card" onclick="App.navigate('documentacion-ti',{view:'sistema',id:'${this.js(s.id)}'})">
                    <div class="card-body">
                        <h3>${this.esc(s.nombre)}</h3>
                        <p>${this.esc(s.descripcion || '')}</p>
                        <span class="status-badge ${s.estado === 'activo' ? 'aprobada' : 'pendiente'}">${this.esc(s.estado || 'activo')}</span>
                    </div>
                </div>`).join('')}</div>` : this._empty('Sin sistemas', 'Registre el primer sistema o servicio que mantiene TI.')}`;
    }

    static _back(tab) {
        return `<button type="button" class="btn btn-outline" onclick="App.navigate('documentacion-ti',{tab:'${tab}'})"><i class="fas fa-arrow-left"></i> Volver</button>`;
    }

    static async renderActividad(id) {
        const content = document.getElementById('contentArea');
        let act;
        try { act = await DocumentacionTiManager.getActividad(id); }
        catch (e) { content.innerHTML = this._errorBox(e); return; }
        if (!act) { content.innerHTML = this._empty('No encontrada', 'La actividad no existe o no tiene acceso.'); return; }
        content.innerHTML = `
            <div class="doc-ti-work">
                ${this._back('bitacora')}
                <h2>${this.esc(act.titulo)}</h2>
                <p class="doc-ti-meta">Ejecución: ${this.esc(DocumentacionTiManager.formatFecha(act.fechaEjecucion))} · Creada: ${this.esc(DocumentacionTiManager.formatFecha(act.fechaCreacionMs))} · Actualizada: ${this.esc(DocumentacionTiManager.formatFecha(act.actualizadoMs))}</p>
                <p><span class="status-badge pendiente">${this.esc(DOC_TI_ESTADOS_ACTIVIDAD[act.estado])}</span> ${this.esc(DOC_TI_TIPOS_ACTIVIDAD[act.tipo])} · ${this.esc(act.responsableNombre || '')}</p>
                <div class="card"><div class="card-body">
                    <h4>Problema o trabajo</h4><p>${this.esc(act.cuerpo.descripcion || '—')}</p>
                    <h4>Pasos</h4><pre class="doc-ti-pre">${this.esc(act.cuerpo.pasos || '—')}</pre>
                    <h4>Resultado</h4><p>${this.esc(act.cuerpo.resultado || act.resultadoResumen || '—')}</p>
                </div></div>
                <div class="card"><div class="card-header"><h3>Seguimiento</h3></div><div class="card-body">
                    ${(act.seguimiento || []).map((s) => `<p><strong>${this.esc(s.autorNombre)}</strong> · ${this.esc(DocumentacionTiManager.formatFecha(s.fechaMs))}<br>${this.esc(s.texto)}</p>`).join('') || '<p>Sin entradas de seguimiento.</p>'}
                    <div class="form-group"><label for="segTexto">Nueva entrada (no reemplaza las anteriores)</label>
                        <textarea class="form-control" id="segTexto" rows="3"></textarea></div>
                    <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.addSeguimiento('${this.js(id)}')">Agregar seguimiento</button>
                </div></div>
                <div class="card"><div class="card-header"><h3>Historial</h3></div><div class="card-body">
                    ${(act.historial || []).map((h) => `<p>${this.esc(h.tipo)}: ${this.esc(h.de)} → ${this.esc(h.a)} · ${this.esc(h.porNombre)} · ${this.esc(DocumentacionTiManager.formatFecha(h.fechaMs))}</p>`).join('') || '<p>Sin eventos.</p>'}
                </div></div>
                ${this._adjuntosHtml('actividades', id, act.adjuntos)}
                <div class="doc-ti-actions">
                    <button type="button" class="btn btn-primary" onclick="App.navigate('documentacion-ti',{view:'nueva-actividad',id:'${this.js(id)}'})">Editar</button>
                    <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.crearGuia('${this.js(id)}')">Crear guía desde esta actividad</button>
                </div>
            </div>`;
    }

    static async addSeguimiento(id) {
        const texto = document.getElementById('segTexto')?.value;
        try {
            await DocumentacionTiManager.agregarSeguimiento(id, texto);
            Toast.success('Bitácora', 'Seguimiento agregado');
            this.render({ view: 'actividad', id });
        } catch (e) { Toast.error('Bitácora', e.message); }
    }

    static async crearGuia(id) {
        try {
            const art = await DocumentacionTiManager.guiaDesdeActividad(id);
            Toast.success('Guía', 'Se creó un borrador. La actividad original no cambió.');
            App.navigate('documentacion-ti', { view: 'articulo', id: art.id });
        } catch (e) { Toast.error('Guía', e.message); }
    }

    static async renderFormActividad(id) {
        const content = document.getElementById('contentArea');
        const user = AuthManager.getUser();
        let act = null;
        if (id) {
            act = await DocumentacionTiManager.getActividad(id);
            if (!act) { content.innerHTML = this._empty('No encontrada', 'No se puede editar.'); return; }
        }
        const { sistemas, users, equipos, deptos } = await this._selectores();
        const v = act || { estado: 'pendiente', tipo: 'soporte', fechaEjecucion: DocumentacionTiManager.fechaActividadHoy(), responsableId: user.id, responsableNombre: `${user.nombre} ${user.apellido}`, cuerpo: {} };
        content.innerHTML = `
            <form class="doc-ti-work" id="formAct" onsubmit="DocumentacionTiUI.saveActividad(event, '${id ? this.js(id) : ''}', ${act ? act.revision : 0})">
                ${this._back('bitacora')}
                <h2>${id ? 'Editar actividad' : 'Nueva actividad'}</h2>
                <p class="doc-ti-hint">La fecha de ejecución es la del trabajo. La creación y la modificación las registra el servidor.</p>
                <div class="form-group"><label for="actTitulo">Título <span class="required">*</span></label>
                    <input class="form-control" id="actTitulo" required maxlength="200" value="${this.esc(v.titulo || '')}"></div>
                <div class="doc-ti-grid2">
                    <div class="form-group"><label for="actTipo">Tipo</label>
                        <select class="form-control" id="actTipo">${this._opts(Object.entries(DOC_TI_TIPOS_ACTIVIDAD).map(([k, v]) => ({ k, v })), v.tipo, (x) => x.k, (x) => x.v)}</select></div>
                    <div class="form-group"><label for="actEstado">Estado</label>
                        <select class="form-control" id="actEstado">${this._opts(Object.entries(DOC_TI_ESTADOS_ACTIVIDAD).map(([k, v]) => ({ k, v })), v.estado, (x) => x.k, (x) => x.v)}</select></div>
                    <div class="form-group"><label for="actFecha">Fecha de ejecución</label>
                        <input type="date" class="form-control" id="actFecha" required value="${this.esc(v.fechaEjecucion || '')}"></div>
                    <div class="form-group"><label for="actMin">Tiempo (minutos)</label>
                        <input type="number" min="0" class="form-control" id="actMin" value="${this.esc(v.tiempoMinutos || 0)}"></div>
                    <div class="form-group"><label for="actResp">Responsable</label>
                        <select class="form-control" id="actResp">${this._opts(users, v.responsableId, (u) => u.id, (u) => `${u.nombre} ${u.apellido}`)}</select></div>
                    <div class="form-group"><label for="actDep">Departamento atendido</label>
                        <select class="form-control" id="actDep">${this._opts(deptos.map((d) => ({ id: d, nombre: DEPARTAMENTOS[d]?.nombre || d })), v.departamentoAtendido, (d) => d.id, (d) => d.nombre, 'Opcional')}</select></div>
                    <div class="form-group"><label for="actSis">Sistema</label>
                        <select class="form-control" id="actSis">${this._opts(sistemas, v.sistemaId, (s) => s.id, (s) => s.nombre, 'Opcional')}</select></div>
                    <div class="form-group"><label for="actEq">Equipo</label>
                        <select class="form-control" id="actEq">${this._opts(equipos, v.equipoId, (s) => s.id, (s) => s.nombre, 'Opcional')}</select></div>
                </div>
                <div class="form-group"><label for="actDesc">Descripción del problema o trabajo</label>
                    <textarea class="form-control" id="actDesc" rows="5">${this.esc(v.cuerpo?.descripcion || '')}</textarea></div>
                <div class="form-group"><label for="actPasos">Pasos realizados</label>
                    <textarea class="form-control" id="actPasos" rows="5">${this.esc(v.cuerpo?.pasos || '')}</textarea></div>
                <div class="form-group"><label for="actRes">Resultado (obligatorio al completar)</label>
                    <textarea class="form-control" id="actRes" rows="4">${this.esc(v.cuerpo?.resultado || v.resultadoResumen || '')}</textarea></div>
                <div class="form-group"><label for="actMotivo">Motivo de cancelación</label>
                    <textarea class="form-control" id="actMotivo" rows="2">${this.esc(v.motivoCancelacion || '')}</textarea></div>
                <div class="form-group"><label for="actSeg">Seguimiento pendiente</label>
                    <textarea class="form-control" id="actSeg" rows="2">${this.esc(v.cuerpo?.seguimientoPendiente || '')}</textarea></div>
                <div class="form-group"><label for="actFiles">Evidencias (PDF, PNG o JPEG, máx. 1 MiB, 5 archivos)</label>
                    <input type="file" id="actFiles" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple></div>
                <div class="doc-ti-unsaved" id="actDirty" hidden>Hay cambios sin guardar.</div>
                <div class="doc-ti-actions">
                    <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.leave('bitacora')">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="actSave">Guardar</button>
                </div>
            </form>`;
        this._watchDirty(content.querySelector('#formAct'));
    }

    static async saveActividad(ev, id, rev) {
        ev.preventDefault();
        const resp = document.getElementById('actResp');
        const sis = document.getElementById('actSis');
        const eq = document.getElementById('actEq');
        const data = {
            titulo: document.getElementById('actTitulo').value,
            tipo: document.getElementById('actTipo').value,
            estado: document.getElementById('actEstado').value,
            fechaEjecucion: document.getElementById('actFecha').value,
            tiempoMinutos: document.getElementById('actMin').value,
            responsableId: resp.value,
            responsableNombre: resp.selectedOptions[0]?.textContent,
            departamentoAtendido: document.getElementById('actDep').value,
            sistemaId: sis.value,
            sistemaNombre: sis.value ? sis.selectedOptions[0]?.textContent : '',
            equipoId: eq.value,
            equipoNombre: eq.value ? eq.selectedOptions[0]?.textContent : '',
            descripcion: document.getElementById('actDesc').value,
            pasos: document.getElementById('actPasos').value,
            resultado: document.getElementById('actRes').value,
            resultadoResumen: document.getElementById('actRes').value,
            motivoCancelacion: document.getElementById('actMotivo').value,
            seguimientoPendiente: document.getElementById('actSeg').value,
            archivos: document.getElementById('actFiles').files
        };
        const btn = document.getElementById('actSave');
        btn.disabled = true;
        try {
            if (id) await DocumentacionTiManager.guardarActividad(id, data, rev);
            else {
                const created = await DocumentacionTiManager.crearActividad(data);
                id = created.id;
            }
            this.state.dirty = false;
            Toast.success('Bitácora', 'Actividad guardada');
            App.navigate('documentacion-ti', { view: 'actividad', id });
        } catch (e) {
            btn.disabled = false;
            if (e instanceof DocTiConflictError) {
                Toast.error('Conflicto', e.message);
                return;
            }
            Toast.error('Bitácora', e.message || 'No se pudo guardar. El texto sigue en pantalla.');
        }
    }

    static async renderArticulo(id) {
        const content = document.getElementById('contentArea');
        let art;
        try { art = await DocumentacionTiManager.getArticulo(id); }
        catch (e) { content.innerHTML = this._errorBox(e); return; }
        if (!art) { content.innerHTML = this._empty('No encontrado', 'El documento no existe.'); return; }
        const user = AuthManager.getUser();
        const modo = this.state.previewMode ? 'publicado' : 'trabajo';
        const md = (modo === 'publicado' && art.publicado) ? art.publicado.markdown : (art.cuerpo.markdown || '');
        const showing = (art.publishedVersionId && modo === 'publicado')
            ? 'Mostrando la edición publicada'
            : (art.publishedVersionId ? 'Mostrando el borrador de trabajo (la edición publicada se conserva)' : 'Mostrando el borrador');
        content.innerHTML = `
            <div class="doc-ti-work">
                ${this._back('biblioteca')}
                <div class="doc-ti-doc-head"><h2>${this.esc(art.tituloTrabajo || art.titulo)}</h2>
                    <span class="status-badge ${art.estado === 'publicado' ? 'aprobada' : 'pendiente'}">${this.esc(DOC_TI_ESTADOS_ARTICULO[art.estado])}</span></div>
                <p class="doc-ti-hint">${showing}</p>
                ${art.publishedVersionId ? `<button type="button" class="btn btn-sm btn-outline" onclick="DocumentacionTiUI.toggleVista('${this.js(id)}')">${modo === 'publicado' ? 'Ver borrador' : 'Ver publicado'}</button>` : ''}
                ${art.comentarioRevision ? `<p class="doc-ti-warn">Devolución: ${this.esc(art.comentarioRevision)}</p>` : ''}
                <div class="doc-ti-md">${DocumentacionTiMarkdown.render(md)}</div>
                ${this._adjuntosHtml('articulos', id, art.adjuntos)}
                <div class="card"><div class="card-header"><h3>Versiones</h3></div><div class="card-body">
                    ${(art.versiones || []).map((v) => `<div class="doc-ti-row">
                        v${v.numero} · ${this.esc(v.resumenCambio || '')} · ${this.esc(v.autorNombre)} · ${this.esc(DocumentacionTiManager.formatFecha(v.fechaMs))}
                        ${DocumentacionTiPermiso.puedePublicar(user) ? `<button type="button" class="btn btn-sm btn-outline" onclick="DocumentacionTiUI.restaurar('${this.js(id)}','${this.js(v.id)}')">Restaurar a borrador</button>` : ''}
                    </div>`).join('') || '<p>Aún no hay versiones publicadas.</p>'}
                </div></div>
                <div class="doc-ti-actions">
                    ${DocumentacionTiPermiso.puedeEditarArticulo(user, art) ? `<button type="button" class="btn btn-primary" onclick="App.navigate('documentacion-ti',{view:'nuevo-articulo',id:'${this.js(id)}'})">Editar</button>` : ''}
                    ${DocumentacionTiPermiso.puedeEditarArticulo(user, art) && art.estado !== 'en_revision' ? `<button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.enviarRev('${this.js(id)}')">Enviar a revisión</button>` : ''}
                    ${DocumentacionTiPermiso.puedePublicar(user) && art.estado === 'en_revision' ? `
                        <button type="button" class="btn btn-primary" onclick="DocumentacionTiUI.publicar('${this.js(id)}')">Publicar</button>
                        <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.devolver('${this.js(id)}')">Devolver</button>` : ''}
                    ${DocumentacionTiPermiso.puedePublicar(user) && art.estado !== 'archivado' ? `<button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.archivar('${this.js(id)}')">Archivar</button>` : ''}
                    ${art.estado === 'publicado' || art.publishedVersionId ? `
                        <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.exportMd('${this.js(id)}')">Exportar Markdown publicado</button>
                        <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.imprimir('${this.js(id)}')">Imprimir / PDF</button>` : ''}
                </div>
            </div>`;
        DocumentacionTiMarkdown.bindCopy(content);
    }

    static toggleVista(id) {
        this.state.previewMode = !this.state.previewMode;
        this.renderArticulo(id);
    }

    static async enviarRev(id) {
        try { await DocumentacionTiManager.enviarRevision(id); Toast.success('Revisión', 'Enviado a revisión'); this.renderArticulo(id); }
        catch (e) { Toast.error('Revisión', e.message); }
    }

    static async publicar(id) {
        const c = prompt('Resumen del cambio (versión nueva):', 'Publicación');
        if (c == null) return;
        try { await DocumentacionTiManager.publicarArticulo(id, c); Toast.success('Biblioteca', 'Publicado'); this.state.previewMode = true; this.renderArticulo(id); }
        catch (e) { Toast.error('Publicar', e.message); }
    }

    static async devolver(id) {
        const c = prompt('Comentario de devolución:');
        if (c == null) return;
        try { await DocumentacionTiManager.devolverArticulo(id, c); Toast.success('Revisión', 'Devuelto al autor'); this.renderArticulo(id); }
        catch (e) { Toast.error('Revisión', e.message); }
    }

    static async archivar(id) {
        if (!confirm('¿Archivar? Deja de aparecer en la consulta habitual y conserva el historial.')) return;
        try { await DocumentacionTiManager.archivarArticulo(id); Toast.success('Biblioteca', 'Archivado'); App.navigate('documentacion-ti', { tab: 'biblioteca' }); }
        catch (e) { Toast.error('Archivar', e.message); }
    }

    static async restaurar(id, vid) {
        if (!confirm('Se copiará esta versión a un borrador nuevo. Las versiones posteriores se conservan.')) return;
        try { await DocumentacionTiManager.restaurarVersion(id, vid); Toast.success('Versiones', 'Restaurado como borrador nuevo'); this.renderArticulo(id); }
        catch (e) { Toast.error('Versiones', e.message); }
    }

    static async exportMd(id) {
        const art = await DocumentacionTiManager.getArticulo(id);
        const md = art.publicado?.markdown;
        if (!md) { Toast.error('Exportar', 'Solo se exporta la edición publicada'); return; }
        const blob = new Blob([`# ${art.titulo}\n\n${md}`], { type: 'text/markdown;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${(art.titulo || 'articulo').replace(/[^\w]+/g, '_')}.md`;
        a.click();
    }

    static async imprimir(id) {
        const art = await DocumentacionTiManager.getArticulo(id);
        const md = art.publicado?.markdown;
        if (!md) { Toast.error('Imprimir', 'Solo la edición publicada'); return; }
        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${this.esc(art.titulo)}</title>
            <style>body{font-family:Inter,Segoe UI,sans-serif;margin:24px;color:#111} pre{white-space:pre-wrap;page-break-inside:avoid}
            h1,h2,h3{page-break-after:avoid} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ccc;padding:6px}
            @media print { a{color:#000;text-decoration:none} }</style></head><body>
            <h1>${this.esc(art.titulo)}</h1>${DocumentacionTiMarkdown.render(md)}</body></html>`);
        w.document.close();
        w.focus();
        w.print();
    }

    static async renderFormArticulo(id, params = {}) {
        const content = document.getElementById('contentArea');
        const user = AuthManager.getUser();
        let art = null;
        if (params.id) id = params.id;
        if (id) art = await DocumentacionTiManager.getArticulo(id);
        const { sistemas, users, equipos } = await this._selectores();
        const tipo = art?.tipo || params.tipo || 'nota_libre';
        const md = art?.cuerpo?.markdown || DocumentacionTiMarkdown.plantillaMarkdown(tipo);
        content.innerHTML = `
            <form class="doc-ti-work" id="formArt" onsubmit="DocumentacionTiUI.saveArticulo(event,'${id ? this.js(id) : ''}', ${art ? art.revision : 0})">
                ${this._back('biblioteca')}
                <h2>${id ? 'Editar documento' : 'Nuevo documento'}</h2>
                ${art?.publishedVersionId ? `<p class="doc-ti-hint">Hay una edición publicada. Este formulario trabaja el borrador; no la reemplaza hasta publicar.</p>` : ''}
                <div class="doc-ti-grid2">
                    <div class="form-group"><label for="artTitulo">Título <span class="required">*</span></label>
                        <input class="form-control" id="artTitulo" required maxlength="200" value="${this.esc(art?.tituloTrabajo || art?.titulo || '')}"></div>
                    <div class="form-group"><label for="artTipo">Tipo</label>
                        <select class="form-control" id="artTipo">${this._opts(Object.entries(DOC_TI_TIPOS_ARTICULO).map(([k, v]) => ({ k, v })), tipo, (x) => x.k, (x) => x.v)}</select></div>
                    <div class="form-group"><label for="artCat">Categoría</label>
                        <select class="form-control" id="artCat">${this._opts(Object.entries(DOC_TI_CATEGORIAS).map(([k, v]) => ({ k, v })), art?.categoria, (x) => x.k, (x) => x.v)}</select></div>
                    <div class="form-group"><label for="artResp">Responsable de mantenimiento</label>
                        <select class="form-control" id="artResp">${this._opts(users, art?.responsableId || user.id, (u) => u.id, (u) => `${u.nombre} ${u.apellido}`)}</select></div>
                    <div class="form-group"><label for="artSis">Sistema</label>
                        <select class="form-control" id="artSis">${this._opts(sistemas, art?.sistemaId, (s) => s.id, (s) => s.nombre, 'Opcional')}</select></div>
                    <div class="form-group"><label for="artEq">Equipo</label>
                        <select class="form-control" id="artEq">${this._opts(equipos, art?.equipoId, (s) => s.id, (s) => s.nombre, 'Opcional')}</select></div>
                    <div class="form-group"><label for="artRev">Próxima revisión</label>
                        <input type="date" class="form-control" id="artRev" value="${this.esc(art?.proximaRevision || '')}"></div>
                    <div class="form-group"><label for="artTags">Etiquetas (coma)</label>
                        <input class="form-control" id="artTags" value="${this.esc(art?.etiquetas ? Object.keys(art.etiquetas).join(', ') : '')}"></div>
                </div>
                <div class="form-group"><label for="artResumen">Resumen</label>
                    <textarea class="form-control" id="artResumen" rows="2" maxlength="500">${this.esc(art?.resumen || '')}</textarea></div>
                <div class="doc-ti-editor">
                    <div class="doc-ti-mdbar">
                        <button type="button" class="btn btn-sm btn-outline" data-md="h2">Título</button>
                        <button type="button" class="btn btn-sm btn-outline" data-md="b">Negrita</button>
                        <button type="button" class="btn btn-sm btn-outline" data-md="ul">Lista</button>
                        <button type="button" class="btn btn-sm btn-outline" data-md="task">Casilla</button>
                        <button type="button" class="btn btn-sm btn-outline" data-md="table">Tabla</button>
                        <button type="button" class="btn btn-sm btn-outline" data-md="code">Código</button>
                        <button type="button" class="btn btn-sm btn-outline" data-md="link">Enlace</button>
                        <button type="button" class="btn btn-sm btn-outline" id="artPreviewBtn">Vista previa</button>
                    </div>
                    <label class="sr-only" for="artMd">Contenido</label>
                    <textarea class="form-control doc-ti-mdarea" id="artMd" rows="22">${this.esc(md)}</textarea>
                    <div class="doc-ti-md" id="artPreview" hidden></div>
                </div>
                <div class="form-group"><label for="artFiles">Adjuntos (PDF, PNG, JPEG)</label>
                    <input type="file" id="artFiles" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple></div>
                <div class="doc-ti-unsaved" id="artDirty" hidden>Hay cambios sin guardar.</div>
                <div class="doc-ti-actions">
                    <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.leave('biblioteca')">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="artSave">Guardar borrador</button>
                </div>
            </form>`;
        document.getElementById('artTipo').onchange = (e) => {
            if (!id && !document.getElementById('artMd').value.trim()) {
                document.getElementById('artMd').value = DocumentacionTiMarkdown.plantillaMarkdown(e.target.value);
            }
        };
        content.querySelectorAll('[data-md]').forEach((btn) => {
            btn.onclick = () => this._insertMd(btn.dataset.md);
        });
        document.getElementById('artPreviewBtn').onclick = () => {
            const prev = document.getElementById('artPreview');
            const ta = document.getElementById('artMd');
            const show = prev.hidden;
            prev.hidden = !show;
            ta.hidden = show;
            if (show) {
                prev.innerHTML = DocumentacionTiMarkdown.render(ta.value);
                DocumentacionTiMarkdown.bindCopy(prev);
            }
        };
        this._watchDirty(content.querySelector('#formArt'));
    }

    static _insertMd(kind) {
        const ta = document.getElementById('artMd');
        const map = {
            h2: '## Título\n',
            b: '**texto**',
            ul: '- elemento\n',
            task: '- [ ] paso\n',
            table: '\n| Columna | Columna |\n| --- | --- |\n| dato | dato |\n',
            code: '\n```texto\ncódigo\n```\n',
            link: '[texto](https://)'
        };
        const start = ta.selectionStart;
        const ins = map[kind] || '';
        ta.value = ta.value.slice(0, start) + ins + ta.value.slice(ta.selectionEnd);
        ta.focus();
        this.state.dirty = true;
    }

    static async saveArticulo(ev, id, rev) {
        ev.preventDefault();
        const resp = document.getElementById('artResp');
        const sis = document.getElementById('artSis');
        const eq = document.getElementById('artEq');
        const data = {
            titulo: document.getElementById('artTitulo').value,
            tipo: document.getElementById('artTipo').value,
            categoria: document.getElementById('artCat').value,
            resumen: document.getElementById('artResumen').value,
            etiquetas: document.getElementById('artTags').value,
            responsableId: resp.value,
            responsableNombre: resp.selectedOptions[0]?.textContent,
            sistemaId: sis.value,
            sistemaNombre: sis.value ? sis.selectedOptions[0]?.textContent : '',
            equipoId: eq.value,
            equipoNombre: eq.value ? eq.selectedOptions[0]?.textContent : '',
            proximaRevision: document.getElementById('artRev').value,
            markdown: document.getElementById('artMd').value,
            archivos: document.getElementById('artFiles').files
        };
        const btn = document.getElementById('artSave');
        btn.disabled = true;
        try {
            if (id) await DocumentacionTiManager.guardarArticulo(id, data, rev);
            else {
                const created = await DocumentacionTiManager.crearArticulo(data);
                id = created.id;
            }
            this.state.dirty = false;
            Toast.success('Biblioteca', 'Borrador guardado');
            App.navigate('documentacion-ti', { view: 'articulo', id });
        } catch (e) {
            btn.disabled = false;
            if (e instanceof DocTiConflictError) Toast.error('Conflicto', e.message);
            else Toast.error('Biblioteca', e.message || 'Fallo de red. El texto sigue en pantalla.');
        }
    }

    static async renderSistema(id) {
        const content = document.getElementById('contentArea');
        let sys;
        try { sys = await DocumentacionTiManager.getSistema(id); }
        catch (e) { content.innerHTML = this._errorBox(e); return; }
        if (!sys) { content.innerHTML = this._empty('No encontrado', 'Sistema inexistente.'); return; }
        const user = AuthManager.getUser();
        const enlaces = sys.enlaces ? Object.values(sys.enlaces) : [];
        const amb = sys.ambientes ? Object.values(sys.ambientes).join(', ') : '';
        content.innerHTML = `
            <div class="doc-ti-work">
                ${this._back('sistemas')}
                <h2>${this.esc(sys.nombre)}</h2>
                <p>${this.esc(sys.descripcion || '')}</p>
                <p>Responsable: ${this.esc(sys.responsableNombre || '—')} · Estado: ${this.esc(sys.estado)} · Ambientes: ${this.esc(amb || '—')}</p>
                <p>${enlaces.map((e) => `<a href="${this.esc(e.url)}" target="_blank" rel="noopener noreferrer">${this.esc(e.label)}</a>`).join(' · ')}</p>
                ${DocumentacionTiPermiso.esGestor(user) ? `<button type="button" class="btn btn-outline" onclick="App.navigate('documentacion-ti',{view:'nuevo-sistema',id:'${this.js(id)}'})">Editar catálogo</button>` : ''}
                <h3>Actividades</h3>
                ${(sys.actividades.items || []).map((a) => `<div class="doc-ti-row" onclick="App.navigate('documentacion-ti',{view:'actividad',id:'${this.js(a.id)}'})">${this.esc(a.titulo)}</div>`).join('') || '<p>Sin actividades en el alcance cargado.</p>'}
                <h3>Documentos</h3>
                ${(sys.articulos.items || []).map((a) => `<div class="doc-ti-row" onclick="App.navigate('documentacion-ti',{view:'articulo',id:'${this.js(a.id)}'})">${this.esc(a.titulo)}</div>`).join('') || '<p>Sin documentos en el alcance cargado.</p>'}
            </div>`;
    }

    static async renderFormSistema(id) {
        const content = document.getElementById('contentArea');
        const user = AuthManager.getUser();
        if (!DocumentacionTiPermiso.esGestor(user)) {
            content.innerHTML = this._errorBox(new Error('Solo administración o el encargado de TI gestionan el catálogo'));
            return;
        }
        let sys = null;
        const paramsId = id;
        if (paramsId) sys = await DocumentacionTiManager.getSistema(paramsId);
        const { users } = await this._selectores();
        const enlaces = sys?.enlaces ? Object.values(sys.enlaces) : [{ label: '', url: '' }];
        content.innerHTML = `
            <form class="doc-ti-work" onsubmit="DocumentacionTiUI.saveSistema(event,'${paramsId ? this.js(paramsId) : ''}')">
                ${this._back('sistemas')}
                <h2>${paramsId ? 'Editar sistema' : 'Nuevo sistema'}</h2>
                <div class="form-group"><label for="sysNombre">Nombre <span class="required">*</span></label>
                    <input class="form-control" id="sysNombre" required maxlength="120" value="${this.esc(sys?.nombre || '')}"></div>
                <div class="form-group"><label for="sysDesc">Descripción</label>
                    <textarea class="form-control" id="sysDesc" rows="4">${this.esc(sys?.descripcion || '')}</textarea></div>
                <div class="doc-ti-grid2">
                    <div class="form-group"><label for="sysResp">Responsable</label>
                        <select class="form-control" id="sysResp">${this._opts(users, sys?.responsableId || user.id, (u) => u.id, (u) => `${u.nombre} ${u.apellido}`)}</select></div>
                    <div class="form-group"><label for="sysEst">Estado</label>
                        <select class="form-control" id="sysEst">
                            <option value="activo" ${sys?.estado !== 'retirado' ? 'selected' : ''}>Activo</option>
                            <option value="retirado" ${sys?.estado === 'retirado' ? 'selected' : ''}>Retirado</option>
                        </select></div>
                </div>
                <div class="form-group"><label for="sysAmb">Ambientes (separados por coma)</label>
                    <input class="form-control" id="sysAmb" value="${this.esc(sys?.ambientes ? Object.values(sys.ambientes).join(', ') : '')}"></div>
                <div id="sysLinks">${enlaces.map((e, i) => `
                    <div class="doc-ti-grid2">
                        <input class="form-control sysLab" placeholder="Etiqueta" value="${this.esc(e.label || '')}">
                        <input class="form-control sysUrl" placeholder="https://…" value="${this.esc(e.url || '')}">
                    </div>`).join('')}</div>
                <button type="button" class="btn btn-sm btn-outline" onclick="DocumentacionTiUI.addLink()">Agregar enlace</button>
                <div class="doc-ti-actions">
                    <button type="button" class="btn btn-outline" onclick="DocumentacionTiUI.leave('sistemas')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>`;
    }

    static addLink() {
        const host = document.getElementById('sysLinks');
        const div = document.createElement('div');
        div.className = 'doc-ti-grid2';
        div.innerHTML = `<input class="form-control sysLab" placeholder="Etiqueta"><input class="form-control sysUrl" placeholder="https://…">`;
        host.appendChild(div);
    }

    static async saveSistema(ev, id) {
        ev.preventDefault();
        const resp = document.getElementById('sysResp');
        const enlaces = [];
        document.querySelectorAll('#sysLinks .doc-ti-grid2').forEach((row) => {
            enlaces.push({ label: row.querySelector('.sysLab').value, url: row.querySelector('.sysUrl').value });
        });
        try {
            const sid = await DocumentacionTiManager.guardarSistema(id || null, {
                nombre: document.getElementById('sysNombre').value,
                descripcion: document.getElementById('sysDesc').value,
                responsableId: resp.value,
                responsableNombre: resp.selectedOptions[0]?.textContent,
                estado: document.getElementById('sysEst').value,
                ambientes: document.getElementById('sysAmb').value,
                enlaces
            });
            Toast.success('Sistemas', 'Catálogo actualizado');
            App.navigate('documentacion-ti', { view: 'sistema', id: sid });
        } catch (e) { Toast.error('Sistemas', e.message); }
    }

    static _adjuntosHtml(kind, id, list) {
        if (!list || !list.length) return '<p class="doc-ti-hint">Sin adjuntos. Los archivos no se descargan al listar.</p>';
        return `<div class="card"><div class="card-header"><h3>Adjuntos</h3></div><div class="card-body">
            ${list.map((f) => `<button type="button" class="btn btn-sm btn-outline" onclick="DocumentacionTiUI.bajar('${kind}','${this.js(id)}','${this.js(f.id)}')">${this.esc(f.nombreArchivo)} (${Math.round((f.tamanoBytes || 0) / 1024)} KiB)</button>`).join(' ')}
        </div></div>`;
    }

    static async bajar(kind, id, fileId) {
        try {
            const { blob, nombre } = await DocumentacionTiManager.descargarAdjunto(kind, id, fileId);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = nombre;
            a.click();
        } catch (e) { Toast.error('Archivo', e.message); }
    }

    static _watchDirty(form) {
        if (!form) return;
        this.state.dirty = false;
        form.addEventListener('input', () => {
            this.state.dirty = true;
            const el = form.querySelector('.doc-ti-unsaved');
            if (el) el.hidden = false;
        });
        this._bindLeave(true);
    }

    static _bindLeave(on) {
        if (this._onLeave) window.removeEventListener('beforeunload', this._onLeave);
        if (!on) { this._onLeave = null; return; }
        this._onLeave = (e) => {
            if (!this.state.dirty) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', this._onLeave);
    }

    static leave(tab) {
        if (this.state.dirty && !confirm('Hay cambios sin guardar. ¿Salir?')) return;
        this.state.dirty = false;
        this._bindLeave(false);
        App.navigate('documentacion-ti', { tab });
    }
}
