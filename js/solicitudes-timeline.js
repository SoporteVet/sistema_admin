/**
 * Solicitudes Timeline View
 * Visual timeline and calendar view for solicitudes
 */

import db from './database.js';
import auth from './auth.js';

class SolicitudesTimeline {
    constructor() {
        this.currentView = 'list'; // 'list' | 'timeline' | 'calendar'
    }

    /**
     * Render timeline view
     */
    async renderTimeline(containerId, solicitudes) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Group by month
        const grouped = this.groupByMonth(solicitudes);

        container.innerHTML = `
            <div class="timeline-container">
                ${Object.keys(grouped).sort().reverse().map(month => `
                    <div class="timeline-month-section">
                        <div class="timeline-month-header">
                            <h3>${this.formatMonth(month)}</h3>
                            <span class="timeline-count">${grouped[month].length} solicitud(es)</span>
                        </div>
                        <div class="timeline-items">
                            ${grouped[month].map(s => this.renderTimelineItem(s)).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render calendar view
     */
    async renderCalendarView(containerId, solicitudes) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Get all solicitudes that have dates
        const solicitudesWithDates = solicitudes.filter(s => s.fechaInicio && s.fechaFin);

        container.innerHTML = `
            <div class="solicitudes-calendar-view">
                <div class="calendar-view-header">
                    <h3>📅 Vista de Calendario</h3>
                    <div class="calendar-view-legend">
                        <span class="legend-item"><span class="legend-color legend-pendiente"></span> Pendiente</span>
                        <span class="legend-item"><span class="legend-color legend-aprobada"></span> Aprobada</span>
                        <span class="legend-item"><span class="legend-color legend-rechazada"></span> Rechazada</span>
                    </div>
                </div>
                <div class="calendar-events-list">
                    ${solicitudesWithDates.length === 0 ? `
                        <div class="empty-state">
                            <p>No hay solicitudes con fechas para mostrar</p>
                        </div>
                    ` : solicitudesWithDates.map(s => `
                        <div class="calendar-event-item calendar-event-${s.estado}" data-start="${s.fechaInicio}" data-end="${s.fechaFin}">
                            <div class="calendar-event-header">
                                <span class="calendar-event-type">${this.getTipoIcon(s.tipo)} ${this.getTipoLabel(s.tipo)}</span>
                                <span class="badge-${s.estado}">${s.estado.toUpperCase()}</span>
                            </div>
                            <div class="calendar-event-body">
                                <div class="calendar-event-period">
                                    <span class="event-date">${this.formatDateShort(s.fechaInicio)}</span>
                                    <span class="event-arrow">→</span>
                                    <span class="event-date">${this.formatDateShort(s.fechaFin)}</span>
                                    <span class="event-days">(${s.dias || 0} días)</span>
                                </div>
                                ${s.usuarioNombre ? `<div class="calendar-event-user">👤 ${s.usuarioNombre}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Group solicitudes by month
     */
    groupByMonth(solicitudes) {
        const grouped = {};
        
        solicitudes.forEach(s => {
            const date = new Date(s.fecha);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            grouped[monthKey].push(s);
        });

        return grouped;
    }

    /**
     * Render timeline item
     */
    renderTimelineItem(solicitud) {
        const date = new Date(solicitud.fecha);
        const day = String(date.getDate()).padStart(2, '0');
        const month = date.toLocaleDateString('es-ES', { month: 'short' });

        return `
            <div class="timeline-item timeline-item-${solicitud.estado}">
                <div class="timeline-marker">
                    <div class="timeline-date">
                        <span class="timeline-day">${day}</span>
                        <span class="timeline-month">${month}</span>
                    </div>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <h4>${this.getTipoLabel(solicitud.tipo)}</h4>
                        <span class="badge-${solicitud.estado}">${solicitud.estado.toUpperCase()}</span>
                    </div>
                    <div class="timeline-body">
                        ${solicitud.fechaInicio && solicitud.fechaFin ? `
                            <div class="timeline-period">
                                <span>📅 ${this.formatDateShort(solicitud.fechaInicio)} - ${this.formatDateShort(solicitud.fechaFin)}</span>
                                ${solicitud.dias ? `<span class="timeline-days">(${solicitud.dias} días)</span>` : ''}
                            </div>
                        ` : ''}
                        ${solicitud.usuarioNombre ? `<div class="timeline-user">👤 ${solicitud.usuarioNombre}</div>` : ''}
                        ${solicitud.departamento ? `<div class="timeline-dept">🏢 ${solicitud.departamento}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getTipoLabel(tipo) {
        const labels = {
            'permiso': 'Permiso sin Goce de Salario',
            'vacaciones': 'Solicitud de Vacaciones',
            'otra': 'Otra Solicitud'
        };
        return labels[tipo] || tipo;
    }

    getTipoIcon(tipo) {
        const icons = {
            'permiso': '🚪',
            'vacaciones': '🏖️',
            'otra': '📋'
        };
        return icons[tipo] || '📝';
    }

    formatMonth(monthKey) {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }

    formatDateShort(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

export default SolicitudesTimeline;



