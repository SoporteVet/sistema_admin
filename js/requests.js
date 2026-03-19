// ============================================================
// REQUESTS.JS - Gestión de Solicitudes con Firebase RTDB
// Veterinaria San Martín de Porres
// ============================================================

class RequestManager {
    // Obtener todas las solicitudes
    static async getAll() {
        try {
            const snapshot = await dbRef.requests.once('value');
            return snapshotToArray(snapshot);
        } catch (error) {
            console.error('Error obteniendo solicitudes:', error);
            return [];
        }
    }

    // Obtener solicitud por ID
    static async getById(reqId) {
        try {
            const snapshot = await dbRef.requests.child(reqId).once('value');
            if (snapshot.exists()) {
                return { id: reqId, ...snapshot.val() };
            }
            return null;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }

    // Obtener solicitudes por usuario
    static async getByUser(userId) {
        try {
            const snapshot = await dbRef.requests.orderByChild('solicitante').equalTo(userId).once('value');
            return snapshotToArray(snapshot);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    // Obtener solicitudes por departamento
    static async getByDepartment(depId) {
        try {
            const snapshot = await dbRef.requests.orderByChild('departamento').equalTo(depId).once('value');
            return snapshotToArray(snapshot);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    // Obtener solicitudes pendientes
    static async getPending() {
        try {
            const snapshot = await dbRef.requests.orderByChild('estado').equalTo('pendiente').once('value');
            return snapshotToArray(snapshot);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    // Obtener pendientes por departamento
    static async getPendingByDepartment(depId) {
        try {
            const all = await this.getByDepartment(depId);
            return all.filter(r => r.estado === 'pendiente');
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    // Crear solicitud
    static async create(requestData) {
        try {
            const user = AuthManager.getUser();

            const newReqRef = dbRef.requests.push();
            const newRequest = {
                tipo: requestData.tipo,
                tipoNombre: TIPOS_SOLICITUD[requestData.tipo]?.nombre || requestData.tipo,
                solicitante: user.id,
                solicitanteNombre: user.nombre + ' ' + user.apellido,
                departamento: user.departamento,
                estado: 'pendiente',
                fechaSolicitud: new Date().toISOString(),
                datos: requestData.datos || {},
                observaciones: requestData.observaciones || '',
                firma: requestData.firma || null,
                respuesta: null,
                respondidoPor: null,
                respondidoPorNombre: null,
                fechaRespuesta: null,
                justificacion: ''
            };

            await newReqRef.set(newRequest);

            // Notificar a encargados del departamento y admins
            const encargados = await AuthManager.getEncargadosDepartamento(user.departamento);
            const allUsers = await AuthManager.getAllUsers();
            const admins = allUsers.filter(u => u.rol === 'admin' && u.activo);

            const notificar = [...encargados, ...admins].filter((u, i, arr) =>
                arr.findIndex(x => x.id === u.id) === i && u.id !== user.id
            );

            const notifPromises = notificar.map(enc =>
                NotificationManager.create({
                    tipo: 'solicitud_nueva',
                    titulo: 'Nueva solicitud',
                    mensaje: `${user.nombre} ${user.apellido} ha solicitado: ${newRequest.tipoNombre}`,
                    destinatario: enc.id,
                    referencia: newReqRef.key,
                    referenciaType: 'request'
                })
            );
            await Promise.all(notifPromises);

            return { id: newReqRef.key, ...newRequest };
        } catch (error) {
            console.error('Error creando solicitud:', error);
            throw error;
        }
    }

    // Aprobar solicitud
    static async approve(reqId, justificacion = '', firmaAdmin = null) {
        try {
            const user = AuthManager.getUser();
            const req = await this.getById(reqId);
            if (!req) return null;

            const updates = {
                estado: 'aprobada',
                respondidoPor: user.id,
                respondidoPorNombre: user.nombre + ' ' + user.apellido,
                fechaRespuesta: new Date().toISOString(),
                justificacion: justificacion
            };

            if (firmaAdmin) updates.firmaAdmin = firmaAdmin;

            await dbRef.requests.child(reqId).update(updates);

            // Notificar al solicitante
            await NotificationManager.create({
                tipo: 'solicitud_aprobada',
                titulo: 'Solicitud aprobada',
                mensaje: `Su solicitud de ${req.tipoNombre} ha sido aprobada`,
                destinatario: req.solicitante,
                referencia: reqId,
                referenciaType: 'request'
            });

            return { ...req, ...updates };
        } catch (error) {
            console.error('Error aprobando solicitud:', error);
            return null;
        }
    }

    // Rechazar solicitud
    static async reject(reqId, justificacion) {
        try {
            const user = AuthManager.getUser();
            const req = await this.getById(reqId);
            if (!req) return null;

            const updates = {
                estado: 'rechazada',
                respondidoPor: user.id,
                respondidoPorNombre: user.nombre + ' ' + user.apellido,
                fechaRespuesta: new Date().toISOString(),
                justificacion: justificacion
            };

            await dbRef.requests.child(reqId).update(updates);

            // Notificar al solicitante
            await NotificationManager.create({
                tipo: 'solicitud_rechazada',
                titulo: 'Solicitud rechazada',
                mensaje: `Su solicitud de ${req.tipoNombre} ha sido rechazada. Motivo: ${justificacion}`,
                destinatario: req.solicitante,
                referencia: reqId,
                referenciaType: 'request'
            });

            return { ...req, ...updates };
        } catch (error) {
            console.error('Error rechazando solicitud:', error);
            return null;
        }
    }

    // Estadísticas
    static async getStats() {
        const all = await this.getAll();
        return {
            total: all.length,
            pendientes: all.filter(r => r.estado === 'pendiente').length,
            aprobadas: all.filter(r => r.estado === 'aprobada').length,
            rechazadas: all.filter(r => r.estado === 'rechazada').length
        };
    }

    // Calcular días entre fechas
    static calcDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 0;
    }
}
