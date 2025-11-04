/**
 * Solicitudes Enhancements
 * Advanced features for solicitudes management
 */

import db from './database.js';
import auth from './auth.js';
import { showNotification } from './notifications.js';

class SolicitudesEnhancements {
    constructor() {
        this.comments = new Map();
    }

    /**
     * Add comment to solicitud
     */
    async addComment(solicitudId, comment, isInternal = false) {
        const user = auth.getCurrentUser();
        const commentData = {
            id: Date.now(),
            solicitudId,
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            comentario: comment,
            esInterno: isInternal,
            fecha: new Date().toISOString(),
            timestamp: Date.now()
        };

        // Store in IndexedDB
        await db.add('comentarios_solicitudes', commentData);
        
        // Also store in memory for quick access
        if (!this.comments.has(solicitudId)) {
            this.comments.set(solicitudId, []);
        }
        this.comments.get(solicitudId).push(commentData);

        return commentData;
    }

    /**
     * Get comments for solicitud
     */
    async getComments(solicitudId) {
        if (this.comments.has(solicitudId)) {
            return this.comments.get(solicitudId);
        }

        const comments = await db.query('comentarios_solicitudes', 'solicitudId', solicitudId) || [];
        this.comments.set(solicitudId, comments.sort((a, b) => b.timestamp - a.timestamp));
        return this.comments.get(solicitudId);
    }

    /**
     * Render comments section
     */
    async renderComments(solicitudId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const comments = await this.getComments(solicitudId);
        const user = auth.getCurrentUser();
        const isAdmin = auth.isAdmin();

        container.innerHTML = `
            <div class="comments-section">
                <div class="comments-header">
                    <h4>💬 Comentarios ${isAdmin ? '(Internos y Públicos)' : ''}</h4>
                </div>
                <div class="comments-list" id="comments-list-${solicitudId}">
                    ${comments.length === 0 ? `
                        <div class="comment-empty">
                            <p>No hay comentarios aún</p>
                        </div>
                    ` : comments.map(c => `
                        <div class="comment-item ${c.esInterno ? 'comment-internal' : ''}">
                            <div class="comment-header">
                                <span class="comment-author">${c.usuarioNombre}</span>
                                ${c.esInterno ? '<span class="comment-badge-internal">Interno</span>' : ''}
                                <span class="comment-date">${this.formatDate(c.fecha)}</span>
                            </div>
                            <div class="comment-content">${this.escapeHtml(c.comentario)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="comment-input-section">
                    ${isAdmin ? `
                        <label class="comment-checkbox-label">
                            <input type="checkbox" id="comment-internal-${solicitudId}" class="comment-checkbox">
                            <span>Comentario interno (solo visible para admins)</span>
                        </label>
                    ` : ''}
                    <div class="comment-input-wrapper">
                        <textarea id="comment-text-${solicitudId}" class="comment-input" placeholder="Escribe un comentario..." rows="2"></textarea>
                        <button class="btn btn-sm btn-primary" onclick="window.solicitudesEnhancements.saveComment(${solicitudId})">
                            Enviar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Save comment
     */
    async saveComment(solicitudId) {
        const textarea = document.getElementById(`comment-text-${solicitudId}`);
        const isInternal = document.getElementById(`comment-internal-${solicitudId}`)?.checked || false;
        
        const comment = textarea?.value.trim();
        if (!comment) {
            showNotification('Por favor escribe un comentario', 'error');
            return;
        }

        await this.addComment(solicitudId, comment, isInternal);
        textarea.value = '';
        
        // Refresh comments display
        const containerId = `comments-container-${solicitudId}`;
        await this.renderComments(solicitudId, containerId);
        
        showNotification('Comentario agregado', 'success');
    }

    /**
     * Get solicitudes statistics
     */
    async getStatistics(userId = null) {
        let solicitudes = await db.getAll('solicitudes');
        
        if (userId) {
            solicitudes = solicitudes.filter(s => s.usuarioId === userId);
        }

        const stats = {
            total: solicitudes.length,
            pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
            aprobadas: solicitudes.filter(s => s.estado === 'aprobada').length,
            rechazadas: solicitudes.filter(s => s.estado === 'rechazada').length,
            enRevision: solicitudes.filter(s => s.estado === 'en_revision').length,
            porTipo: {
                permiso: solicitudes.filter(s => s.tipo === 'permiso').length,
                vacaciones: solicitudes.filter(s => s.tipo === 'vacaciones').length,
                otra: solicitudes.filter(s => s.tipo === 'otra').length
            },
            proximasVencer: this.getProximasVencer(solicitudes),
            promedioDias: this.calculatePromedioDias(solicitudes)
        };

        return stats;
    }

    /**
     * Get solicitudes próximas a vencer
     */
    getProximasVencer(solicitudes, days = 7) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        return solicitudes.filter(s => {
            if (!s.fechaFin || s.estado !== 'aprobada') return false;
            
            const fechaFin = new Date(s.fechaFin);
            fechaFin.setHours(0, 0, 0, 0);
            
            const diffTime = fechaFin - hoy;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays >= 0 && diffDays <= days;
        });
    }

    /**
     * Calculate promedio de días
     */
    calculatePromedioDias(solicitudes) {
        const conDias = solicitudes.filter(s => s.dias && s.dias > 0);
        if (conDias.length === 0) return 0;
        
        const total = conDias.reduce((sum, s) => sum + (s.dias || 0), 0);
        return Math.round(total / conDias.length);
    }

    /**
     * Render statistics
     */
    async renderStatistics(containerId, userId = null) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const stats = await this.getStatistics(userId);

        container.innerHTML = `
            <div class="solicitudes-stats-grid">
                <div class="stat-card-mini">
                    <div class="stat-number">${stats.total}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-card-mini stat-pendiente">
                    <div class="stat-number">${stats.pendientes}</div>
                    <div class="stat-label">Pendientes</div>
                </div>
                <div class="stat-card-mini stat-aprobada">
                    <div class="stat-number">${stats.aprobadas}</div>
                    <div class="stat-label">Aprobadas</div>
                </div>
                <div class="stat-card-mini stat-rechazada">
                    <div class="stat-number">${stats.rechazadas}</div>
                    <div class="stat-label">Rechazadas</div>
                </div>
                ${stats.proximasVencer.length > 0 ? `
                    <div class="stat-card-mini stat-warning">
                        <div class="stat-number">${stats.proximasVencer.length}</div>
                        <div class="stat-label">Próximas a Vencer</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export singleton
const solicitudesEnhancements = new SolicitudesEnhancements();
window.solicitudesEnhancements = solicitudesEnhancements;
export default solicitudesEnhancements;

