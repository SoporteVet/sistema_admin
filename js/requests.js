// ============================================================
// REQUESTS.JS - Gestión de Solicitudes con Firebase RTDB
// Veterinaria San Martín de Porres
// ============================================================

class RequestManager {
    static isEstadoPendienteEmpleado(estado) {
        return estado === 'pendiente' || estado === 'pendiente_ti' || estado === 'pendiente_gerencia';
    }

    static esHorasExtraordinarias(req) {
        return req && req.tipo === SOLICITUD_HORAS_EXTRA_CONFIG.tipo;
    }

    /** Quienes deben ver la tarjeta en "Pendientes" al gestionar solicitudes */
    static necesitaMiAprobacion(req, user) {
        if (!req || !user) return false;
        if (req.estado === 'aprobada' || req.estado === 'rechazada') return false;
        if (user.rol === 'admin') {
            return this.isEstadoPendienteEmpleado(req.estado);
        }
        if (user.rol !== 'encargado') return false;
        if (this.esHorasExtraordinarias(req)) {
            if (req.estado === 'pendiente_ti') return user.departamento === SOLICITUD_HORAS_EXTRA_CONFIG.deptoTI;
            if (req.estado === 'pendiente_gerencia') return user.departamento === SOLICITUD_HORAS_EXTRA_CONFIG.deptoGerencia;
            return false;
        }
        return req.estado === 'pendiente' && req.departamento === user.departamento;
    }

    /** Solicitudes que el usuario (encargado/admin) debe atender en el tab Pendientes */
    static async getPendingActionsForUser(user) {
        if (!user) return [];
        const all = await this.getAll();
        if (user.rol === 'admin') {
            return all.filter(r => this.isEstadoPendienteEmpleado(r.estado));
        }
        if (user.rol !== 'encargado') return [];
        return all.filter(r => this.necesitaMiAprobacion(r, user));
    }

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
            const esFlujoHe = requestData.tipo === SOLICITUD_HORAS_EXTRA_CONFIG.tipo;
            const newRequest = {
                tipo: requestData.tipo,
                tipoNombre: TIPOS_SOLICITUD[requestData.tipo]?.nombre || requestData.tipo,
                solicitante: user.id,
                solicitanteNombre: user.nombre + ' ' + user.apellido,
                departamento: user.departamento,
                estado: esFlujoHe ? 'pendiente_ti' : 'pendiente',
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

            let encargados = await AuthManager.getEncargadosDepartamento(user.departamento);
            if (esFlujoHe) {
                const encTi = await AuthManager.getEncargadosDepartamento(SOLICITUD_HORAS_EXTRA_CONFIG.deptoTI);
                encargados = encTi;
            }

            const allUsers = await AuthManager.getAllUsers();
            const admins = allUsers.filter(u => u.rol === 'admin' && u.activo);

            const notificar = [...encargados, ...admins].filter((u, i, arr) =>
                arr.findIndex(x => x.id === u.id) === i && u.id !== user.id
            );

            const mensajeNueva = esFlujoHe
                ? `${user.nombre} ${user.apellido} envió formulario de horas extraordinarias (pendiente revisión TI).`
                : `${user.nombre} ${user.apellido} ha solicitado: ${newRequest.tipoNombre}`;

            const notifPromises = notificar.map(enc =>
                NotificationManager.create({
                    tipo: 'solicitud_nueva',
                    titulo: esFlujoHe ? 'Horas extraordinarias — revisión TI' : 'Nueva solicitud',
                    mensaje: mensajeNueva,
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

    // Revisión TI (horas extraordinarias): pasa a pendiente de Gerencia General
    static async approveRevisionTI(reqId, comentario = '', firmaTI = null) {
        try {
            const user = AuthManager.getUser();
            const req = await this.getById(reqId);
            if (!req || req.tipo !== SOLICITUD_HORAS_EXTRA_CONFIG.tipo || req.estado !== 'pendiente_ti') return null;

            const revisionTI = {
                userId: user.id,
                nombre: user.nombre + ' ' + user.apellido,
                fecha: new Date().toISOString(),
                comentario: comentario || '',
                firmaDibujo: firmaTI?.firmaDibujo || null
            };

            const updates = {
                estado: 'pendiente_gerencia',
                revisionTI
            };

            await dbRef.requests.child(reqId).update(updates);

            const encGe = await AuthManager.getEncargadosDepartamento(SOLICITUD_HORAS_EXTRA_CONFIG.deptoGerencia);
            const allUsers = await AuthManager.getAllUsers();
            const admins = allUsers.filter(u => u.rol === 'admin' && u.activo);
            const notificar = [...encGe, ...admins].filter((u, i, arr) =>
                arr.findIndex(x => x.id === u.id) === i && u.id !== user.id
            );

            await Promise.all(notificar.map(enc =>
                NotificationManager.create({
                    tipo: 'solicitud_nueva',
                    titulo: 'Horas extraordinarias — resolución Gerencia',
                    mensaje: `TI certificó la solicitud de ${req.solicitanteNombre}. Pendiente de Gerencia General.`,
                    destinatario: enc.id,
                    referencia: reqId,
                    referenciaType: 'request'
                })
            ));

            await NotificationManager.create({
                tipo: 'solicitud_nueva',
                titulo: 'Solicitud en Gerencia',
                mensaje: `Su solicitud de horas extraordinarias fue revisada por TI y está pendiente de resolución de Gerencia General.`,
                destinatario: req.solicitante,
                referencia: reqId,
                referenciaType: 'request'
            });

            return { ...req, ...updates };
        } catch (error) {
            console.error('Error en aprobación TI:', error);
            return null;
        }
    }

    // Aprobación final Gerencia (u otras solicitudes en un solo paso)
    static async approve(reqId, justificacion = '', firmaAdmin = null) {
        try {
            const user = AuthManager.getUser();
            const req = await this.getById(reqId);
            if (!req) return null;

            if (req.tipo === SOLICITUD_HORAS_EXTRA_CONFIG.tipo) {
                if (req.estado !== 'pendiente_gerencia') return null;
            } else if (req.estado !== 'pendiente') {
                return null;
            }

            const updates = {
                estado: 'aprobada',
                respondidoPor: user.id,
                respondidoPorNombre: user.nombre + ' ' + user.apellido,
                fechaRespuesta: new Date().toISOString(),
                justificacion: justificacion
            };

            if (req.tipo === SOLICITUD_HORAS_EXTRA_CONFIG.tipo) {
                updates.resolucionGerencia = {
                    decision: 'aprobada',
                    userId: user.id,
                    nombre: user.nombre + ' ' + user.apellido,
                    fecha: new Date().toISOString()
                };
            }

            if (firmaAdmin) updates.firmaAdmin = firmaAdmin;

            await dbRef.requests.child(reqId).update(updates);

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

            if (this.esHorasExtraordinarias(req)) {
                updates.resolucionGerencia = {
                    decision: 'rechazada',
                    userId: user.id,
                    nombre: user.nombre + ' ' + user.apellido,
                    fecha: new Date().toISOString(),
                    etapa: req.estado === 'pendiente_ti' ? 'ti' : 'gerencia'
                };
            }

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
            pendientes: all.filter(r => this.isEstadoPendienteEmpleado(r.estado)).length,
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
