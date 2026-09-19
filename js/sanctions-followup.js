// ============================================================
// SANCTIONS-FOLLOWUP.JS — Seguimiento de sanciones o quejas (tickets)
// Veterinaria San Martín de Porres
// Flujo: Cualquier usuario crea → TI (revisión privada) → RRHH (anotaciones) → Gerencia (cierre)
// Visibilidad: admin todo; empleado solo las suyas; encargado las de su(s) departamento(s); flujo TI/RRHH/GG.
// ============================================================

class SanctionFollowupManager {
    static ESTADO_ESPERA = 'en_espera';
    static ESTADO_TERMINADO = 'terminado';

    /** Adjuntos en RTDB (Base64), mismo enfoque que políticas internas — sin Storage de pago. */
    static MAX_ADJUNTO_BYTES = 8 * 1024 * 1024;
    static MAX_ADJUNTOS_POR_TICKET = 10;
    static _createInFlight = false;

    static FLUJO_PENDIENTE_TI = 'pendiente_ti';
    static FLUJO_PENDIENTE_RRHH = 'pendiente_rrhh';
    static FLUJO_PENDIENTE_GERENCIA = 'pendiente_gerencia';
    static FLUJO_CERRADO = 'cerrado';

    static etiquetaEstado(estado) {
        if (estado === this.ESTADO_TERMINADO) return 'Terminado';
        return 'En espera';
    }

    static etiquetaFlujo(etapa) {
        const m = {
            [this.FLUJO_PENDIENTE_TI]: 'En revisión TI',
            [this.FLUJO_PENDIENTE_RRHH]: 'En Recursos Humanos',
            [this.FLUJO_PENDIENTE_GERENCIA]: 'En Gerencia General',
            [this.FLUJO_CERRADO]: 'Cerrado'
        };
        return m[etapa] || etapa || '—';
    }

    /** Etapa del flujo (tickets sin flujoEtapa: solo creador/visibles/admin ven el caso). */
    static getFlujoEtapa(ticket) {
        if (!ticket) return this.FLUJO_PENDIENTE_TI;
        if (ticket.flujoEtapa) return ticket.flujoEtapa;
        if (ticket.estado === this.ESTADO_TERMINADO) return this.FLUJO_CERRADO;
        return this.FLUJO_PENDIENTE_TI;
    }

    static ticketTieneFlujoEtapa(ticket) {
        return Boolean(ticket && ticket.flujoEtapa);
    }

    static _sortByFechaDesc(list) {
        return [...list].sort((a, b) => {
            const fa = String(a.fechaCreacion || '');
            const fb = String(b.fechaCreacion || '');
            return fb.localeCompare(fa);
        });
    }

    static async getById(id) {
        try {
            const snapshot = await dbRef.sanctionFollowups.child(id).once('value');
            if (!snapshot.exists()) return null;
            return { id, ...snapshot.val() };
        } catch (e) {
            console.error('SanctionFollowup getById:', e);
            return null;
        }
    }

    static async getTiReview(id) {
        try {
            const snap = await dbRef.sanctionFollowupsTiReview.child(id).once('value');
            if (!snap.exists()) return null;
            return snap.val();
        } catch (e) {
            return null;
        }
    }

    static async getRrhhNotas(id) {
        try {
            const snap = await dbRef.sanctionFollowupsRrhh.child(id).once('value');
            if (!snap.exists()) return null;
            return snap.val();
        } catch (e) {
            return null;
        }
    }

    static async syncVisibilityIndex(ticketId, nuevoMap, anteriorMap) {
        const updates = {};
        const nuevos = Object.keys(nuevoMap || {});
        const viejos = Object.keys(anteriorMap || {});
        for (const uid of viejos) {
            if (!nuevoMap || !nuevoMap[uid]) {
                updates[`sanctionFollowupsIndex/${uid}/${ticketId}`] = null;
            }
        }
        for (const uid of nuevos) {
            if (nuevoMap[uid]) {
                updates[`sanctionFollowupsIndex/${uid}/${ticketId}`] = true;
            }
        }
        if (Object.keys(updates).length === 0) return;
        await db.ref().update(updates);
    }

    static puedeVer(ticket) {
        const user = AuthManager.getUser();
        if (!user || !ticket) return false;
        if (AuthManager.isAdmin()) return true;
        if (ticket.creadoPor === user.id) return true;
        if (user.rol === 'encargado' && ticket.departamento && AuthManager.encargadoGestionaDepartamento(user, ticket.departamento)) {
            return true;
        }
        const vis = ticket.visiblesPara || {};
        if (vis[user.id]) return true;

        if (!this.ticketTieneFlujoEtapa(ticket)) return false;

        const f = ticket.flujoEtapa;
        const d = SANCTION_FOLLOWUP_DEPT;
        if (f === this.FLUJO_PENDIENTE_TI && AuthManager.usuarioEnDepartamento(user, d.TI)) return true;
        if (
            (f === this.FLUJO_PENDIENTE_RRHH || f === this.FLUJO_PENDIENTE_GERENCIA || f === this.FLUJO_CERRADO) &&
            AuthManager.usuarioEnDepartamento(user, d.RRHH)
        ) return true;
        if (
            (f === this.FLUJO_PENDIENTE_GERENCIA || f === this.FLUJO_CERRADO) &&
            AuthManager.usuarioEnDepartamento(user, d.GERENCIA)
        ) return true;
        return false;
    }

    /** Bloque de revisión TI: solo TI y administración. */
    static puedeVerRevisionTi() {
        const user = AuthManager.getUser();
        if (!user) return false;
        if (AuthManager.isAdmin()) return true;
        return AuthManager.usuarioEnDepartamento(user, SANCTION_FOLLOWUP_DEPT.TI);
    }

    static puedeVerNotasRrhhGerencia() {
        const user = AuthManager.getUser();
        if (!user) return false;
        if (AuthManager.isAdmin()) return true;
        return (
            AuthManager.usuarioEnDepartamento(user, SANCTION_FOLLOWUP_DEPT.RRHH) ||
            AuthManager.usuarioEnDepartamento(user, SANCTION_FOLLOWUP_DEPT.GERENCIA)
        );
    }

    static puedeCrear() {
        return Boolean(AuthManager.getUser());
    }

    static puedeEditarCuerpo(ticket) {
        const user = AuthManager.getUser();
        if (!user || !ticket) return false;
        if (AuthManager.isAdmin()) return true;
        if (ticket.creadoPor !== user.id) return false;
        if (!ticket.flujoEtapa) {
            return ticket.estado !== this.ESTADO_TERMINADO;
        }
        return ticket.flujoEtapa === this.FLUJO_PENDIENTE_TI;
    }

    /** Compatibilidad: edición modal completa (admin o autor en etapa TI). */
    static puedeEditar(ticket) {
        return this.puedeEditarCuerpo(ticket);
    }

    static puedeMarcarRevisionTi(ticket) {
        if (!ticket || !this.ticketTieneFlujoEtapa(ticket)) return false;
        if (ticket.flujoEtapa !== this.FLUJO_PENDIENTE_TI) return false;
        const user = AuthManager.getUser();
        if (!user) return false;
        if (AuthManager.isAdmin()) return true;
        return AuthManager.usuarioEnDepartamento(user, SANCTION_FOLLOWUP_DEPT.TI);
    }

    static puedeActuarRrhh(ticket) {
        if (!ticket || !this.ticketTieneFlujoEtapa(ticket)) return false;
        if (ticket.flujoEtapa !== this.FLUJO_PENDIENTE_RRHH) return false;
        const user = AuthManager.getUser();
        if (!user) return false;
        if (AuthManager.isAdmin()) return true;
        return AuthManager.usuarioEnDepartamento(user, SANCTION_FOLLOWUP_DEPT.RRHH);
    }

    static puedeActuarGerencia(ticket) {
        if (!ticket || !this.ticketTieneFlujoEtapa(ticket)) return false;
        if (ticket.flujoEtapa !== this.FLUJO_PENDIENTE_GERENCIA) return false;
        const user = AuthManager.getUser();
        if (!user) return false;
        if (AuthManager.isAdmin()) return true;
        return AuthManager.usuarioEnDepartamento(user, SANCTION_FOLLOWUP_DEPT.GERENCIA);
    }

    static _inferMime(file) {
        const declared = String(file?.type || '').trim();
        if (declared) return declared;
        const name = String(file?.name || '').toLowerCase();
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
        if (name.endsWith('.png')) return 'image/png';
        if (name.endsWith('.gif')) return 'image/gif';
        if (name.endsWith('.webp')) return 'image/webp';
        if (name.endsWith('.heic')) return 'image/heic';
        if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4';
        if (name.endsWith('.webm')) return 'video/webm';
        if (name.endsWith('.mov')) return 'video/quicktime';
        if (name.endsWith('.mp3')) return 'audio/mpeg';
        if (name.endsWith('.wav')) return 'audio/wav';
        if (name.endsWith('.ogg')) return 'audio/ogg';
        if (name.endsWith('.m4a')) return 'audio/mp4';
        if (name.endsWith('.pdf')) return 'application/pdf';
        return '';
    }

    static _mimeAdjuntoPermitido(mime) {
        const m = String(mime || '').toLowerCase();
        if (m.startsWith('image/') || m.startsWith('video/') || m.startsWith('audio/')) return true;
        return m === 'application/pdf';
    }

    static async _subirAdjunto(ticketId, file) {
        const mime = this._inferMime(file);
        if (!this._mimeAdjuntoPermitido(mime)) {
            throw new Error('Solo se permiten imágenes, video, audio o PDF');
        }
        if (file.size > this.MAX_ADJUNTO_BYTES) {
            throw new Error(`Cada archivo debe ser menor a ${PoliticaInternaManager.formatBytes(this.MAX_ADJUNTO_BYTES)}`);
        }
        const user = AuthManager.getUser();
        const adjId = dbRef.sanctionFollowups.child(ticketId).child('adjuntos').push().key;
        const dataBase64 = await PoliticaInternaManager.fileToBase64Data(file);
        const meta = {
            nombreArchivo: file.name || 'adjunto',
            mimeType: mime,
            tamanoBytes: file.size,
            fecha: new Date().toISOString(),
            subidoPor: user.id
        };
        // Metadatos y binario bajo el mismo ticket (hereda lectura del caso).
        await db.ref().update({
            [`sanctionFollowups/${ticketId}/adjuntos/${adjId}`]: meta
        });
        await db.ref().update({
            [`sanctionFollowups/${ticketId}/adjuntoFiles/${adjId}`]: { dataBase64, mimeType: mime }
        });
        return adjId;
    }

    static async addAdjuntos(ticketId, files) {
        const prev = await this.getById(ticketId);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeEditarCuerpo(prev)) throw new Error('Sin permiso para adjuntar archivos en esta etapa');
        const list = Array.from(files || []).filter(Boolean);
        if (list.length === 0) return [];
        const actuales = Object.keys(prev.adjuntos || {}).length;
        if (actuales + list.length > this.MAX_ADJUNTOS_POR_TICKET) {
            throw new Error(`Máximo ${this.MAX_ADJUNTOS_POR_TICKET} archivos por queja`);
        }
        const ids = [];
        for (const file of list) {
            ids.push(await this._subirAdjunto(ticketId, file));
        }
        await dbRef.sanctionFollowups.child(ticketId).update({ fechaActualizacion: new Date().toISOString() });
        return ids;
    }

    static async getAdjuntoBlob(ticketId, adjId) {
        const ticket = await this.getById(ticketId);
        if (!ticket || !this.puedeVer(ticket)) throw new Error('Sin permiso');
        const meta = (ticket.adjuntos || {})[adjId];
        if (!meta) throw new Error('Adjunto no encontrado');
        let snap = await dbRef.sanctionFollowups.child(ticketId).child('adjuntoFiles').child(adjId).once('value');
        if (!snap.exists() && dbRef.sanctionFollowupsAdjuntoFiles) {
            snap = await dbRef.sanctionFollowupsAdjuntoFiles.child(ticketId).child(adjId).once('value');
        }
        if (!snap.exists()) throw new Error('Contenido del adjunto no encontrado');
        const { dataBase64, mimeType } = snap.val();
        const blob = PoliticaInternaManager.base64ToBlob(dataBase64, mimeType || meta.mimeType);
        return { blob, meta, nombreArchivo: meta.nombreArchivo || 'adjunto' };
    }

    static async deleteAdjunto(ticketId, adjId) {
        const prev = await this.getById(ticketId);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeEditarCuerpo(prev)) throw new Error('Sin permiso para eliminar adjuntos');
        const updates = {
            [`sanctionFollowups/${ticketId}/adjuntos/${adjId}`]: null,
            [`sanctionFollowups/${ticketId}/adjuntoFiles/${adjId}`]: null,
            [`sanctionFollowups/${ticketId}/fechaActualizacion`]: new Date().toISOString()
        };
        updates[`sanctionFollowupsAdjuntoFiles/${ticketId}/${adjId}`] = null;
        await db.ref().update(updates);
    }

    static async create({ titulo, texto, visiblesParaIds, archivos }) {
        if (this._createInFlight) {
            throw new Error('Ya se está enviando una queja. Espere un momento.');
        }
        this._createInFlight = true;
        try {
            return await this._createInternal({ titulo, texto, visiblesParaIds, archivos });
        } finally {
            this._createInFlight = false;
        }
    }

    static async _createInternal({ titulo, texto, visiblesParaIds, archivos }) {
        const user = AuthManager.getUser();
        if (!this.puedeCrear()) {
            throw new Error('Debe iniciar sesión para registrar una queja');
        }

        const textoLimpio = String(texto || '').trim();
        if (!textoLimpio) throw new Error('El texto del ticket es obligatorio');

        const puedeCompartir = AuthManager.isAdmin() || user.rol === 'encargado';
        const visiblesPara = {};
        if (puedeCompartir) {
            for (const uid of visiblesParaIds || []) {
                if (uid && uid !== user.id) visiblesPara[uid] = true;
            }
        }

        const newRef = dbRef.sanctionFollowups.push();
        const ticketId = newRef.key;
        const now = new Date().toISOString();
        const ticket = {
            titulo: String(titulo || '').trim() || 'Sin título',
            texto: textoLimpio,
            estado: this.ESTADO_ESPERA,
            flujoEtapa: this.FLUJO_PENDIENTE_TI,
            creadoPor: user.id,
            creadoPorNombre: `${user.nombre} ${user.apellido}`.trim(),
            departamento: user.departamento,
            fechaCreacion: now,
            fechaActualizacion: now,
            visiblesPara
        };

        const updates = {};
        updates[`sanctionFollowups/${ticketId}`] = ticket;
        updates[`sanctionFollowupsByCreator/${user.id}/${ticketId}`] = true;

        // Dos pasos: la cola TI valida creadoPor en sanctionFollowups y en un
        // update multi-ruta ese registro aún no existe al evaluar las reglas.
        await db.ref().update(updates);
        await db.ref().update({
            [`sanctionFollowupsQueueTi/${ticketId}`]: true
        });
        await db.ref().update({
            [`sanctionFollowupsByDepartment/${user.departamento}/${ticketId}`]: true
        });
        await this.syncVisibilityIndex(ticketId, visiblesPara, null);
        const fileList = Array.from(archivos || []).filter(Boolean);
        if (fileList.length) {
            try {
                await this.addAdjuntos(ticketId, fileList);
            } catch (err) {
                console.error('Adjuntos queja:', err);
                throw new Error(
                    (err && err.message) ||
                        'La queja se guardó pero no se pudieron subir los archivos. Vuelva a abrirla y adjúntelos desde Editar.'
                );
            }
        }
        return { id: ticketId, ...ticket };
    }

    static async updateTicket(id, { titulo, texto, visiblesParaIds, estado }) {
        const prev = await this.getById(id);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeEditar(prev)) throw new Error('Sin permiso para editar');

        const patch = { fechaActualizacion: new Date().toISOString() };

        if (titulo !== undefined) patch.titulo = String(titulo || '').trim() || 'Sin título';
        if (texto !== undefined) {
            const t = String(texto || '').trim();
            if (!t) throw new Error('El texto no puede quedar vacío');
            patch.texto = t;
        }

        if (estado !== undefined && AuthManager.isAdmin()) {
            if (estado !== this.ESTADO_ESPERA && estado !== this.ESTADO_TERMINADO) {
                throw new Error('Estado inválido');
            }
            patch.estado = estado;
            if (estado === this.ESTADO_TERMINADO) {
                patch.fechaCierre = new Date().toISOString();
            } else {
                patch.fechaCierre = null;
            }
        }

        const actor = AuthManager.getUser();
        const puedeCompartir = AuthManager.isAdmin() || actor?.rol === 'encargado';
        let visiblesPara = prev.visiblesPara || {};
        if (visiblesParaIds !== undefined && puedeCompartir) {
            visiblesPara = {};
            for (const uid of visiblesParaIds || []) {
                if (uid && uid !== prev.creadoPor) visiblesPara[uid] = true;
            }
            patch.visiblesPara = visiblesPara;
        }

        await dbRef.sanctionFollowups.child(id).update(patch);

        if (visiblesParaIds !== undefined) {
            await this.syncVisibilityIndex(id, visiblesPara, prev.visiblesPara || {});
        }

        return this.getById(id);
    }

    /** TI marca revisión (solo visible para TI/admin) y envía a RRHH. */
    static async tiCompletarRevision(id, notas) {
        const prev = await this.getById(id);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeMarcarRevisionTi(prev)) throw new Error('Sin permiso para esta acción');
        if (this.getFlujoEtapa(prev) !== this.FLUJO_PENDIENTE_TI) throw new Error('El ticket ya no está en revisión TI');

        const user = AuthManager.getUser();
        const now = new Date().toISOString();
        const n = String(notas || '').trim();

        const tiReview = {
            revisado: true,
            notas: n,
            fecha: now,
            revisadoPor: user.id
        };

        // Revisión TI primero (regla exige flujoEtapa pendiente_ti); luego avance de etapa y colas.
        await db.ref().update({
            [`sanctionFollowupsTiReview/${id}`]: tiReview,
            [`sanctionFollowups/${id}/fechaActualizacion`]: now
        });
        await db.ref().update({
            [`sanctionFollowups/${id}/flujoEtapa`]: this.FLUJO_PENDIENTE_RRHH,
            [`sanctionFollowupsQueueTi/${id}`]: null,
            [`sanctionFollowupsQueueRrhh/${id}`]: true
        });
        return this.getById(id);
    }

    /** RRHH guarda o actualiza anotaciones (mientras el ticket está en RRHH). */
    static async rrhhGuardarAnotaciones(id, anotaciones) {
        const prev = await this.getById(id);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeActuarRrhh(prev)) throw new Error('Sin permiso para anotaciones de RRHH');

        const user = AuthManager.getUser();
        const now = new Date().toISOString();
        const txt = String(anotaciones || '').trim();
        if (!txt) throw new Error('Las anotaciones no pueden quedar vacías');

        await dbRef.sanctionFollowupsRrhh.child(id).set({
            anotaciones: txt,
            fecha: now,
            anotadoPor: user.id
        });
        await dbRef.sanctionFollowups.child(id).update({ fechaActualizacion: now });
        return true;
    }

    /** RRHH envía el caso a Gerencia General. */
    static async rrhhEnviarAGerencia(id) {
        const prev = await this.getById(id);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeActuarRrhh(prev)) throw new Error('Sin permiso');

        const rr = await this.getRrhhNotas(id);
        if (!rr || !String(rr.anotaciones || '').trim()) {
            throw new Error('Debe guardar anotaciones de RRHH antes de enviar a Gerencia');
        }

        const now = new Date().toISOString();
        const updates = {};
        updates[`sanctionFollowups/${id}/flujoEtapa`] = this.FLUJO_PENDIENTE_GERENCIA;
        updates[`sanctionFollowups/${id}/fechaActualizacion`] = now;
        updates[`sanctionFollowupsQueueRrhh/${id}`] = null;
        updates[`sanctionFollowupsQueueGg/${id}`] = true;

        await db.ref().update(updates);
        return this.getById(id);
    }

    /** Gerencia cierra el expediente (aprobación / cierre del flujo). */
    static async gerenciaCerrar(id, { comentario, aprobado }) {
        const prev = await this.getById(id);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeActuarGerencia(prev)) throw new Error('Sin permiso para cerrar desde Gerencia');

        const user = AuthManager.getUser();
        const now = new Date().toISOString();
        const com = String(comentario || '').trim();

        const updates = {};
        updates[`sanctionFollowups/${id}/flujoEtapa`] = this.FLUJO_CERRADO;
        updates[`sanctionFollowups/${id}/estado`] = this.ESTADO_TERMINADO;
        updates[`sanctionFollowups/${id}/fechaActualizacion`] = now;
        updates[`sanctionFollowups/${id}/fechaCierre`] = now;
        updates[`sanctionFollowups/${id}/gerenciaAprobado`] = Boolean(aprobado);
        updates[`sanctionFollowups/${id}/gerenciaComentario`] = com;
        updates[`sanctionFollowups/${id}/gerenciaPor`] = user.id;
        updates[`sanctionFollowups/${id}/gerenciaFecha`] = now;
        updates[`sanctionFollowupsQueueGg/${id}`] = null;

        await db.ref().update(updates);
        return this.getById(id);
    }

    static async deleteTicket(id) {
        const prev = await this.getById(id);
        if (!prev) throw new Error('Seguimiento no encontrado');
        const actor = AuthManager.getUser();
        if (!AuthManager.isAdmin() && prev.creadoPor !== actor?.id) {
            throw new Error('Sin permiso para eliminar');
        }
        if (!AuthManager.isAdmin() && this.getFlujoEtapa(prev) !== this.FLUJO_PENDIENTE_TI) {
            throw new Error('Solo se puede eliminar antes de que TI revise el caso');
        }

        await this.syncVisibilityIndex(id, {}, prev.visiblesPara || {});
        const updates = {};
        // Borrar el ticket entero (incluye adjuntos/adjuntoFiles). No mezclar rutas hijas
        // en el mismo update: Firebase rechaza ancestro + descendiente a la vez.
        updates[`sanctionFollowups/${id}`] = null;
        updates[`sanctionFollowupsByCreator/${prev.creadoPor}/${id}`] = null;
        updates[`sanctionFollowupsQueueTi/${id}`] = null;
        if (prev.departamento) {
            updates[`sanctionFollowupsByDepartment/${prev.departamento}/${id}`] = null;
        }
        if (AuthManager.isAdmin()) {
            updates[`sanctionFollowupsTiReview/${id}`] = null;
            updates[`sanctionFollowupsRrhh/${id}`] = null;
            updates[`sanctionFollowupsQueueRrhh/${id}`] = null;
            updates[`sanctionFollowupsQueueGg/${id}`] = null;
        }
        await db.ref().update(updates);
        // Árbol legacy de adjuntos (si existió)
        await db.ref(`sanctionFollowupsAdjuntoFiles/${id}`).remove().catch(() => {});
        return true;
    }

    static async listForManager() {
        const user = AuthManager.getUser();
        if (!user) return [];

        try {
            if (AuthManager.isAdmin()) {
                const snapshot = await dbRef.sanctionFollowups.once('value');
                return this._sortByFechaDesc(snapshotToArray(snapshot));
            }

            const idSet = new Set();

            if (user.rol === 'encargado') {
                const depts = AuthManager.getDepartamentosEncargado(user);
                for (const dep of depts) {
                    try {
                        const depSnap = await dbRef.sanctionFollowupsByDepartment.child(dep).once('value');
                        Object.keys(depSnap.val() || {}).forEach((tid) => idSet.add(tid));
                    } catch (e) {
                        console.warn('listForManager dept index:', dep, e);
                    }
                }
            }

            const idxSnap = await dbRef.sanctionFollowupsByCreator.child(user.id).once('value');
            Object.keys(idxSnap.val() || {}).forEach((tid) => idSet.add(tid));

            const tickets = [];
            for (const tid of idSet) {
                const t = await this.getById(tid);
                if (t && this.puedeVer(t) && (t.estado !== undefined || t.flujoEtapa)) tickets.push(t);
            }
            const byId = new Map();
            for (const t of tickets) {
                if (t && t.id) byId.set(t.id, t);
            }
            return this._sortByFechaDesc([...byId.values()]);
        } catch (e) {
            console.error('listForManager:', e);
            return [];
        }
    }

    static async _listFromQueue(ref) {
        const snap = await ref.once('value');
        const ids = Object.keys(snap.val() || {});
        const tickets = [];
        for (const id of ids) {
            const t = await this.getById(id);
            if (t && SanctionFollowupManager.puedeVer(t)) tickets.push(t);
        }
        return this._sortByFechaDesc(tickets);
    }

    static async listColaTi() {
        return this._listFromQueue(dbRef.sanctionFollowupsQueueTi);
    }

    static async listColaRrhh() {
        return this._listFromQueue(dbRef.sanctionFollowupsQueueRrhh);
    }

    static async listColaGerencia() {
        return this._listFromQueue(dbRef.sanctionFollowupsQueueGg);
    }

    static async listSharedWithMe() {
        const user = AuthManager.getUser();
        if (!user) return [];

        try {
            const idxSnap = await dbRef.sanctionFollowupsIndex.child(user.id).once('value');
            const ids = Object.keys(idxSnap.val() || {});
            const tickets = [];
            for (const id of ids) {
                const t = await this.getById(id);
                if (t && (t.estado !== undefined || t.flujoEtapa) && this.puedeVer(t)) tickets.push(t);
            }
            return this._sortByFechaDesc(tickets);
        } catch (e) {
            console.error('listSharedWithMe:', e);
            return [];
        }
    }
}
