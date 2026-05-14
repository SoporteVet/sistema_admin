// ============================================================
// SANCTIONS-FOLLOWUP.JS — Seguimiento de sanciones o quejas (tickets)
// Veterinaria San Martín de Porres
// Flujo: Encargado crea → TI (revisión privada) → RRHH (anotaciones) → Gerencia (cierre)
// ============================================================

class SanctionFollowupManager {
    static ESTADO_ESPERA = 'en_espera';
    static ESTADO_TERMINADO = 'terminado';

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

    static puedeEditarCuerpo(ticket) {
        const user = AuthManager.getUser();
        if (!user || !ticket) return false;
        if (AuthManager.isAdmin()) return true;
        if (ticket.creadoPor !== user.id || user.rol !== 'encargado') return false;
        if (!ticket.flujoEtapa) {
            return ticket.estado !== this.ESTADO_TERMINADO;
        }
        return ticket.flujoEtapa === this.FLUJO_PENDIENTE_TI;
    }

    /** Compatibilidad: edición modal completa (admin o encargado en etapa TI). */
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

    static async create({ titulo, texto, visiblesParaIds }) {
        const user = AuthManager.getUser();
        if (!user || (!AuthManager.isAdmin() && user.rol !== 'encargado')) {
            throw new Error('Sin permiso para crear seguimientos');
        }

        const textoLimpio = String(texto || '').trim();
        if (!textoLimpio) throw new Error('El texto del ticket es obligatorio');

        const visiblesPara = {};
        for (const uid of visiblesParaIds || []) {
            if (uid && uid !== user.id) visiblesPara[uid] = true;
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
        updates[`sanctionFollowupsQueueTi/${ticketId}`] = true;

        await db.ref().update(updates);
        await this.syncVisibilityIndex(ticketId, visiblesPara, null);
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

        let visiblesPara = prev.visiblesPara || {};
        if (visiblesParaIds !== undefined) {
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

        const updates = {};
        updates[`sanctionFollowupsTiReview/${id}`] = {
            revisado: true,
            notas: n,
            fecha: now,
            revisadoPor: user.id
        };
        updates[`sanctionFollowups/${id}/flujoEtapa`] = this.FLUJO_PENDIENTE_RRHH;
        updates[`sanctionFollowups/${id}/fechaActualizacion`] = now;
        updates[`sanctionFollowupsQueueTi/${id}`] = null;
        updates[`sanctionFollowupsQueueRrhh/${id}`] = true;

        await db.ref().update(updates);
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
        if (!AuthManager.isAdmin() && !(prev.creadoPor === AuthManager.getUser()?.id && AuthManager.isEncargado())) {
            throw new Error('Sin permiso para eliminar');
        }
        if (!AuthManager.isAdmin() && this.getFlujoEtapa(prev) !== this.FLUJO_PENDIENTE_TI) {
            throw new Error('Solo se puede eliminar antes de que TI revise el caso');
        }

        await this.syncVisibilityIndex(id, {}, prev.visiblesPara || {});
        const updates = {};
        updates[`sanctionFollowups/${id}`] = null;
        updates[`sanctionFollowupsByCreator/${prev.creadoPor}/${id}`] = null;
        updates[`sanctionFollowupsTiReview/${id}`] = null;
        updates[`sanctionFollowupsRrhh/${id}`] = null;
        updates[`sanctionFollowupsQueueTi/${id}`] = null;
        updates[`sanctionFollowupsQueueRrhh/${id}`] = null;
        updates[`sanctionFollowupsQueueGg/${id}`] = null;
        await db.ref().update(updates);
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

            const idxSnap = await dbRef.sanctionFollowupsByCreator.child(user.id).once('value');
            const ids = Object.keys(idxSnap.val() || {});
            const tickets = [];
            for (const tid of ids) {
                const t = await this.getById(tid);
                if (t && (t.estado !== undefined || t.flujoEtapa)) tickets.push(t);
            }
            return this._sortByFechaDesc(tickets);
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
