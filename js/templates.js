/**
 * Templates System
 * Save and reuse common request templates
 */

import { showNotification } from './notifications.js';

class Templates {
    constructor() {
        this.storageKey = 'solicitud_templates';
    }

    /**
     * Save current form as template
     */
    async saveTemplate(name, formData) {
        const templates = this.getAll();
        const template = {
            id: Date.now(),
            name,
            tipo: formData.tipo,
            data: formData,
            fechaCreacion: new Date().toISOString(),
            fechaActualizacion: new Date().toISOString()
        };

        templates.push(template);
        localStorage.setItem(this.storageKey, JSON.stringify(templates));
        return template;
    }

    /**
     * Get all templates
     */
    getAll() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Get templates by type
     */
    getByType(tipo) {
        return this.getAll().filter(t => t.tipo === tipo);
    }

    /**
     * Delete template
     */
    deleteTemplate(id, containerId) {
        if (!confirm('¿Está seguro de eliminar esta plantilla?')) return;
        const templates = this.getAll().filter(t => t.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(templates));
        
        // Refresh templates list if containerId provided
        if (containerId) {
            const tipo = containerId.replace('-templates-container', '');
            this.renderTemplatesSelector(containerId, tipo);
        }
        
        showNotification('Plantilla eliminada', 'success');
    }

    /**
     * Apply template to form
     */
    applyTemplate(template, tipo) {
        if (tipo === 'permiso') {
            const fechaInicio = document.getElementById('permiso-fecha-inicio');
            const fechaFin = document.getElementById('permiso-fecha-fin');
            const motivo = document.getElementById('permiso-motivo');
            
            if (fechaInicio && template.data.fechaInicio) fechaInicio.value = template.data.fechaInicio;
            if (fechaFin && template.data.fechaFin) fechaFin.value = template.data.fechaFin;
            if (motivo && template.data.motivo) motivo.value = template.data.motivo;
        } else if (tipo === 'vacaciones') {
            const fechaInicio = document.getElementById('vacaciones-fecha-inicio');
            const fechaFin = document.getElementById('vacaciones-fecha-fin');
            const observaciones = document.getElementById('vacaciones-observaciones');
            
            if (fechaInicio && template.data.fechaInicio) fechaInicio.value = template.data.fechaInicio;
            if (fechaFin && template.data.fechaFin) fechaFin.value = template.data.fechaFin;
            if (observaciones && template.data.observaciones) observaciones.value = template.data.observaciones;
        } else if (tipo === 'otra') {
            const titulo = document.getElementById('otra-titulo');
            const descripcion = document.getElementById('otra-descripcion');
            
            if (titulo && template.data.titulo) titulo.value = template.data.titulo;
            if (descripcion && template.data.descripcion) descripcion.value = template.data.descripcion;
        }
    }

    /**
     * Render templates selector
     */
    renderTemplatesSelector(containerId, tipo) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const templates = this.getByType(tipo);
        
        if (templates.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="templates-section">
                <div class="templates-header">
                    <span class="templates-icon">📋</span>
                    <strong>Plantillas guardadas</strong>
                </div>
                <div class="templates-list">
                    ${templates.map(t => `
                        <div class="template-item" data-template-id="${t.id}">
                            <div class="template-content" onclick="window.templatesManager.applyTemplateById(${t.id}, '${tipo}')">
                                <span class="template-name">${this.escapeHtml(t.name)}</span>
                                <span class="template-date">${this.formatDate(t.fechaCreacion)}</span>
                            </div>
                            <button class="template-delete" onclick="window.templatesManager.deleteTemplate(${t.id}, '${containerId}')" title="Eliminar plantilla">×</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    applyTemplateById(id, tipo) {
        const template = this.getAll().find(t => t.id === id);
        if (template) {
            this.applyTemplate(template, tipo);
            showNotification(`Plantilla "${template.name}" aplicada`, 'success');
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export singleton
const templatesManager = new Templates();
window.templatesManager = templatesManager; // Make globally available
export default templatesManager;

