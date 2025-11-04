/**
 * Export System
 * PDF and Excel export functionality
 */

class ExportSystem {
    constructor() {
        this.jsPDFLoaded = false;
        this.SheetJSLoaded = false;
    }

    /**
     * Initialize export system
     */
    async init() {
        await this.loadScripts();
    }

    /**
     * Load required libraries
     */
    async loadScripts() {
        // Load jsPDF
        if (!window.jsPDF) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            this.jsPDFLoaded = true;
        }

        // Load SheetJS (xlsx)
        if (!window.XLSX) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
            this.SheetJSLoaded = true;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Export comunicado to PDF
     */
    async exportComunicadoPDF(comunicado) {
        // Ensure jsPDF is loaded
        if (!window.jspdf && !window.jsPDF) {
            await this.init();
            // Wait a bit for script to fully load
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        let jsPDF;
        if (window.jspdf) {
            jsPDF = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDF = window.jsPDF;
        } else {
            throw new Error('jsPDF no se pudo cargar correctamente');
        }
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        let yPos = margin;

        // Header with gradient effect (simulated)
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Sistema Administrativo', margin, 30);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Comunicado Digital', margin, 40);

        yPos = 60;

        // Content area
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(248, 249, 252);
        doc.rect(margin, yPos, maxWidth, doc.internal.pageSize.getHeight() - yPos - 20, 'F');

        // Code and type
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.setFont('courier', 'bold');
        doc.text(`Código: ${comunicado.codigo}`, margin, yPos + 10);
        
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tipo: ${comunicado.tipo.toUpperCase()} | Departamento: ${comunicado.departamento}`, margin, yPos + 16);

        yPos += 25;

        // Title
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(comunicado.titulo, maxWidth);
        doc.text(titleLines, margin, yPos);
        yPos += (titleLines.length * 7) + 10;

        // Divider
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // Content
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(comunicado.contenido, maxWidth);
        
        contentLines.forEach(line => {
            if (yPos > doc.internal.pageSize.getHeight() - 30) {
                doc.addPage();
                yPos = margin;
            }
            doc.text(line, margin, yPos);
            yPos += 6;
        });

        // Footer
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} - Sistema Administrativo`, margin, footerY);

        // Save
        doc.save(`Comunicado-${comunicado.codigo}.pdf`);
    }

    /**
     * Export multiple comunicados to PDF
     */
    async exportComunicadosPDF(comunicados) {
        // Ensure jsPDF is loaded
        if (!window.jspdf && !window.jsPDF) {
            await this.init();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        let jsPDF;
        if (window.jspdf) {
            jsPDF = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDF = window.jsPDF;
        } else {
            throw new Error('jsPDF no se pudo cargar correctamente');
        }
        
        for (let index = 0; index < comunicados.length; index++) {
            const comunicado = comunicados[index];
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);
            let yPos = margin;

            // Header
            doc.setFillColor(99, 102, 241);
            doc.rect(0, 0, pageWidth, 50, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Sistema Administrativo', margin, 30);
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('Comunicado Digital', margin, 40);

            yPos = 60;

            // Content area
            doc.setTextColor(0, 0, 0);
            doc.setFillColor(248, 249, 252);
            doc.rect(margin, yPos, maxWidth, doc.internal.pageSize.getHeight() - yPos - 20, 'F');

            // Code and type
            doc.setFontSize(10);
            doc.setTextColor(99, 102, 241);
            doc.setFont('courier', 'bold');
            doc.text(`Código: ${comunicado.codigo}`, margin, yPos + 10);
            
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            doc.text(`Tipo: ${comunicado.tipo.toUpperCase()} | Departamento: ${comunicado.departamento}`, margin, yPos + 16);

            yPos += 25;

            // Title
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const titleLines = doc.splitTextToSize(comunicado.titulo, maxWidth);
            doc.text(titleLines, margin, yPos);
            yPos += (titleLines.length * 7) + 10;

            // Divider
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;

            // Content
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const contentLines = doc.splitTextToSize(comunicado.contenido, maxWidth);
            
            contentLines.forEach(line => {
                if (yPos > doc.internal.pageSize.getHeight() - 30) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(line, margin, yPos);
                yPos += 6;
            });

            // Footer
            const footerY = doc.internal.pageSize.getHeight() - 10;
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} - Sistema Administrativo`, margin, footerY);

            // Save each comunicado as separate PDF
            doc.save(`Comunicado-${comunicado.codigo}.pdf`);
            
            // Small delay between downloads to avoid browser blocking
            if (index < comunicados.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    }

    /**
     * Export solicitud to PDF
     */
    async exportSolicitudPDF(solicitud) {
        // Ensure jsPDF is loaded
        if (!window.jspdf && !window.jsPDF) {
            await this.init();
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        let jsPDF;
        if (window.jspdf) {
            jsPDF = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDF = window.jsPDF;
        } else {
            throw new Error('jsPDF no se pudo cargar correctamente');
        }
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        let yPos = margin;

        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Sistema Administrativo', margin, 30);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Solicitud', margin, 40);

        yPos = 60;

        // Content area
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(248, 249, 252);
        doc.rect(margin, yPos, maxWidth, doc.internal.pageSize.getHeight() - yPos - 20, 'F');

        // Tipo and Estado
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(this.getSolicitudTipoLabel(solicitud.tipo), margin, yPos + 10);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const estadoColor = solicitud.estado === 'aprobada' ? [16, 185, 129] : solicitud.estado === 'rechazada' ? [239, 68, 68] : [245, 158, 11];
        doc.setTextColor(...estadoColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`Estado: ${solicitud.estado.toUpperCase()}`, pageWidth - margin - 40, yPos + 10, { align: 'right' });

        yPos += 20;

        // Información general
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Empleado: ${solicitud.usuarioNombre || 'N/A'}`, margin, yPos);
        yPos += 7;
        doc.text(`Departamento: ${solicitud.departamento || 'N/A'}`, margin, yPos);
        yPos += 7;
        doc.text(`Fecha de Solicitud: ${this.formatDate(solicitud.fecha)}`, margin, yPos);
        yPos += 15;

        // Divider
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // Detalles según tipo
        if (solicitud.tipo === 'permiso' || solicitud.tipo === 'vacaciones') {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Período:', margin, yPos);
            yPos += 7;
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Desde: ${this.formatDate(solicitud.fechaInicio)}`, margin + 10, yPos);
            yPos += 7;
            doc.text(`Hasta: ${this.formatDate(solicitud.fechaFin)}`, margin + 10, yPos);
            yPos += 7;
            doc.text(`Días solicitados: ${solicitud.dias || 0}`, margin + 10, yPos);
            yPos += 10;

            if (solicitud.tipo === 'permiso' && solicitud.motivo) {
                doc.setFont('helvetica', 'bold');
                doc.text('Motivo:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const motivoLines = doc.splitTextToSize(solicitud.motivo, maxWidth - 10);
                motivoLines.forEach(line => {
                    if (yPos > doc.internal.pageSize.getHeight() - 30) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(line, margin + 10, yPos);
                    yPos += 6;
                });
                yPos += 5;
            }

            if (solicitud.tipo === 'vacaciones' && solicitud.observaciones) {
                doc.setFont('helvetica', 'bold');
                doc.text('Observaciones:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const obsLines = doc.splitTextToSize(solicitud.observaciones, maxWidth - 10);
                obsLines.forEach(line => {
                    if (yPos > doc.internal.pageSize.getHeight() - 30) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(line, margin + 10, yPos);
                    yPos += 6;
                });
                yPos += 5;
            }
        } else if (solicitud.tipo === 'otra') {
            if (solicitud.titulo) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Título:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const tituloLines = doc.splitTextToSize(solicitud.titulo, maxWidth);
                tituloLines.forEach(line => {
                    doc.text(line, margin, yPos);
                    yPos += 6;
                });
                yPos += 5;
            }

            if (solicitud.descripcion) {
                doc.setFont('helvetica', 'bold');
                doc.text('Descripción:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const descLines = doc.splitTextToSize(solicitud.descripcion, maxWidth);
                descLines.forEach(line => {
                    if (yPos > doc.internal.pageSize.getHeight() - 30) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(line, margin, yPos);
                    yPos += 6;
                });
            }
        }

        // Aprobación/Rechazo info
        if (solicitud.estado !== 'pendiente' && solicitud.aprobadoPor) {
            yPos += 10;
            if (yPos > doc.internal.pageSize.getHeight() - 30) {
                doc.addPage();
                yPos = margin;
            }

            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`${solicitud.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'} por: ${solicitud.aprobadoPor}`, margin, yPos);
            yPos += 7;
            if (solicitud.fechaActualizacion) {
                doc.setFont('helvetica', 'normal');
                doc.text(`Fecha: ${this.formatDate(solicitud.fechaActualizacion)}`, margin, yPos);
            }

            if (solicitud.justificacion) {
                yPos += 10;
                doc.setFont('helvetica', 'bold');
                doc.text('Justificación:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const justLines = doc.splitTextToSize(solicitud.justificacion, maxWidth - 10);
                justLines.forEach(line => {
                    if (yPos > doc.internal.pageSize.getHeight() - 30) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(line, margin + 10, yPos);
                    yPos += 6;
                });
            }
        }

        // Footer
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-ES')} - Sistema Administrativo`, margin, footerY);

        // Save
        const filename = `Solicitud-${solicitud.id}-${this.getSolicitudTipoLabel(solicitud.tipo).replace(/\s+/g, '-')}.pdf`;
        doc.save(filename);
    }

    /**
     * Export multiple solicitudes to PDF
     */
    async exportSolicitudesPDF(solicitudes) {
        if (!window.jsPDF) {
            await this.init();
        }

        const { jsPDF } = window.jspdf;
        
        for (let i = 0; i < solicitudes.length; i++) {
            const solicitud = solicitudes[i];
            await this.exportSolicitudPDF(solicitud);
            
            // Small delay between downloads to avoid browser blocking
            if (i < solicitudes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    }

    /**
     * Export solicitudes to Excel
     */
    async exportSolicitudesExcel(solicitudes, filename = 'solicitudes') {
        if (!window.XLSX) {
            await this.init();
        }

        // Prepare data
        const data = solicitudes.map(s => ({
            'ID': s.id,
            'Tipo': this.getSolicitudTipoLabel(s.tipo),
            'Empleado': s.usuarioNombre || 'N/A',
            'Departamento': s.departamento || 'N/A',
            'Fecha Solicitud': this.formatDate(s.fecha),
            'Fecha Inicio': s.fechaInicio ? this.formatDate(s.fechaInicio) : '',
            'Fecha Fin': s.fechaFin ? this.formatDate(s.fechaFin) : '',
            'Días': s.dias || 0,
            'Estado': s.estado.toUpperCase(),
            'Aprobado Por': s.aprobadoPor || '',
            'Fecha Actualización': s.fechaActualizacion ? this.formatDate(s.fechaActualizacion) : ''
        }));

        // Create workbook
        const ws = window.XLSX.utils.json_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');

        // Auto-size columns
        const range = window.XLSX.utils.decode_range(ws['!ref']);
        const colWidths = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            let maxWidth = 10;
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const cellAddress = window.XLSX.utils.encode_cell({ c: C, r: R });
                if (ws[cellAddress]) {
                    const cellValue = String(ws[cellAddress].v || '');
                    maxWidth = Math.max(maxWidth, cellValue.length);
                }
            }
            colWidths.push({ wch: Math.min(maxWidth, 50) });
        }
        ws['!cols'] = colWidths;

        // Save
        window.XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    /**
     * Export comunicados to Excel
     */
    async exportComunicadosExcel(comunicados, filename = 'comunicados') {
        if (!window.XLSX) {
            await this.init();
        }

        const data = comunicados.map(c => ({
            'Código': c.codigo,
            'Título': c.titulo,
            'Tipo': c.tipo.toUpperCase(),
            'Departamento': c.departamento,
            'Fecha': this.formatDate(c.fecha),
            'Creado Por': c.usuarioNombre || 'N/A',
            'Contenido': c.contenido.substring(0, 100) + (c.contenido.length > 100 ? '...' : '')
        }));

        const ws = window.XLSX.utils.json_to_sheet(data);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Comunicados');

        window.XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    getSolicitudTipoLabel(tipo) {
        const labels = {
            'permiso': 'Permiso sin Goce de Salario',
            'vacaciones': 'Solicitud de Vacaciones',
            'otra': 'Otra Solicitud'
        };
        return labels[tipo] || tipo;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    }
}

export default ExportSystem;

