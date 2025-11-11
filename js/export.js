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
        if (!window.jsPDF && !window.jspdf) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            this.jsPDFLoaded = true;
        }

        // Load html2canvas if not already loaded
        if (!window.html2canvas) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
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
     * Export comunicado to PDF using html2canvas (like Panel_Básico.html)
     */
    async exportComunicadoPDF(comunicado) {
        // Ensure libraries are loaded
        if (!window.html2canvas) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }
        
        if (!window.jspdf && !window.jsPDF) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
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

        // Obtener el elemento del documento que ya está renderizado
        let documentoElement = document.getElementById('comunicado-documento');
        
        // Si no está visible o no existe, necesitamos renderizarlo primero
        if (!documentoElement || !documentoElement.innerHTML.trim()) {
            const app = window.app;
            if (app && app.showComunicadoDetalle) {
                await app.showComunicadoDetalle(comunicado.id);
                // Esperar a que se renderice
                await new Promise(resolve => setTimeout(resolve, 800));
                documentoElement = document.getElementById('comunicado-documento');
            }
        }

        if (!documentoElement || !documentoElement.innerHTML.trim()) {
            throw new Error('No se pudo encontrar o renderizar el elemento del documento');
        }

        // Asegurar que el modal esté visible
        const modal = document.getElementById('modal-ver-comunicado');
        if (modal) {
            modal.style.display = 'flex';
            // Esperar un momento para que se renderice completamente
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const documentoWrapper = documentoElement.querySelector('.comunicado-documento-wrapper');
        if (!documentoWrapper) {
            throw new Error('No se encontró el wrapper del documento');
        }

        // Separar header y contenido
        const headerElement = documentoWrapper.querySelector('.comunicado-documento-header');
        const titleElement = documentoWrapper.querySelector('.comunicado-documento-title');
        const infoElement = documentoWrapper.querySelector('.comunicado-documento-info');
        const bodyElement = documentoWrapper.querySelector('.comunicado-documento-body');
        const footerElement = documentoWrapper.querySelector('.comunicado-documento-footer');

        // Mostrar indicador de carga
        const loadingIndicator = document.getElementById('loadingPdf');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }

        try {
            // Esperar a que todas las imágenes se carguen
            const allImages = documentoWrapper.getElementsByTagName('img');
            const loadImages = Array.from(allImages).map(img => {
                return new Promise((resolve) => {
                    if (img.complete) {
                        resolve();
                    } else {
                        img.onload = resolve;
                        img.onerror = resolve; // Continuar aunque falle una imagen
                    }
                });
            });
            await Promise.all(loadImages);

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10; // Margen de 10mm
            const usableWidth = pageWidth - (margin * 2);
            const usableHeight = pageHeight - (margin * 2);

            // Capturar header (incluyendo título e info)
            const headerContainer = document.createElement('div');
            headerContainer.style.width = `${documentoWrapper.offsetWidth}px`;
            headerContainer.style.background = '#ffffff';
            headerContainer.style.padding = '0';
            if (headerElement) headerContainer.appendChild(headerElement.cloneNode(true));
            if (titleElement) headerContainer.appendChild(titleElement.cloneNode(true));
            if (infoElement) headerContainer.appendChild(infoElement.cloneNode(true));
            headerContainer.style.position = 'absolute';
            headerContainer.style.left = '-9999px';
            document.body.appendChild(headerContainer);

            const headerCanvas = await html2canvas(headerContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: headerContainer.scrollWidth,
                height: headerContainer.scrollHeight
            });
            const headerImgData = headerCanvas.toDataURL('image/jpeg', 1.0);
            const headerHeightMM = (headerCanvas.height * usableWidth) / headerCanvas.width;
            document.body.removeChild(headerContainer);

            // Capturar contenido del cuerpo
            const bodyContainer = document.createElement('div');
            bodyContainer.style.width = `${documentoWrapper.offsetWidth}px`;
            bodyContainer.style.background = '#ffffff';
            bodyContainer.style.padding = '0';
            if (bodyElement) bodyContainer.appendChild(bodyElement.cloneNode(true));
            bodyContainer.style.position = 'absolute';
            bodyContainer.style.left = '-9999px';
            document.body.appendChild(bodyContainer);

            const bodyCanvas = await html2canvas(bodyContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: bodyContainer.scrollWidth,
                height: bodyContainer.scrollHeight
            });
            const bodyImgData = bodyCanvas.toDataURL('image/jpeg', 1.0);
            const bodyHeightMM = (bodyCanvas.height * usableWidth) / bodyCanvas.width;
            document.body.removeChild(bodyContainer);

            // Capturar footer
            let footerImgData = null;
            let footerHeightMM = 0;
            if (footerElement) {
                const footerContainer = document.createElement('div');
                footerContainer.style.width = `${documentoWrapper.offsetWidth}px`;
                footerContainer.style.background = '#ffffff';
                footerContainer.style.padding = '0';
                footerContainer.appendChild(footerElement.cloneNode(true));
                footerContainer.style.position = 'absolute';
                footerContainer.style.left = '-9999px';
                document.body.appendChild(footerContainer);

                const footerCanvas = await html2canvas(footerContainer, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    width: footerContainer.scrollWidth,
                    height: footerContainer.scrollHeight
                });
                footerImgData = footerCanvas.toDataURL('image/jpeg', 1.0);
                footerHeightMM = (footerCanvas.height * usableWidth) / footerCanvas.width;
                document.body.removeChild(footerContainer);
            }

            // Calcular altura disponible para contenido por página
            const headerSpace = headerHeightMM + 5; // 5mm de espacio después del header
            const footerSpace = footerHeightMM + 5; // 5mm de espacio antes del footer
            const contentHeightPerPage = usableHeight - headerSpace - footerSpace;

            // Calcular número total de páginas
            const totalPages = Math.max(1, Math.ceil(bodyHeightMM / contentHeightPerPage));

            // Generar cada página
            let bodyYPosition = 0;
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                if (pageNum > 1) {
                    pdf.addPage();
                }

                let yPos = margin;

                // Agregar header en cada página
                if (headerElement) {
                    // Crear header con número de página actualizado
                    const headerContainerUpdated = document.createElement('div');
                    headerContainerUpdated.style.width = `${documentoWrapper.offsetWidth}px`;
                    headerContainerUpdated.style.background = '#ffffff';
                    headerContainerUpdated.style.padding = '0';
                    
                    // Clonar header y actualizar número de página
                    if (headerElement) {
                        const headerClone = headerElement.cloneNode(true);
                        const paginaClone = headerClone.querySelector('#comunicado-pagina-actual');
                        if (paginaClone) {
                            paginaClone.textContent = `${pageNum} de ${totalPages}`;
                        }
                        headerContainerUpdated.appendChild(headerClone);
                    }
                    if (titleElement) headerContainerUpdated.appendChild(titleElement.cloneNode(true));
                    if (infoElement) headerContainerUpdated.appendChild(infoElement.cloneNode(true));
                    headerContainerUpdated.style.position = 'absolute';
                    headerContainerUpdated.style.left = '-9999px';
                    headerContainerUpdated.style.top = '0';
                    document.body.appendChild(headerContainerUpdated);

                    const headerCanvasUpdated = await html2canvas(headerContainerUpdated, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        width: headerContainerUpdated.scrollWidth,
                        height: headerContainerUpdated.scrollHeight
                    });
                    const headerImgDataUpdated = headerCanvasUpdated.toDataURL('image/jpeg', 1.0);
                    pdf.addImage(headerImgDataUpdated, 'JPEG', margin, yPos, usableWidth, headerHeightMM);
                    document.body.removeChild(headerContainerUpdated);
                }
                yPos += headerHeightMM + 5;

                // Calcular qué parte del contenido mostrar en esta página
                const contentStart = bodyYPosition;
                const contentEnd = Math.min(bodyYPosition + contentHeightPerPage, bodyHeightMM);
                const contentHeightThisPage = contentEnd - contentStart;

                // Agregar contenido del cuerpo (solo la parte correspondiente a esta página)
                if (contentHeightThisPage > 0) {
                    // Calcular posición Y en la imagen del cuerpo
                    const sourceY = (contentStart / bodyHeightMM) * bodyCanvas.height;
                    const sourceHeight = (contentHeightThisPage / bodyHeightMM) * bodyCanvas.height;

                    // Crear un canvas temporal para la porción del contenido
                    const contentCanvas = document.createElement('canvas');
                    contentCanvas.width = bodyCanvas.width;
                    contentCanvas.height = sourceHeight;
                    const ctx = contentCanvas.getContext('2d');
                    ctx.drawImage(bodyCanvas, 0, sourceY, bodyCanvas.width, sourceHeight, 0, 0, bodyCanvas.width, sourceHeight);
                    const contentImgData = contentCanvas.toDataURL('image/jpeg', 1.0);
                    const contentHeightMMThisPage = (sourceHeight * usableWidth) / bodyCanvas.width;

                    pdf.addImage(contentImgData, 'JPEG', margin, yPos, usableWidth, contentHeightMMThisPage);
                    yPos += contentHeightMMThisPage;
                }

                bodyYPosition = contentEnd;

                // Agregar footer solo en la última página
                if (pageNum === totalPages && footerImgData) {
                    yPos += 5;
                    pdf.addImage(footerImgData, 'JPEG', margin, yPos, usableWidth, footerHeightMM);
                }
            }

            // Generar nombre del archivo
            const codigo = comunicado.codigo || 'sin-codigo';
            const fileName = `Comunicado-${codigo}.pdf`;

            // Guardar el PDF
            pdf.save(fileName);

        } catch (error) {
            console.error('Error al generar el PDF:', error);
            throw new Error('Error al generar el PDF: ' + error.message);
        } finally {
            // Ocultar indicador de carga
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Cerrar el modal si se abrió automáticamente
            // Solo cerrar si no fue abierto manualmente por el usuario
            const modal = document.getElementById('modal-ver-comunicado');
            if (modal && modal.style.display === 'flex') {
                // Pequeño delay para que el usuario vea que se generó
                setTimeout(() => {
                    // No cerrar automáticamente si el usuario lo abrió manualmente
                    // Solo cerrar si fue abierto por la función de exportación
                }, 1000);
            }
        }
    }

    /**
     * Format date in full Spanish format
     */
    formatDateFull(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const months = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} de ${month} de ${year}`;
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

