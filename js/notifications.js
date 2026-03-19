// ============================================================
// NOTIFICATIONS.JS - Sistema de Notificaciones con Firebase RTDB
// Veterinaria San Martín de Porres
// ============================================================

class NotificationManager {
    static _listener = null;
    static _onUpdateCallback = null;

    // Obtener todas las notificaciones de un usuario
    static async getByUser(userId) {
        try {
            const snapshot = await dbRef.notifications
                .orderByChild('destinatario')
                .equalTo(userId)
                .once('value');
            return snapshotToArray(snapshot)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        } catch (error) {
            console.error('Error obteniendo notificaciones:', error);
            return [];
        }
    }

    // Obtener no leídas
    static async getUnread(userId) {
        const all = await this.getByUser(userId);
        return all.filter(n => !n.leida);
    }

    // Obtener conteo de no leídas
    static async getUnreadCount(userId) {
        const unread = await this.getUnread(userId);
        return unread.length;
    }

    // Crear notificación
    static async create(notifData) {
        try {
            const newNotifRef = dbRef.notifications.push();
            const newNotif = {
                tipo: notifData.tipo,
                titulo: notifData.titulo,
                mensaje: notifData.mensaje,
                destinatario: notifData.destinatario,
                referencia: notifData.referencia || null,
                referenciaType: notifData.referenciaType || null,
                fecha: new Date().toISOString(),
                leida: false
            };
            await newNotifRef.set(newNotif);
            return { id: newNotifRef.key, ...newNotif };
        } catch (error) {
            console.error('Error creando notificación:', error);
            return null;
        }
    }

    // Marcar como leída
    static async markAsRead(notifId) {
        try {
            await dbRef.notifications.child(notifId).update({ leida: true });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Marcar todas como leídas
    static async markAllAsRead(userId) {
        try {
            const notifications = await this.getByUser(userId);
            const updates = {};
            notifications.forEach(n => {
                if (!n.leida) {
                    updates[`${n.id}/leida`] = true;
                }
            });
            if (Object.keys(updates).length > 0) {
                await dbRef.notifications.update(updates);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Eliminar notificación
    static async delete(notifId) {
        try {
            await dbRef.notifications.child(notifId).remove();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Escuchar notificaciones en tiempo real para un usuario
    static listenForUser(userId, callback) {
        this.stopListening();
        this._onUpdateCallback = callback;

        this._listener = dbRef.notifications
            .orderByChild('destinatario')
            .equalTo(userId);

        this._listener.on('value', (snapshot) => {
            const notifications = snapshotToArray(snapshot)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            const unread = notifications.filter(n => !n.leida).length;
            if (this._onUpdateCallback) {
                this._onUpdateCallback(notifications, unread);
            }
        });
    }

    // Dejar de escuchar
    static stopListening() {
        if (this._listener) {
            this._listener.off();
            this._listener = null;
        }
    }

    static getIcon(tipo) {
        const icons = {
            'firma_requerida': 'fas fa-signature',
            'documento_firmado': 'fas fa-check-circle',
            'solicitud_nueva': 'fas fa-bell',
            'solicitud_aprobada': 'fas fa-thumbs-up',
            'solicitud_rechazada': 'fas fa-thumbs-down',
            'general': 'fas fa-info-circle'
        };
        return icons[tipo] || icons['general'];
    }

    static getColor(tipo) {
        const colors = {
            'firma_requerida': '#1565c0',
            'documento_firmado': '#2e7d32',
            'solicitud_nueva': '#f57f17',
            'solicitud_aprobada': '#2e7d32',
            'solicitud_rechazada': '#c62828',
            'general': '#546e7a'
        };
        return colors[tipo] || colors['general'];
    }
}
