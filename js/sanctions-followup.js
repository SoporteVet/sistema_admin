// ============================================================
// SANCTIONS-FOLLOWUP.JS — Seguimiento de sanciones o quejas (tickets)
// Veterinaria San Martín de Porres
// Estados: en_espera | terminado
// ============================================================

class SanctionFollowupManager {
    static ESTADO_ESPERA = 'en_espera';
    static ESTADO_TERMINADO = 'terminado';

    static etiquetaEstado(estado) {
        if (estado === this.ESTADO_TERMINADO) return 'Terminado';
        return 'En espera';
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

    /** Sincroniza índice por usuario para que los invitados puedan listar sus tickets sin leer toda la colección */
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

    static puedeEditar(ticket) {
        const user = AuthManager.getUser();
        if (!user || !ticket) return false;
        if (AuthManager.isAdmin()) return true;
        return ticket.creadoPor === user.id && AuthManager.isEncargado();
    }

    static puedeVer(ticket) {
        const user = AuthManager.getUser();
        if (!user || !ticket) return false;
        if (AuthManager.isAdmin()) return true;
        if (ticket.creadoPor === user.id) return true;
        const vis = ticket.visiblesPara || {};
        return Boolean(vis[user.id]);
    }

    static async create({ titulo, texto, visiblesParaIds }) {
        const user = AuthManager.getUser();
        if (!user || (!AuthManager.isAdmin() && user.rol !== 'encargado')) {
            throw new Error('Sin permiso para crear seguimientos');
        }

        const textoLimpio = String(texto || '').trim();
        if (!textoLimpio) {
            throw new Error('El texto del ticket es obligatorio');
        }

        const visiblesPara = {};
        for (const uid of visiblesParaIds || []) {
            if (uid && uid !== user.id) visiblesPara[uid] = true;
        }

        const newRef = dbRef.sanctionFollowups.push();
        const ticketId = newRef.key;
        const ticket = {
            titulo: String(titulo || '').trim() || 'Sin título',
            texto: textoLimpio,
            estado: this.ESTADO_ESPERA,
            creadoPor: user.id,
            creadoPorNombre: `${user.nombre} ${user.apellido}`.trim(),
            departamento: user.departamento,
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString(),
            visiblesPara
        };

        await newRef.set(ticket);
        try {
            await dbRef.sanctionFollowupsByCreator.child(user.id).child(ticketId).set(true);
        } catch (e) {
            try {
                await newRef.remove();
            } catch (_) { /* noop */ }
            throw e;
        }
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

        if (estado !== undefined) {
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

    static async deleteTicket(id) {
        const prev = await this.getById(id);
        if (!prev) throw new Error('Seguimiento no encontrado');
        if (!this.puedeEditar(prev)) throw new Error('Sin permiso para eliminar');

        await this.syncVisibilityIndex(id, {}, prev.visiblesPara || {});
        try {
            await dbRef.sanctionFollowupsByCreator.child(prev.creadoPor).child(id).remove();
        } catch (e) {
            console.warn('sanctionFollowupsByCreator cleanup:', e);
        }
        await dbRef.sanctionFollowups.child(id).remove();
        return true;
    }

    /** Lista para gestión: administrador ve todo; encargado solo lo que él creó */
    static async listForManager() {
        const user = AuthManager.getUser();
        if (!user) return [];

        try {
            if (AuthManager.isAdmin()) {
                const snapshot = await dbRef.sanctionFollowups.once('value');
                return this._sortByFechaDesc(snapshotToArray(snapshot));
            }

            /** Índice por creador: evita queries orderByChild que RTDB suele denegar con reglas por ticket. */
            const idxSnap = await dbRef.sanctionFollowupsByCreator.child(user.id).once('value');
            const ids = Object.keys(idxSnap.val() || {});
            const tickets = [];
            for (const tid of ids) {
                const t = await this.getById(tid);
                if (t && t.estado !== undefined) tickets.push(t);
            }
            return this._sortByFechaDesc(tickets);
        } catch (e) {
            console.error('listForManager:', e);
            return [];
        }
    }

    /** Tickets donde el usuario fue incluido como observador */
    static async listSharedWithMe() {
        const user = AuthManager.getUser();
        if (!user) return [];

        try {
            const idxSnap = await dbRef.sanctionFollowupsIndex.child(user.id).once('value');
            const ids = Object.keys(idxSnap.val() || {});
            const tickets = [];
            for (const id of ids) {
                const t = await this.getById(id);
                if (t && t.estado !== undefined) tickets.push(t);
            }
            return this._sortByFechaDesc(tickets);
        } catch (e) {
            console.error('listSharedWithMe:', e);
            return [];
        }
    }
}
