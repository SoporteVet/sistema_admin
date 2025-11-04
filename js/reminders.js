/**
 * Reminders System
 * Notifications and reminders for pending tasks
 */

import db from './database.js';
import auth from './auth.js';
import { showNotification } from './notifications.js';

class Reminders {
    constructor() {
        this.init();
    }

    async init() {
        // Check reminders every 5 minutes
        this.checkReminders();
        setInterval(() => this.checkReminders(), 5 * 60 * 1000);
    }

    async checkReminders() {
        if (!auth.isAuthenticated()) return;

        const user = auth.getCurrentUser();
        if (!user) return;

        // Check for pending solicitudes that need attention
        if (auth.isAdmin()) {
            await this.checkAdminReminders();
        }

        await this.checkUserReminders(user);
    }

    async checkAdminReminders() {
        const solicitudes = await db.getAll('solicitudes');
        const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
        
        if (pendientes.length > 0) {
            const lastReminder = localStorage.getItem('last-admin-reminder');
            const now = Date.now();
            
            // Show reminder if more than 1 hour has passed
            if (!lastReminder || (now - parseInt(lastReminder)) > 60 * 60 * 1000) {
                if (pendientes.length === 1) {
                    showNotification(`Tienes 1 solicitud pendiente de revisión`, 'info', 5000);
                } else {
                    showNotification(`Tienes ${pendientes.length} solicitudes pendientes de revisión`, 'info', 5000);
                }
                localStorage.setItem('last-admin-reminder', now.toString());
            }
        }
    }

    async checkUserReminders(user) {
        const solicitudes = await db.getAll('solicitudes');
        const userSolicitudes = solicitudes.filter(s => s.usuarioId === user.id);
        
        // Check for approved solicitudes
        const aprobadas = userSolicitudes.filter(s => 
            s.estado === 'aprobada' && 
            s.fechaActualizacion &&
            new Date(s.fechaActualizacion) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        );

        aprobadas.forEach(solicitud => {
            const reminderKey = `reminder-aprobada-${solicitud.id}`;
            if (!localStorage.getItem(reminderKey)) {
                showNotification(`Tu solicitud de ${this.getTipoLabel(solicitud.tipo)} ha sido aprobada! 🎉`, 'success', 6000);
                localStorage.setItem(reminderKey, 'true');
            }
        });
    }

    getTipoLabel(tipo) {
        const labels = {
            'permiso': 'permiso',
            'vacaciones': 'vacaciones',
            'otra': 'otra solicitud'
        };
        return labels[tipo] || tipo;
    }
}

export default Reminders;

