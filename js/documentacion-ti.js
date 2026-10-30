// ============================================================
// DOCUMENTACION-TI.JS — Bitácora, biblioteca y catálogo de sistemas
// Veterinaria San Martín de Porres
// Metadatos y cuerpos separados; adjuntos Base64 en nodos propios.
// ============================================================

const DOCUMENTACION_TI_SCHEMA = 1;
const DOCUMENTACION_TI_PAGE = 25;
const DOCUMENTACION_TI_SEARCH_CAP = 200;
const DOCUMENTACION_TI_TZ = 'America/Costa_Rica';
const DOCUMENTACION_TI_MAX_MD = 50000;
const DOCUMENTACION_TI_MAX_FILE = 1024 * 1024;
const DOCUMENTACION_TI_MAX_FILES = 5;
const DOCUMENTACION_TI_MAX_FILES_TOTAL = 5 * 1024 * 1024;
const DOCUMENTACION_TI_B64_MAX = 1400000;

const DOC_TI_TIPOS_ACTIVIDAD = {
    soporte: 'Soporte',
    mantenimiento: 'Mantenimiento',
    desarrollo: 'Desarrollo',
    cambio_config: 'Cambio de configuración',
    respaldo: 'Respaldo / restauración',
    instalacion: 'Instalación',
    otro: 'Otro'
};

const DOC_TI_ESTADOS_ACTIVIDAD = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completada: 'Completada',
    cancelada: 'Cancelada'
};

const DOC_TI_TIPOS_ARTICULO = {
    solucion_soporte: 'Solución de soporte',
    procedimiento: 'Procedimiento operativo',
    documentacion_sistema: 'Documentación de sistema',
    programacion: 'Programación',
    cambio_mantenimiento: 'Cambio o mantenimiento',
    revision_incidente: 'Revisión de incidente',
    nota_libre: 'Nota libre'
};

const DOC_TI_CATEGORIAS = {
    soporte: 'Soporte',
    infraestructura: 'Infraestructura',
    desarrollo: 'Desarrollo',
    seguridad: 'Seguridad',
    operacion: 'Operación',
    otro: 'Otro'
};

const DOC_TI_ESTADOS_ARTICULO = {
    borrador: 'Borrador',
    en_revision: 'En revisión',
    publicado: 'Publicado',
    archivado: 'Archivado'
};

const DOC_TI_PLANTILLAS = {
    solucion_soporte: [
        ['sintomas', 'Síntomas'],
        ['entorno', 'Entorno'],
        ['diagnostico', 'Diagnóstico'],
        ['causa', 'Causa conocida'],
        ['solucion', 'Solución'],
        ['comprobacion', 'Comprobación'],
        ['escalamiento', 'Escalamiento']
    ],
    procedimiento: [
        ['objetivo', 'Objetivo'],
        ['requisitos', 'Requisitos'],
        ['pasos', 'Pasos'],
        ['resultado', 'Resultado esperado'],
        ['validacion', 'Validación'],
        ['reversion', 'Reversión']
    ],
    documentacion_sistema: [
        ['finalidad', 'Finalidad'],
        ['componentes', 'Componentes'],
        ['arquitectura', 'Arquitectura'],
        ['dependencias', 'Dependencias'],
        ['ambientes', 'Ambientes'],
        ['operacion', 'Operación'],
        ['respaldos', 'Respaldos y recuperación']
    ],
    programacion: [
        ['repositorio', 'Repositorio (enlace)'],
        ['preparacion', 'Preparación local'],
        ['configuracion', 'Configuración (nombres de variables, sin secretos)'],
        ['estructura', 'Estructura'],
        ['api', 'API'],
        ['pruebas', 'Pruebas'],
        ['despliegue', 'Despliegue y reversión']
    ],
    cambio_mantenimiento: [
        ['motivo', 'Motivo'],
        ['alcance', 'Alcance'],
        ['impacto', 'Impacto'],
        ['preparacion', 'Preparación'],
        ['ejecucion', 'Ejecución'],
        ['pruebas', 'Pruebas'],
        ['resultado', 'Resultado'],
        ['reversion', 'Reversión']
    ],
    revision_incidente: [
        ['cronologia', 'Cronología'],
        ['impacto', 'Impacto'],
        ['causas', 'Causas'],
        ['resolucion', 'Resolución'],
        ['lecciones', 'Lecciones'],
        ['acciones', 'Acciones pendientes']
    ],
    nota_libre: [
        ['contenido', 'Nota']
    ]
};

class DocTiConflictError extends Error {
    constructor(message, serverRecord) {
        super(message);
        this.name = 'DocTiConflictError';
        this.serverRecord = serverRecord || null;
    }
}

class DocumentacionTiMarkdown {
    static escape(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    static safeUrl(raw) {
        const url = String(raw || '').trim();
        if (!/^https?:\/\//i.test(url)) return null;
        if (/[\s<>]/.test(url)) return null;
        return url;
    }

    static inline(text) {
        let s = this.escape(text);
        s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
        s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
            const url = this.safeUrl(href);
            if (!url) return this.escape(label);
            return `<a href="${this.escape(url)}" rel="noopener noreferrer" target="_blank">${label}</a>`;
        });
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        return s;
    }

    static plantillaMarkdown(tipo) {
        const secs = DOC_TI_PLANTILLAS[tipo] || DOC_TI_PLANTILLAS.nota_libre;
        return secs.map(([_, title]) => `## ${title}\n\n`).join('');
    }

    static render(md) {
        const src = String(md || '').replace(/\r\n/g, '\n');
        const lines = src.split('\n');
        const html = [];
        let i = 0;
        let inCode = false;
        let codeLang = '';
        let codeLines = [];
        let listType = null;

        const closeList = () => {
            if (listType) {
                html.push(listType === 'ol' ? '</ol>' : '</ul>');
                listType = null;
            }
        };

        const flushCode = () => {
            const raw = codeLines.join('\n');
            const lang = this.escape(codeLang || 'texto');
            html.push(
                `<div class="doc-ti-code"><div class="doc-ti-code-bar"><span>${lang}</span>` +
                `<button type="button" class="btn btn-sm btn-outline doc-ti-copy">Copiar</button></div>` +
                `<pre><code>${this.escape(raw)}</code></pre></div>`
            );
            inCode = false;
            codeLang = '';
            codeLines = [];
        };

        while (i < lines.length) {
            const line = lines[i];
            if (inCode) {
                if (/^```/.test(line)) flushCode();
                else codeLines.push(line);
                i += 1;
                continue;
            }
            const fence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
            if (fence) {
                closeList();
                inCode = true;
                codeLang = fence[1] || '';
                i += 1;
                continue;
            }
            if (/^\s*\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*[-:| ]+\|\s*$/.test(lines[i + 1])) {
                closeList();
                const rows = [];
                while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
                    const cells = lines[i].replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
                    if (!/^[-:| ]+$/.test(cells.join(''))) rows.push(cells);
                    i += 1;
                }
                if (rows.length) {
                    const head = rows[0];
                    const body = rows.slice(1);
                    html.push('<div class="table-container"><table class="data-table"><thead><tr>' +
                        head.map((c) => `<th>${this.inline(c)}</th>`).join('') +
                        '</tr></thead><tbody>' +
                        body.map((r) => `<tr>${r.map((c) => `<td>${this.inline(c)}</td>`).join('')}</tr>`).join('') +
                        '</tbody></table></div>');
                }
                continue;
            }
            const h = line.match(/^(#{1,3})\s+(.+)$/);
            if (h) {
                closeList();
                const lvl = h[1].length;
                html.push(`<h${lvl}>${this.inline(h[2])}</h${lvl}>`);
                i += 1;
                continue;
            }
            const task = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/);
            if (task) {
                if (listType !== 'ul') { closeList(); html.push('<ul class="doc-ti-tasks">'); listType = 'ul'; }
                const on = task[1] !== ' ';
                html.push(`<li><label><input type="checkbox" disabled ${on ? 'checked' : ''}> ${this.inline(task[2])}</label></li>`);
                i += 1;
                continue;
            }
            const ul = line.match(/^\s*[-*]\s+(.+)$/);
            if (ul) {
                if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
                html.push(`<li>${this.inline(ul[1])}</li>`);
                i += 1;
                continue;
            }
            const ol = line.match(/^\s*\d+\.\s+(.+)$/);
            if (ol) {
                if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
                html.push(`<li>${this.inline(ol[1])}</li>`);
                i += 1;
                continue;
            }
            if (/^\s*>\s?/.test(line)) {
                closeList();
                html.push(`<blockquote>${this.inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`);
                i += 1;
                continue;
            }
            if (!line.trim()) {
                closeList();
                i += 1;
                continue;
            }
            closeList();
            html.push(`<p>${this.inline(line)}</p>`);
            i += 1;
        }
        if (inCode) flushCode();
        closeList();
        return html.join('') || '<p></p>';
    }

    static bindCopy(root) {
        if (!root) return;
        root.querySelectorAll('.doc-ti-copy').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const pre = btn.closest('.doc-ti-code')?.querySelector('code');
                const text = pre ? pre.textContent : '';
                try {
                    await navigator.clipboard.writeText(text);
                    btn.textContent = 'Copiado';
                    setTimeout(() => { btn.textContent = 'Copiar'; }, 1200);
                } catch (_) {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                }
            });
        });
    }
}

class DocumentacionTiPermiso {
    static codigoTI() {
        return (typeof SANCTION_FOLLOWUP_DEPT !== 'undefined' && SANCTION_FOLLOWUP_DEPT.TI) || 'TI-500';
    }

    static perfilActivo(user) {
        return !!(user && user.rol && user.activo !== false);
    }

    static esAdmin(user) {
        return this.perfilActivo(user) && user.rol === 'admin';
    }

    static supervisaTI(user) {
        if (!this.perfilActivo(user) || user.rol !== 'encargado') return false;
        const ti = this.codigoTI();
        if (String(user.departamento || '') === ti) return true;
        const raw = user.departamentosEncargado;
        return !!(raw && typeof raw === 'object' && !Array.isArray(raw) && raw[ti] === true);
    }

    static esEmpleadoTI(user) {
        if (!this.perfilActivo(user) || user.rol !== 'empleado') return false;
        return String(user.departamento || '') === this.codigoTI();
    }

    static puedeLeer(user) {
        return this.esAdmin(user) || this.supervisaTI(user) || this.esEmpleadoTI(user);
    }

    static esGestor(user) {
        return this.esAdmin(user) || this.supervisaTI(user);
    }

    static puedeEscribirActividad(user, meta) {
        if (!this.puedeLeer(user)) return false;
        if (this.esGestor(user)) return true;
        if (!meta) return true;
        return meta.creadoPor === user.id || meta.responsableId === user.id;
    }

    static puedePublicar(user) {
        return this.esGestor(user);
    }

    static puedeEditarArticulo(user, meta) {
        if (!this.puedeLeer(user)) return false;
        if (this.esGestor(user)) return true;
        if (!meta) return true;
        return meta.creadoPor === user.id && meta.estado !== 'archivado';
    }
}

class DocumentacionTiAdjuntos {
    static mimePermitido(mime, name) {
        const n = String(name || '').toLowerCase();
        const m = String(mime || '').toLowerCase();
        if (/\.(html?|svg|exe|js|msi|bat|cmd|ps1)$/i.test(n)) return false;
        if (m.includes('svg') || m.includes('html') || m.includes('javascript') || m.includes('xml')) return false;
        return m === 'application/pdf' || m === 'image/png' || m === 'image/jpeg' || m === 'image/jpg';
    }

    static magicOk(bytes, mime) {
        if (!bytes || bytes.length < 4) return false;
        const m = String(mime || '').toLowerCase();
        if (m === 'application/pdf') return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
        if (m === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
        if (m === 'image/jpeg' || m === 'image/jpg') return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
        return false;
    }

    static prefixB64(mime) {
        const m = String(mime || '').toLowerCase();
        if (m === 'application/pdf') return 'JVBERi0';
        if (m === 'image/png') return 'iVBORw0KGgo';
        if (m === 'image/jpeg' || m === 'image/jpg') return '/9j/';
        return '';
    }

    static async leerArchivo(file) {
        if (!file) throw new Error('Seleccione un archivo');
        if (!this.mimePermitido(file.type, file.name)) {
            throw new Error('Solo se admiten PDF, PNG y JPEG');
        }
        if (file.size > DOCUMENTACION_TI_MAX_FILE) {
            throw new Error('Cada archivo puede pesar hasta 1 MiB');
        }
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const mime = file.type === 'image/jpg' ? 'image/jpeg' : (file.type || 'application/octet-stream');
        if (!this.magicOk(bytes, mime)) {
            throw new Error('El contenido del archivo no coincide con PDF, PNG o JPEG');
        }
        const b64 = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => {
                const s = String(r.result || '');
                resolve(s.slice(s.indexOf(',') + 1));
            };
            r.onerror = () => reject(r.error || new Error('No se pudo leer el archivo'));
            r.readAsDataURL(file);
        });
        if (b64.length > DOCUMENTACION_TI_B64_MAX) {
            throw new Error('El archivo codificado supera el límite permitido');
        }
        return {
            nombreArchivo: String(file.name || 'archivo').slice(0, 160),
            mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime,
            tamanoBytes: file.size,
            dataBase64: b64
        };
    }
}

class DocumentacionTiManager {
    static _root() {
        return dbRef.documentacionTi;
    }

    static _assertRead() {
        const user = AuthManager.getUser();
        if (!DocumentacionTiPermiso.puedeLeer(user)) {
            const err = new Error('No tiene permiso para Documentación TI');
            err.code = 'PERMISSION';
            throw err;
        }
        if (typeof DOCUMENTACION_TI_UI_HABILITADA !== 'undefined' && DOCUMENTACION_TI_UI_HABILITADA === false) {
            const err = new Error('El módulo está deshabilitado en esta copia');
            err.code = 'DISABLED';
            throw err;
        }
        return user;
    }

    static clip(value, max) {
        return String(value || '').trim().slice(0, max);
    }

    static fold(text) {
        return String(text || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    static fechaActividadHoy() {
        return new Date().toLocaleDateString('en-CA', { timeZone: DOCUMENTACION_TI_TZ });
    }

    static formatFecha(value, conHora) {
        if (value == null || value === '') return '—';
        if (typeof value === 'number') {
            return new Date(value).toLocaleString('es-CR', {
                timeZone: DOCUMENTACION_TI_TZ,
                year: 'numeric', month: 'short', day: 'numeric',
                hour: conHora === false ? undefined : '2-digit',
                minute: conHora === false ? undefined : '2-digit'
            });
        }
        const s = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, d] = s.split('-');
            return `${d}/${m}/${y}`;
        }
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s;
        return d.toLocaleString('es-CR', {
            timeZone: DOCUMENTACION_TI_TZ,
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    static fechaToMs(fecha) {
        const s = String(fecha || '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 0;
        return Date.parse(`${s}T12:00:00-06:00`) || 0;
    }

    static validarHttpUrl(url) {
        const u = String(url || '').trim();
        if (!u) return '';
        if (!/^https?:\/\//i.test(u)) throw new Error('Los enlaces deben empezar con http:// o https://');
        try {
            const parsed = new URL(u);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                throw new Error('Protocolo no permitido');
            }
        } catch (e) {
            if (e.message === 'Protocolo no permitido' || e.message.indexOf('http') >= 0) throw e;
            throw new Error('URL inválida');
        }
        return u.slice(0, 500);
    }

    static csvCell(value) {
        let s = String(value ?? '');
        if (/^[=+\-@]/.test(s) || /^[\t\r]/.test(s)) s = `'${s}`;
        if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
        return s;
    }

    static async _config() {
        const snap = await this._root().child('config').once('value');
        const val = snap.val() || {};
        return {
            schemaVersion: val.schemaVersion || DOCUMENTACION_TI_SCHEMA,
            habilitado: val.habilitado !== false
        };
    }

    static async moduloHabilitado() {
        try {
            const cfg = await this._config();
            return cfg.habilitado !== false;
        } catch (_) {
            return true;
        }
    }

    static _pageList(map, { sortKey, dir, page, pageSize, filter }) {
        const arr = [];
        Object.keys(map || {}).forEach((id) => arr.push({ id, ...map[id] }));
        const filtered = filter ? arr.filter(filter) : arr;
        filtered.sort((a, b) => {
            const av = a[sortKey] || 0;
            const bv = b[sortKey] || 0;
            return dir === 'asc' ? av - bv : bv - av;
        });
        const size = pageSize || DOCUMENTACION_TI_PAGE;
        const p = Math.max(1, page || 1);
        const start = (p - 1) * size;
        return {
            items: filtered.slice(start, start + size),
            totalFiltrado: filtered.length,
            totalCargado: arr.length,
            page: p,
            pageSize: size,
            alcance: `Listado sobre ${arr.length} metadatos cargados (sin cuerpos ni archivos). Página ${p}.`
        };
    }

    static async listActividades({ page, filtros } = {}) {
        this._assertRead();
        const snap = await this._root().child('actividadesMeta').limitToLast(DOCUMENTACION_TI_SEARCH_CAP).once('value');
        const filtrosSafe = filtros || {};
        const q = this.fold(filtrosSafe.q || '');
        return this._pageList(snap.val(), {
            sortKey: 'fechaEjecucionMs',
            dir: 'desc',
            page,
            filter: (item) => {
                if (filtrosSafe.estado && item.estado !== filtrosSafe.estado) return false;
                if (filtrosSafe.tipo && item.tipo !== filtrosSafe.tipo) return false;
                if (filtrosSafe.responsableId && item.responsableId !== filtrosSafe.responsableId) return false;
                if (filtrosSafe.sistemaId && item.sistemaId !== filtrosSafe.sistemaId) return false;
                if (filtrosSafe.equipoId && item.equipoId !== filtrosSafe.equipoId) return false;
                if (filtrosSafe.desde && String(item.fechaEjecucion || '') < filtrosSafe.desde) return false;
                if (filtrosSafe.hasta && String(item.fechaEjecucion || '') > filtrosSafe.hasta) return false;
                if (q) {
                    const blob = this.fold([item.titulo, item.tipo, item.responsableNombre, item.sistemaNombre].join(' '));
                    if (!blob.includes(q)) return false;
                }
                return true;
            }
        });
    }

    static async getActividad(id) {
        this._assertRead();
        const [metaSnap, cuerpoSnap, segSnap, histSnap, adjSnap] = await Promise.all([
            this._root().child('actividadesMeta').child(id).once('value'),
            this._root().child('actividadesCuerpo').child(id).once('value'),
            this._root().child('actividadesSeguimiento').child(id).once('value'),
            this._root().child('actividadesHistorial').child(id).once('value'),
            this._root().child('actividadesAdjuntosMeta').child(id).once('value')
        ]);
        if (!metaSnap.exists()) return null;
        return {
            id,
            ...metaSnap.val(),
            cuerpo: cuerpoSnap.val() || {},
            seguimiento: snapshotToArray(segSnap).sort((a, b) => (a.fechaMs || 0) - (b.fechaMs || 0)),
            historial: snapshotToArray(histSnap).sort((a, b) => (a.fechaMs || 0) - (b.fechaMs || 0)),
            adjuntos: snapshotToArray(adjSnap)
        };
    }

    static _cleanActividadMeta(data, user, existing) {
        const titulo = this.clip(data.titulo, 200);
        if (!titulo) throw new Error('Indique un título identificable');
        const tipo = DOC_TI_TIPOS_ACTIVIDAD[data.tipo] ? data.tipo : 'otro';
        const estado = DOC_TI_ESTADOS_ACTIVIDAD[data.estado] ? data.estado : 'pendiente';
        const fechaEjecucion = /^\d{4}-\d{2}-\d{2}$/.test(String(data.fechaEjecucion || ''))
            ? data.fechaEjecucion
            : this.fechaActividadHoy();
        const resultadoResumen = this.clip(data.resultadoResumen || data.resultado, 8000);
        const motivoCancelacion = this.clip(data.motivoCancelacion, 2000);
        if (estado === 'completada' && resultadoResumen.length < 8) {
            throw new Error('Para completar la actividad indique el resultado (mínimo 8 caracteres)');
        }
        if (estado === 'cancelada' && motivoCancelacion.length < 4) {
            throw new Error('Para cancelar indique el motivo');
        }
        const nombre = `${user.nombre || ''} ${user.apellido || ''}`.trim();
        return {
            schemaVersion: DOCUMENTACION_TI_SCHEMA,
            titulo,
            tipo,
            estado,
            responsableId: this.clip(data.responsableId || user.id, 80) || user.id,
            responsableNombre: this.clip(data.responsableNombre || nombre, 200),
            fechaEjecucion,
            fechaEjecucionMs: this.fechaToMs(fechaEjecucion),
            departamentoAtendido: this.clip(data.departamentoAtendido, 40),
            sistemaId: this.clip(data.sistemaId, 80),
            sistemaNombre: this.clip(data.sistemaNombre, 120),
            equipoId: this.clip(data.equipoId, 80),
            equipoNombre: this.clip(data.equipoNombre, 120),
            resultadoResumen,
            motivoCancelacion,
            tiempoMinutos: Math.max(0, Math.min(24 * 60, Number(data.tiempoMinutos) || 0))
        };
    }

    static async crearActividad(data) {
        const user = this._assertRead();
        if (!DocumentacionTiPermiso.puedeEscribirActividad(user, null)) {
            throw new Error('No puede registrar actividades');
        }
        const meta = this._cleanActividadMeta(data, user, null);
        meta.creadoPor = user.id;
        meta.creadoPorNombre = `${user.nombre || ''} ${user.apellido || ''}`.trim();
        meta.revision = 1;
        meta.fechaCreacionMs = firebase.database.ServerValue.TIMESTAMP;
        meta.actualizadoMs = firebase.database.ServerValue.TIMESTAMP;
        const ref = this._root().child('actividadesMeta').push();
        const id = ref.key;
        const cuerpo = {
            descripcion: this.clip(data.descripcion, 20000),
            pasos: this.clip(data.pasos, 20000),
            resultado: this.clip(data.resultado || data.resultadoResumen, 8000),
            seguimientoPendiente: this.clip(data.seguimientoPendiente, 4000)
        };
        await ref.set(meta);
        try {
            await this._root().child('actividadesCuerpo').child(id).set(cuerpo);
            await this._pushHistorial('actividadesHistorial', id, user, 'creada', '', meta.estado);
        } catch (e) {
            throw new Error('La actividad quedó registrada a medias. Abra el registro y vuelva a guardar. ' + (e.message || ''));
        }
        await this._guardarAdjuntos('actividades', id, data.archivos || []);
        return { id, ...meta, cuerpo };
    }

    static async guardarActividad(id, data, expectedRevision) {
        const user = this._assertRead();
        const current = await this.getActividad(id);
        if (!current) throw new Error('Actividad no encontrada');
        if (!DocumentacionTiPermiso.puedeEscribirActividad(user, current)) {
            throw new Error('No puede editar esta actividad');
        }
        const patch = this._cleanActividadMeta({ ...current, ...data }, user, current);
        const metaRef = this._root().child('actividadesMeta').child(id);
        const tx = await metaRef.transaction((cur) => {
            if (!cur) return cur;
            if (cur.revision !== expectedRevision) return;
            if (cur.creadoPor !== current.creadoPor) return;
            const next = {
                ...cur,
                ...patch,
                creadoPor: cur.creadoPor,
                creadoPorNombre: cur.creadoPorNombre,
                fechaCreacionMs: cur.fechaCreacionMs,
                revision: (cur.revision || 0) + 1,
                actualizadoMs: firebase.database.ServerValue.TIMESTAMP,
                actualizadoPor: user.id
            };
            return next;
        });
        if (!tx.committed) {
            const server = (await metaRef.once('value')).val();
            throw new DocTiConflictError('Otra persona guardó este registro. Recargue o conserve su texto y vuelva a intentar.', server);
        }
        await this._root().child('actividadesCuerpo').child(id).update({
            descripcion: this.clip(data.descripcion, 20000),
            pasos: this.clip(data.pasos, 20000),
            resultado: this.clip(data.resultado || patch.resultadoResumen, 8000),
            seguimientoPendiente: this.clip(data.seguimientoPendiente, 4000)
        });
        if (current.estado !== patch.estado) {
            await this._pushHistorial('actividadesHistorial', id, user, 'estado', current.estado, patch.estado);
        }
        if (current.responsableId !== patch.responsableId) {
            await this._pushHistorial('actividadesHistorial', id, user, 'reasignacion', current.responsableNombre, patch.responsableNombre);
            this._notifySafe({
                tipo: 'doc_ti_asignacion',
                titulo: 'Actividad de TI asignada',
                mensaje: patch.titulo,
                destinatario: patch.responsableId,
                referencia: id,
                referenciaType: 'doc_ti_actividad'
            });
        }
        await this._guardarAdjuntos('actividades', id, data.archivos || []);
        return tx.snapshot.val();
    }

    static async agregarSeguimiento(id, texto) {
        const user = this._assertRead();
        const current = await this.getActividad(id);
        if (!current) throw new Error('Actividad no encontrada');
        if (!DocumentacionTiPermiso.puedeEscribirActividad(user, current)) {
            throw new Error('No puede agregar seguimiento');
        }
        const t = this.clip(texto, 4000);
        if (!t) throw new Error('Escriba el seguimiento');
        const ref = this._root().child('actividadesSeguimiento').child(id).push();
        await ref.set({
            texto: t,
            autorId: user.id,
            autorNombre: `${user.nombre || ''} ${user.apellido || ''}`.trim(),
            fechaMs: firebase.database.ServerValue.TIMESTAMP,
            schemaVersion: DOCUMENTACION_TI_SCHEMA
        });
        return ref.key;
    }

    static async listArticulos({ page, filtros, incluirArchivados } = {}) {
        this._assertRead();
        const snap = await this._root().child('articulosMeta').limitToLast(DOCUMENTACION_TI_SEARCH_CAP).once('value');
        const filtrosSafe = filtros || {};
        const q = this.fold(filtrosSafe.q || '');
        return this._pageList(snap.val(), {
            sortKey: 'actualizadoMs',
            dir: 'desc',
            page,
            filter: (item) => {
                if (!incluirArchivados && item.estado === 'archivado' && filtrosSafe.estado !== 'archivado') return false;
                if (filtrosSafe.estado && item.estado !== filtrosSafe.estado) return false;
                if (filtrosSafe.tipo && item.tipo !== filtrosSafe.tipo) return false;
                if (filtrosSafe.categoria && item.categoria !== filtrosSafe.categoria) return false;
                if (filtrosSafe.responsableId && item.responsableId !== filtrosSafe.responsableId) return false;
                if (filtrosSafe.sistemaId && item.sistemaId !== filtrosSafe.sistemaId) return false;
                if (q) {
                    const tags = item.etiquetas ? Object.keys(item.etiquetas).join(' ') : '';
                    const blob = this.fold([item.titulo, item.resumen, tags, item.codigo].join(' '));
                    if (!blob.includes(q)) return false;
                }
                return true;
            }
        });
    }

    static async getArticulo(id) {
        this._assertRead();
        const [metaSnap, cuerpoSnap, verSnap, adjSnap] = await Promise.all([
            this._root().child('articulosMeta').child(id).once('value'),
            this._root().child('articulosCuerpo').child(id).once('value'),
            this._root().child('articulosVersiones').child(id).limitToLast(30).once('value'),
            this._root().child('articulosAdjuntosMeta').child(id).once('value')
        ]);
        if (!metaSnap.exists()) return null;
        const meta = { id, ...metaSnap.val() };
        const versiones = snapshotToArray(verSnap).sort((a, b) => (a.numero || 0) - (b.numero || 0));
        let publicado = null;
        if (meta.publishedVersionId) {
            publicado = versiones.find((v) => v.id === meta.publishedVersionId) || null;
            if (!publicado) {
                const pSnap = await this._root().child('articulosVersiones').child(id).child(meta.publishedVersionId).once('value');
                if (pSnap.exists()) publicado = { id: pSnap.key, ...pSnap.val() };
            }
        }
        return {
            ...meta,
            cuerpo: cuerpoSnap.val() || {},
            versiones,
            publicado,
            adjuntos: snapshotToArray(adjSnap)
        };
    }

    static _etiquetasMap(raw) {
        const parts = String(raw || '')
            .split(/[,;]/)
            .map((t) => this.clip(t, 40))
            .filter(Boolean)
            .slice(0, 20);
        const map = {};
        parts.forEach((t) => { map[t] = true; });
        return map;
    }

    static async crearArticulo(data) {
        const user = this._assertRead();
        const titulo = this.clip(data.titulo, 200);
        if (!titulo) throw new Error('Indique un título identificable');
        const tipo = DOC_TI_TIPOS_ARTICULO[data.tipo] ? data.tipo : 'nota_libre';
        const markdown = this.clip(data.markdown || DocumentacionTiMarkdown.plantillaMarkdown(tipo), DOCUMENTACION_TI_MAX_MD);
        const ref = this._root().child('articulosMeta').push();
        const id = ref.key;
        const meta = {
            schemaVersion: DOCUMENTACION_TI_SCHEMA,
            titulo,
            resumen: this.clip(data.resumen, 500),
            tipo,
            categoria: DOC_TI_CATEGORIAS[data.categoria] ? data.categoria : 'otro',
            etiquetas: this._etiquetasMap(data.etiquetas),
            estado: 'borrador',
            responsableId: this.clip(data.responsableId || user.id, 80),
            responsableNombre: this.clip(data.responsableNombre || `${user.nombre} ${user.apellido}`, 200),
            sistemaId: this.clip(data.sistemaId, 80),
            sistemaNombre: this.clip(data.sistemaNombre, 120),
            equipoId: this.clip(data.equipoId, 80),
            equipoNombre: this.clip(data.equipoNombre, 120),
            proximaRevision: this.clip(data.proximaRevision, 10),
            actividadOrigenId: this.clip(data.actividadOrigenId, 80),
            creadoPor: user.id,
            creadoPorNombre: `${user.nombre || ''} ${user.apellido || ''}`.trim(),
            revision: 1,
            versionCount: 0,
            hayBorrador: true,
            fechaCreacionMs: firebase.database.ServerValue.TIMESTAMP,
            actualizadoMs: firebase.database.ServerValue.TIMESTAMP
        };
        await ref.set(meta);
        try {
            await this._root().child('articulosCuerpo').child(id).set({ markdown, schemaVersion: DOCUMENTACION_TI_SCHEMA });
        } catch (e) {
            throw new Error('El artículo se creó sin cuerpo. Ábralo y vuelva a guardar. ' + (e.message || ''));
        }
        await this._guardarAdjuntos('articulos', id, data.archivos || []);
        return { id, ...meta };
    }

    static async guardarArticulo(id, data, expectedRevision) {
        const user = this._assertRead();
        const current = await this.getArticulo(id);
        if (!current) throw new Error('Documento no encontrado');
        if (!DocumentacionTiPermiso.puedeEditarArticulo(user, current)) {
            throw new Error('No puede editar este documento');
        }
        const titulo = this.clip(data.titulo, 200);
        if (!titulo) throw new Error('Indique un título identificable');
        const tipo = DOC_TI_TIPOS_ARTICULO[data.tipo] ? data.tipo : current.tipo;
        const markdown = this.clip(data.markdown, DOCUMENTACION_TI_MAX_MD);
        const metaRef = this._root().child('articulosMeta').child(id);
        const tx = await metaRef.transaction((cur) => {
            if (!cur) return cur;
            if (cur.revision !== expectedRevision) return;
            const next = {
                ...cur,
                resumen: this.clip(data.resumen, 500),
                tipo,
                categoria: DOC_TI_CATEGORIAS[data.categoria] ? data.categoria : cur.categoria,
                etiquetas: this._etiquetasMap(data.etiquetas),
                responsableId: this.clip(data.responsableId || cur.responsableId, 80),
                responsableNombre: this.clip(data.responsableNombre || cur.responsableNombre, 200),
                sistemaId: this.clip(data.sistemaId, 80),
                sistemaNombre: this.clip(data.sistemaNombre, 120),
                equipoId: this.clip(data.equipoId, 80),
                equipoNombre: this.clip(data.equipoNombre, 120),
                proximaRevision: this.clip(data.proximaRevision, 10),
                hayBorrador: true,
                creadoPor: cur.creadoPor,
                creadoPorNombre: cur.creadoPorNombre,
                publishedVersionId: cur.publishedVersionId || null,
                revision: (cur.revision || 0) + 1,
                actualizadoMs: firebase.database.ServerValue.TIMESTAMP,
                actualizadoPor: user.id
            };
            if (cur.estado === 'publicado' || cur.publishedVersionId) {
                next.titulo = cur.titulo;
                next.tituloTrabajo = titulo;
            } else {
                next.titulo = titulo;
                next.tituloTrabajo = titulo;
            }
            return next;
        });
        if (!tx.committed) {
            const server = (await metaRef.once('value')).val();
            throw new DocTiConflictError('Conflicto de edición: otra persona guardó antes. Su texto sigue en pantalla.', server);
        }
        await this._root().child('articulosCuerpo').child(id).set({
            markdown,
            schemaVersion: DOCUMENTACION_TI_SCHEMA
        });
        await this._guardarAdjuntos('articulos', id, data.archivos || []);
        return tx.snapshot.val();
    }

    static _contenidoUtil(markdown) {
        const t = String(markdown || '').replace(/[#*`|>\-\s]/g, '');
        return t.length >= 12;
    }

    static async enviarRevision(id) {
        const user = this._assertRead();
        const art = await this.getArticulo(id);
        if (!art) throw new Error('Documento no encontrado');
        if (!DocumentacionTiPermiso.puedeEditarArticulo(user, art)) throw new Error('No puede enviar este documento');
        if (!art.titulo || art.titulo.length < 3) throw new Error('El título debe identificar el documento');
        if (!DOC_TI_TIPOS_ARTICULO[art.tipo]) throw new Error('Indique el tipo');
        const md = art.cuerpo?.markdown || '';
        if (!this._contenidoUtil(md)) throw new Error('Escriba contenido útil antes de enviar a revisión');
        await this._root().child('articulosMeta').child(id).update({
            estado: 'en_revision',
            hayBorrador: true,
            actualizadoMs: firebase.database.ServerValue.TIMESTAMP
        });
        const gestores = await this._uidsGestoresTI();
        gestores.filter((uid) => uid !== user.id).forEach((uid) => {
            this._notifySafe({
                tipo: 'doc_ti_revision',
                titulo: 'Documento TI en revisión',
                mensaje: art.titulo,
                destinatario: uid,
                referencia: id,
                referenciaType: 'doc_ti_articulo'
            });
        });
    }

    static async publicarArticulo(id, comentario) {
        const user = this._assertRead();
        if (!DocumentacionTiPermiso.puedePublicar(user)) throw new Error('Solo administración o el encargado de TI publican');
        const art = await this.getArticulo(id);
        if (!art) throw new Error('Documento no encontrado');
        const markdown = art.cuerpo?.markdown || '';
        if (!this._contenidoUtil(markdown)) throw new Error('No hay contenido útil para publicar');
        const numero = (art.versionCount || 0) + 1;
        const verRef = this._root().child('articulosVersiones').child(id).push();
        const version = {
            schemaVersion: DOCUMENTACION_TI_SCHEMA,
            numero,
            markdown,
            titulo: art.tituloTrabajo || art.titulo,
            resumenCambio: this.clip(comentario || 'Publicación', 400),
            autorId: user.id,
            autorNombre: `${user.nombre || ''} ${user.apellido || ''}`.trim(),
            fechaMs: firebase.database.ServerValue.TIMESTAMP,
            estadoEditorial: 'publicado'
        };
        await verRef.set(version);
        await this._root().child('articulosMeta').child(id).update({
            estado: 'publicado',
            titulo: version.titulo,
            publishedVersionId: verRef.key,
            versionCount: numero,
            hayBorrador: false,
            actualizadoMs: firebase.database.ServerValue.TIMESTAMP
        });
        if (art.creadoPor && art.creadoPor !== user.id) {
            this._notifySafe({
                tipo: 'doc_ti_publicado',
                titulo: 'Documento TI publicado',
                mensaje: version.titulo,
                destinatario: art.creadoPor,
                referencia: id,
                referenciaType: 'doc_ti_articulo'
            });
        }
    }

    static async devolverArticulo(id, comentario) {
        const user = this._assertRead();
        if (!DocumentacionTiPermiso.puedePublicar(user)) throw new Error('No puede devolver revisiones');
        const art = await this.getArticulo(id);
        if (!art) throw new Error('Documento no encontrado');
        const c = this.clip(comentario, 2000);
        if (c.length < 4) throw new Error('Escriba el comentario de devolución');
        await this._root().child('articulosMeta').child(id).update({
            estado: art.publishedVersionId ? 'publicado' : 'borrador',
            hayBorrador: true,
            comentarioRevision: c,
            actualizadoMs: firebase.database.ServerValue.TIMESTAMP
        });
        if (art.creadoPor) {
            this._notifySafe({
                tipo: 'doc_ti_devuelto',
                titulo: 'Documento TI devuelto',
                mensaje: c,
                destinatario: art.creadoPor,
                referencia: id,
                referenciaType: 'doc_ti_articulo'
            });
        }
    }

    static async archivarArticulo(id) {
        const user = this._assertRead();
        if (!DocumentacionTiPermiso.puedePublicar(user)) throw new Error('No puede archivar');
        await this._root().child('articulosMeta').child(id).update({
            estado: 'archivado',
            actualizadoMs: firebase.database.ServerValue.TIMESTAMP
        });
    }

    static async restaurarVersion(id, versionId) {
        const user = this._assertRead();
        if (!DocumentacionTiPermiso.puedePublicar(user)) throw new Error('No puede restaurar versiones');
        const art = await this.getArticulo(id);
        if (!art) throw new Error('Documento no encontrado');
        const snap = await this._root().child('articulosVersiones').child(id).child(versionId).once('value');
        if (!snap.exists()) throw new Error('Versión no encontrada');
        const ver = snap.val();
        await this._root().child('articulosCuerpo').child(id).set({
            markdown: ver.markdown || '',
            schemaVersion: DOCUMENTACION_TI_SCHEMA
        });
        await this._root().child('articulosMeta').child(id).update({
            tituloTrabajo: ver.titulo || art.titulo,
            hayBorrador: true,
            estado: art.publishedVersionId ? 'en_revision' : 'borrador',
            actualizadoMs: firebase.database.ServerValue.TIMESTAMP
        });
    }

    static async guiaDesdeActividad(actividadId) {
        const act = await this.getActividad(actividadId);
        if (!act) throw new Error('Actividad no encontrada');
        const md = [
            `## Síntomas\n\n${act.cuerpo.descripcion || ''}`,
            `## Entorno\n\nSistema: ${act.sistemaNombre || '—'}  \nEquipo: ${act.equipoNombre || '—'}  \nDepartamento: ${act.departamentoAtendido || '—'}`,
            `## Diagnóstico\n\n`,
            `## Causa conocida\n\n`,
            `## Solución\n\n${act.cuerpo.pasos || ''}`,
            `## Comprobación\n\n${act.cuerpo.resultado || act.resultadoResumen || ''}`,
            `## Escalamiento\n\n`
        ].join('\n\n');
        return this.crearArticulo({
            titulo: `Guía: ${act.titulo}`.slice(0, 200),
            resumen: 'Borrador generado desde una actividad. Adapte y quite datos del caso concreto.',
            tipo: 'solucion_soporte',
            categoria: 'soporte',
            sistemaId: act.sistemaId,
            sistemaNombre: act.sistemaNombre,
            equipoId: act.equipoId,
            equipoNombre: act.equipoNombre,
            actividadOrigenId: act.id,
            markdown: md
        });
    }

    static async listSistemas() {
        this._assertRead();
        const snap = await this._root().child('sistemas').once('value');
        return snapshotToArray(snap).sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
    }

    static async getSistema(id) {
        this._assertRead();
        const snap = await this._root().child('sistemas').child(id).once('value');
        if (!snap.exists()) return null;
        const sistema = { id, ...snap.val() };
        const [acts, arts] = await Promise.all([
            this.listActividades({ page: 1, filtros: { sistemaId: id } }),
            this.listArticulos({ page: 1, filtros: { sistemaId: id } })
        ]);
        return { ...sistema, actividades: acts, articulos: arts };
    }

    static async guardarSistema(id, data) {
        const user = this._assertRead();
        if (!DocumentacionTiPermiso.esGestor(user) && id) {
            throw new Error('Solo administración o el encargado de TI gestionan el catálogo');
        }
        if (!DocumentacionTiPermiso.puedeLeer(user)) throw new Error('Sin permiso');
        if (!id && !DocumentacionTiPermiso.puedeLeer(user)) throw new Error('Sin permiso');
        if (!DocumentacionTiPermiso.esGestor(user) && !id) {
            throw new Error('Solo administración o el encargado de TI crean sistemas');
        }
        const nombre = this.clip(data.nombre, 120);
        if (!nombre) throw new Error('Indique el nombre del sistema');
        const enlaces = {};
        (data.enlaces || []).slice(0, 10).forEach((e, idx) => {
            const label = this.clip(e.label, 80);
            const url = e.url ? this.validarHttpUrl(e.url) : '';
            if (label && url) enlaces[`e${idx}`] = { label, url };
        });
        const ambientes = {};
        String(data.ambientes || '')
            .split(/[,;]/)
            .map((a) => this.clip(a, 80))
            .filter(Boolean)
            .slice(0, 10)
            .forEach((a, i) => { ambientes[`a${i}`] = a; });
        const payload = {
            schemaVersion: DOCUMENTACION_TI_SCHEMA,
            nombre,
            descripcion: this.clip(data.descripcion, 2000),
            responsableId: this.clip(data.responsableId, 80),
            responsableNombre: this.clip(data.responsableNombre, 200),
            estado: data.estado === 'retirado' ? 'retirado' : 'activo',
            ambientes,
            enlaces,
            actualizadoMs: firebase.database.ServerValue.TIMESTAMP
        };
        if (id) {
            const cur = await this._root().child('sistemas').child(id).once('value');
            if (!cur.exists()) throw new Error('Sistema no encontrado');
            payload.creadoPor = cur.val().creadoPor;
            await this._root().child('sistemas').child(id).update(payload);
            return id;
        }
        payload.creadoPor = user.id;
        payload.fechaCreacionMs = firebase.database.ServerValue.TIMESTAMP;
        const ref = this._root().child('sistemas').push();
        await ref.set(payload);
        return ref.key;
    }

    static async resumen({ desde, hasta } = {}) {
        this._assertRead();
        const [actsWrap, artsWrap] = await Promise.all([
            this.listActividades({ page: 1, filtros: {} }),
            this.listArticulos({ page: 1, filtros: {}, incluirArchivados: true })
        ]);
        const actsSnap = await this._root().child('actividadesMeta').limitToLast(DOCUMENTACION_TI_SEARCH_CAP).once('value');
        const artsSnap = await this._root().child('articulosMeta').limitToLast(DOCUMENTACION_TI_SEARCH_CAP).once('value');
        const acts = snapshotToArray(actsSnap);
        const arts = snapshotToArray(artsSnap);
        const hoy = this.fechaActividadHoy();
        const d0 = desde || hoy.slice(0, 8) + '01';
        const d1 = hasta || hoy;
        const pendientes = acts.filter((a) => a.estado === 'pendiente' || a.estado === 'en_progreso');
        const completadasPeriodo = acts.filter((a) => a.estado === 'completada' && a.fechaEjecucion >= d0 && a.fechaEjecucion <= d1);
        const enRevision = arts.filter((a) => a.estado === 'en_revision');
        const vencidas = arts.filter((a) => a.proximaRevision && a.proximaRevision < hoy && a.estado !== 'archivado');
        const recientes = [...acts.map((a) => ({ kind: 'actividad', ...a })), ...arts.map((a) => ({ kind: 'articulo', ...a }))]
            .sort((a, b) => (b.actualizadoMs || b.fechaCreacionMs || 0) - (a.actualizadoMs || a.fechaCreacionMs || 0))
            .slice(0, 8);
        return {
            pendientes,
            completadasPeriodo,
            enRevision,
            vencidas,
            recientes,
            alcance: `Indicadores calculados sobre hasta ${DOCUMENTACION_TI_SEARCH_CAP} metadatos de actividades y de artículos, no sobre un total global de la base.`,
            cargados: { actividades: acts.length, articulos: arts.length },
            periodo: { desde: d0, hasta: d1 },
            pageCaps: { actividades: actsWrap.totalCargado, articulos: artsWrap.totalCargado }
        };
    }

    static exportCsvActividades(items) {
        const headers = ['Fecha', 'Título', 'Tipo', 'Responsable', 'Sistema', 'Estado', 'Minutos'];
        const lines = [headers.join(',')];
        items.forEach((a) => {
            lines.push([
                this.csvCell(a.fechaEjecucion),
                this.csvCell(a.titulo),
                this.csvCell(DOC_TI_TIPOS_ACTIVIDAD[a.tipo] || a.tipo),
                this.csvCell(a.responsableNombre),
                this.csvCell(a.sistemaNombre),
                this.csvCell(DOC_TI_ESTADOS_ACTIVIDAD[a.estado] || a.estado),
                this.csvCell(a.tiempoMinutos || 0)
            ].join(','));
        });
        return `\uFEFF${lines.join('\r\n')}`;
    }

    static async descargarAdjunto(kind, recordId, fileId) {
        this._assertRead();
        const fileSnap = await this._root().child(`${kind}AdjuntosFiles`).child(recordId).child(fileId).once('value');
        const metaSnap = await this._root().child(`${kind}AdjuntosMeta`).child(recordId).child(fileId).once('value');
        if (!fileSnap.exists() || !metaSnap.exists()) throw new Error('Archivo no encontrado');
        const meta = metaSnap.val();
        const b64 = fileSnap.val().dataBase64;
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return { blob: new Blob([arr], { type: meta.mimeType }), nombre: meta.nombreArchivo };
    }

    static async _guardarAdjuntos(kind, recordId, files) {
        if (!files || !files.length) return;
        const metaPath = this._root().child(`${kind}AdjuntosMeta`).child(recordId);
        const existing = snapshotToArray(await metaPath.once('value'));
        if (existing.length + files.length > DOCUMENTACION_TI_MAX_FILES) {
            throw new Error('Máximo cinco archivos por registro');
        }
        const total = existing.reduce((s, f) => s + (f.tamanoBytes || 0), 0) + files.reduce((s, f) => s + (f.tamanoBytes || f.size || 0), 0);
        if (total > DOCUMENTACION_TI_MAX_FILES_TOTAL) throw new Error('El total de archivos no puede superar 5 MiB');
        for (const file of files) {
            const parsed = file.dataBase64 ? file : await DocumentacionTiAdjuntos.leerArchivo(file);
            const ref = metaPath.push();
            await ref.set({
                nombreArchivo: parsed.nombreArchivo,
                mimeType: parsed.mimeType,
                tamanoBytes: parsed.tamanoBytes,
                prefix: DocumentacionTiAdjuntos.prefixB64(parsed.mimeType),
                subidoPor: AuthManager.getUser().id,
                fechaMs: firebase.database.ServerValue.TIMESTAMP
            });
            try {
                await this._root().child(`${kind}AdjuntosFiles`).child(recordId).child(ref.key).set({
                    dataBase64: parsed.dataBase64,
                    mimeType: parsed.mimeType
                });
            } catch (e) {
                await ref.remove();
                throw new Error('No se guardó el archivo. El registro permanece sin ese adjunto. ' + (e.message || ''));
            }
        }
    }

    static async _pushHistorial(node, id, user, tipo, de, a) {
        const ref = this._root().child(node).child(id).push();
        await ref.set({
            tipo,
            de: this.clip(de, 80),
            a: this.clip(a, 80),
            por: user.id,
            porNombre: `${user.nombre || ''} ${user.apellido || ''}`.trim(),
            fechaMs: firebase.database.ServerValue.TIMESTAMP
        });
    }

    static async _uidsGestoresTI() {
        const users = await AuthManager.getAllUsers();
        return users.filter((u) => DocumentacionTiPermiso.esGestor(u)).map((u) => u.id);
    }

    static _notifySafe(payload) {
        try {
            if (!payload.destinatario || payload.destinatario === AuthManager.getUser()?.id) return;
            NotificationManager.create(payload);
        } catch (e) {
            console.warn('Notificación TI no enviada', e);
        }
    }

    static async seedDemo() {
        this._assertRead();
        const host = String(location.hostname || '');
        if (host !== 'localhost' && host !== '127.0.0.1') {
            throw new Error('Los datos de demostración solo se cargan en entorno local');
        }
        const user = AuthManager.getUser();
        const sistemaId = await this.guardarSistema(null, {
            nombre: 'Demo: impresión recepción',
            descripcion: 'Cola de impresión de recepción (dato ficticio).',
            responsableId: user.id,
            responsableNombre: `${user.nombre} ${user.apellido}`,
            ambientes: 'producción',
            enlaces: [{ label: 'Documentación pública', url: 'https://example.com' }]
        });
        const act = await this.crearActividad({
            titulo: 'Demo: recuperar cola de impresión',
            tipo: 'soporte',
            descripcion: 'La recepción reportó que no salían tickets de prueba.',
            pasos: '1. Reiniciar cola\n2. Probar página de prueba',
            resultado: 'La impresora volvió a imprimir la página de prueba.',
            resultadoResumen: 'Impresión restaurada en recepción (dato ficticio).',
            estado: 'completada',
            fechaEjecucion: this.fechaActividadHoy(),
            sistemaId,
            sistemaNombre: 'Demo: impresión recepción',
            tiempoMinutos: 25
        });
        await this.crearArticulo({
            titulo: 'Demo: guía de cola de impresión',
            tipo: 'solucion_soporte',
            resumen: 'Borrador de demostración, sin datos personales.',
            markdown: '## Síntomas\n\nNo imprime.\n\n## Solución\n\nReiniciar cola.\n\n```powershell\nGet-Printer\n```\n',
            sistemaId,
            sistemaNombre: 'Demo: impresión recepción',
            actividadOrigenId: act.id
        });
        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DocumentacionTiMarkdown,
        DocumentacionTiPermiso,
        DocumentacionTiAdjuntos,
        DocumentacionTiManager,
        DocTiConflictError
    };
}
