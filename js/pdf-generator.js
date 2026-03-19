// ============================================================
// PDF-GENERATOR.JS - Generación de PDFs para Documentos
// Veterinaria San Martín de Porres
// ============================================================

class PDFGenerator {
    // Generar PDF del documento con formato oficial
    static async generateDocumentPDF(doc, includeSignature = false, signatureData = null) {
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);

            // PÁGINA 1: DOCUMENTO COMPLETO
            await this.renderDocumentPage(pdf, doc, pageWidth, pageHeight, margin, contentWidth);

            // PÁGINA 2: DOCUMENTO CON FIRMA (si se especifica)
            if (includeSignature && signatureData) {
                pdf.addPage();
                await this.renderDocumentWithSignaturePage(pdf, doc, signatureData, pageWidth, pageHeight, margin, contentWidth);
            }

            // Descargar PDF
            const fileName = `Documento_${doc.codigo}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);

            return { success: true, fileName };
        } catch (error) {
            console.error('Error generando PDF:', error);
            return { success: false, message: error.message };
        }
    }

    // Renderizar página del documento
    static async renderDocumentPage(pdf, doc, pageWidth, pageHeight, margin, contentWidth) {
        const dep = DEPARTAMENTOS[doc.departamento];
        
        // HEADER - Logo y encabezado
        pdf.setFillColor(26, 35, 126); // Color azul oscuro
        pdf.rect(0, 0, pageWidth, 40, 'F');

        // Logo placeholder (texto por ahora)
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.text('VETERINARIA SAN MARTIN DE PORRES', margin, 15);
        pdf.setFontSize(12);
        pdf.text('veterinaria 3-105-761559', margin, 22);

        // Información del documento (derecha)
        pdf.setFontSize(12);
        const fechaTrdFija = '30-10-2025';
        pdf.text(`Página: 1 de ${includeSignature ? '2' : '1'}`, pageWidth - margin - 30, 15);
        pdf.text(`Código: ${doc.codigo}`, pageWidth - margin - 30, 20);
        pdf.text(`F.TRD: ${fechaTrdFija}`, pageWidth - margin - 30, 25);

        // TÍTULO DEL DOCUMENTO
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.text('COMUNICACIÓN OFICIAL INTERNA', pageWidth / 2, 55, { align: 'center' });
        
        pdf.setFontSize(18);
        pdf.text(fechaTrdFija, pageWidth / 2, 62, { align: 'center' });

        // Información Para/De/Asunto
        let yPos = 70;
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Para: ${doc.para || this.getRecipientsText(doc)}`, margin, yPos);
        yPos += 7;
        pdf.text(`De: ${doc.de || doc.creadoPorNombre}`, margin, yPos);
        yPos += 7;
        pdf.text(`Asunto: ${doc.asunto || doc.titulo}`, margin, yPos);
        yPos += 10;

        // CONTENIDO DEL DOCUMENTO
        pdf.setFontSize(16);
        const contenido = this.stripHTML(doc.contenido);
        const lines = pdf.splitTextToSize(contenido, contentWidth);
        
        for (let i = 0; i < lines.length; i++) {
            if (yPos > pageHeight - 30) {
                // Agregar nueva página si es necesario
                pdf.addPage();
                yPos = margin;
            }
            pdf.text(lines[i], margin, yPos);
            yPos += 7;
        }

        // FOOTER
        const footerY = pageHeight - 15;
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text('Administrador', margin, footerY);
        pdf.text('Tecnología de la Información', margin, footerY + 5);
    }

    // Renderizar página del documento con firma
    static async renderDocumentWithSignaturePage(pdf, doc, signatureData, pageWidth, pageHeight, margin, contentWidth) {
        const dep = DEPARTAMENTOS[doc.departamento];
        
        // HEADER - Logo y encabezado (igual que página 1)
        pdf.setFillColor(26, 35, 126);
        pdf.rect(0, 0, pageWidth, 40, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.text('VETERINARIA SAN MARTIN DE PORRES', margin, 15);
        pdf.setFontSize(12);
        pdf.text('veterinaria 3-105-761559', margin, 22);

        pdf.setFontSize(12);
        const fechaTrdFija = '30-10-2025';
        pdf.text('Página: 2 de 2', pageWidth - margin - 30, 15);
        pdf.text(`Código: ${doc.codigo}`, pageWidth - margin - 30, 20);
        pdf.text(`F.TRD: ${fechaTrdFija}`, pageWidth - margin - 30, 25);

        // TÍTULO DEL DOCUMENTO
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(20);
        pdf.setFont(undefined, 'bold');
        pdf.text('COMUNICACIÓN OFICIAL INTERNA', pageWidth / 2, 55, { align: 'center' });
        
        pdf.setFontSize(18);
        pdf.text(fechaTrdFija, pageWidth / 2, 62, { align: 'center' });

        // Información Para/De/Asunto
        let yPos = 70;
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Para: ${doc.para || this.getRecipientsText(doc)}`, margin, yPos);
        yPos += 7;
        pdf.text(`De: ${doc.de || doc.creadoPorNombre}`, margin, yPos);
        yPos += 7;
        pdf.text(`Asunto: ${doc.asunto || doc.titulo}`, margin, yPos);
        yPos += 10;

        // CONTENIDO DEL DOCUMENTO (versión resumida o completa)
        pdf.setFontSize(16);
        const contenido = this.stripHTML(doc.contenido);
        const lines = pdf.splitTextToSize(contenido, contentWidth);
        
        // Mostrar contenido hasta que quede espacio para la firma
        const maxContentHeight = pageHeight - 80; // Dejar espacio para firma
        for (let i = 0; i < lines.length && yPos < maxContentHeight; i++) {
            pdf.text(lines[i], margin, yPos);
            yPos += 7;
        }

        // ÁREA DE FIRMA
        yPos = pageHeight - 50;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        pdf.setFontSize(13);
        pdf.setFont(undefined, 'bold');
        pdf.text('FIRMA DIGITAL', margin, yPos);
        yPos += 8;

        // Mostrar firma dibujada si está disponible
        const firmaDibujo = signatureData.firmaDibujo || null;
        if (firmaDibujo) {
            try {
                // Agregar título de la firma
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(100, 100, 100);
                pdf.text('Firma del propietario', pageWidth / 2, yPos, { align: 'center' });
                yPos += 5;
                
                // Agregar imagen de la firma
                const signatureWidth = 80; // mm
                const signatureHeight = 30; // mm
                const signatureX = (pageWidth - signatureWidth) / 2;
                
                // Dibujar borde punteado alrededor de la firma
                pdf.setDrawColor(21, 101, 192); // Azul
                pdf.setLineWidth(0.5);
                pdf.setLineDashPattern([3, 3], 0);
                pdf.rect(signatureX - 2, yPos - 2, signatureWidth + 4, signatureHeight + 4);
                pdf.setLineDashPattern([], 0);
                
                // Agregar la imagen de la firma
                pdf.addImage(firmaDibujo, 'PNG', signatureX, yPos, signatureWidth, signatureHeight);
                yPos += signatureHeight + 10;
            } catch (error) {
                console.error('Error agregando imagen de firma al PDF:', error);
                yPos += 5;
            }
        }

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(13);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Nombre: ${signatureData.nombre}`, margin, yPos);
        yPos += 6;
        pdf.text(`Rol: ${ROLES[signatureData.rol]?.nombre || signatureData.rol}`, margin, yPos);
        yPos += 6;
        pdf.text(`Departamento: ${DEPARTAMENTOS[signatureData.departamento]?.nombre || signatureData.departamento}`, margin, yPos);
        yPos += 6;
        
        const fechaFirma = new Date(signatureData.fecha);
        const fechaFirmaStr = fechaFirma.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        pdf.text(`Fecha de firma: ${fechaFirmaStr}`, margin, yPos);
        yPos += 6;
        pdf.text(`Código de verificación: ${signatureData.codigoVerificacion}`, margin, yPos);

        // FOOTER - Dos cuadros de firma lado a lado
        const footerY = pageHeight - 55;
        const signatureBoxWidth = 70; // mm
        const signatureBoxHeight = 30; // mm
        const gap = 20; // mm entre cuadros
        const totalWidth = (signatureBoxWidth * 2) + gap;
        const startX = (pageWidth - totalWidth) / 2;
        
        // Identificar firma del encargado (creador del documento)
        let firmaEncargado = null;
        let firmaEncargadoDibujo = null;
        let nombreEncargado = doc.creadoPorNombre || 'Encargado';
        
        if (doc.firmas && doc.creadoPor) {
            const firmasArray = Object.values(doc.firmas);
            firmaEncargado = firmasArray.find(f => f.userId === doc.creadoPor);
            if (firmaEncargado) {
                firmaEncargadoDibujo = firmaEncargado.firmaDibujo || null;
                nombreEncargado = firmaEncargado.nombre;
            }
        }
        
        // Firma del empleado (signatureData)
        const firmaEmpleadoDibujo = signatureData ? (signatureData.firmaDibujo || null) : null;
        
        // CUADRO IZQUIERDO: Firma del encargado
        const encargadoBoxX = startX;
        const encargadoBoxY = footerY + 5;
        
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Firma del encargado del comunicado', encargadoBoxX + signatureBoxWidth / 2, footerY, { align: 'center' });
        
        // Dibujar borde punteado
        pdf.setDrawColor(21, 101, 192);
        pdf.setLineWidth(0.5);
        pdf.setLineDashPattern([3, 3], 0);
        pdf.rect(encargadoBoxX - 2, encargadoBoxY - 2, signatureBoxWidth + 4, signatureBoxHeight + 4);
        pdf.setLineDashPattern([], 0);
        
        // Agregar imagen de la firma del encargado si está disponible
        if (firmaEncargadoDibujo) {
            try {
                pdf.addImage(firmaEncargadoDibujo, 'PNG', encargadoBoxX, encargadoBoxY, signatureBoxWidth, signatureBoxHeight);
            } catch (error) {
                console.error('Error agregando firma del encargado:', error);
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(150, 150, 150);
                pdf.text('Firma no disponible', encargadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight / 2, { align: 'center' });
            }
        } else {
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(150, 150, 150);
            pdf.text('Firma no disponible', encargadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight / 2, { align: 'center' });
        }
        
        // Nombre del encargado debajo del cuadro
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(nombreEncargado, encargadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight + 4, { align: 'center' });
        if (firmaEncargado) {
            pdf.text(ROLES[firmaEncargado.rol]?.nombre || firmaEncargado.rol, encargadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight + 7, { align: 'center' });
        }
        
        // CUADRO DERECHO: Firma del empleado
        const empleadoBoxX = startX + signatureBoxWidth + gap;
        
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Firma del empleado', empleadoBoxX + signatureBoxWidth / 2, footerY, { align: 'center' });
        
        // Dibujar borde punteado
        pdf.setDrawColor(21, 101, 192);
        pdf.setLineWidth(0.5);
        pdf.setLineDashPattern([3, 3], 0);
        pdf.rect(empleadoBoxX - 2, encargadoBoxY - 2, signatureBoxWidth + 4, signatureBoxHeight + 4);
        pdf.setLineDashPattern([], 0);
        
        // Agregar imagen de la firma del empleado si está disponible
        if (firmaEmpleadoDibujo) {
            try {
                pdf.addImage(firmaEmpleadoDibujo, 'PNG', empleadoBoxX, encargadoBoxY, signatureBoxWidth, signatureBoxHeight);
            } catch (error) {
                console.error('Error agregando firma del empleado:', error);
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'normal');
                pdf.setTextColor(150, 150, 150);
                pdf.text('Firma no disponible', empleadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight / 2, { align: 'center' });
            }
        } else {
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(150, 150, 150);
            pdf.text('Firma no disponible', empleadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight / 2, { align: 'center' });
        }
        
        // Nombre del empleado debajo del cuadro
        if (signatureData) {
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(signatureData.nombre, empleadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight + 4, { align: 'center' });
            pdf.text(ROLES[signatureData.rol]?.nombre || signatureData.rol, empleadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight + 7, { align: 'center' });
        } else {
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(150, 150, 150);
            pdf.text('Sin firmar', empleadoBoxX + signatureBoxWidth / 2, encargadoBoxY + signatureBoxHeight + 4, { align: 'center' });
        }
    }

    // Función auxiliar para esperar a que las imágenes se carguen
    static async waitForImages(element) {
        const images = element.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                // Timeout después de 5 segundos
                setTimeout(() => resolve(), 5000);
            });
        });
        await Promise.all(imagePromises);
    }

    // Generar PDF usando html2canvas con paginación automática y header en cada página
    static async generatePDFFromHTML(doc, includeSignature = false, signatureData = null) {
        try {
            // Márgenes de impresión exactos
            const marginTop    = 20; // mm (2.0 cm)
            const marginBottom = 20; // mm (2.0 cm)
            const marginSide   = 25; // mm (2.5 cm)

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' }); // Carta: 216 x 279 mm

            const pageWidth     = pdf.internal.pageSize.getWidth();    // 216 mm carta
            const pageHeight    = pdf.internal.pageSize.getHeight();   // 279 mm carta
            const contentWidth  = pageWidth  - marginSide * 2;         // 160 mm
            const contentHeight = pageHeight - marginTop - marginBottom; // 257 mm
            // Seguridad de impresión: algunas impresoras recortan unos mm en el borde inferior.
            // Se reserva un espacio adicional para que no se corte al imprimir.
            const printSafeBottomExtra = 4; // mm
            const contentHeightPrintSafe = contentHeight - printSafeBottomExtra;

            const scale = 1.5; // balance entre calidad y peso del archivo

            // ── Función auxiliar: renderizar HTML a canvas ───────────────────────
            const renderDiv = async (html) => {
                const div = document.createElement('div');
                div.style.cssText = `position:absolute;left:-9999px;top:0;width:${contentWidth}mm;padding:0;background:white;font-family:Arial,sans-serif;`;
                div.innerHTML = html;
                document.body.appendChild(div);
                await this.waitForImages(div);
                const h = Math.max(div.scrollHeight, div.offsetHeight, div.clientHeight);
                const w = Math.max(div.scrollWidth,  div.offsetWidth,  div.clientWidth);
                const c = await html2canvas(div, {
                    scale,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowWidth: w,
                    windowHeight: h
                });
                document.body.removeChild(div);
                return c;
            };

            // ── 1. Pre-cargar imagen de marca de agua ────────────────────────────
            const wmImg = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => {
                    const fallback = new Image();
                    fallback.onload = () => resolve(fallback);
                    fallback.onerror = () => resolve(null);
                    fallback.src = new URL('img/empresa_marca_agua.jpg', window.location.href).href;
                };
                // Sin crossOrigin para evitar bloqueos en recursos locales
                img.src = 'img/empresa_marca_agua.jpg';
            });

            // ── Componer slice del body con marca de agua centrada por página ────
            const makePageCanvas = (offsetY, heightPx, overlayWatermark = false) => {
                const c   = document.createElement('canvas');
                c.width   = bodyCanvas.width;
                c.height  = heightPx;
                const ctx = c.getContext('2d');

                // Fondo blanco
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, c.width, c.height);

                // Contenido del body
                ctx.drawImage(bodyCanvas, 0, offsetY, bodyCanvas.width, heightPx, 0, 0, c.width, heightPx);

                // Marca de agua centrada para páginas 2+ (encima del fondo blanco del body)
                if (overlayWatermark && wmImg) {
                    const wmScale = (c.width * 0.75) / wmImg.naturalWidth;
                    const wmW = wmImg.naturalWidth  * wmScale;
                    const wmH = wmImg.naturalHeight * wmScale;
                    ctx.globalAlpha = 0.10;
                    ctx.drawImage(wmImg, (c.width - wmW) / 2, (c.height - wmH) / 2, wmW, wmH);
                    ctx.globalAlpha = 1;
                }

                return c;
            };

            // ── 2. Renderizar header independiente (pág 2+) ──────────────────────
            const headerCanvas   = await renderDiv(this.createDocHeaderHTML(doc));
            const mmPerPx        = contentWidth / headerCanvas.width;
            const headerHeightMm = headerCanvas.height * mmPerPx;

            // ── 3. Renderizar cuerpo completo SIN marca de agua ──────────────────
            let bodyHTML = this.createDocumentHTML(doc, true);
            bodyHTML = bodyHTML
                .replace('padding: 20px;', 'padding: 0;')
                .replace('min-height: 100vh;', 'min-height: auto;');

            const bodyCanvas  = await renderDiv(bodyHTML);
            const bodyMmPerPx = contentWidth / bodyCanvas.width;
            const bodyCtx = bodyCanvas.getContext('2d', { willReadFrequently: true });

            // Analiza si una fila del canvas es "vacía" (sin texto visible)
            const isRowEmpty = (y) => {
                if (y < 0 || y >= bodyCanvas.height) return true;
                const row = bodyCtx.getImageData(0, y, bodyCanvas.width, 1).data;
                const step = Math.max(1, Math.floor(bodyCanvas.width / 200));
                for (let i = 0; i < row.length; i += 4 * step) {
                    const r = row[i], g = row[i+1], b = row[i+2], a = row[i+3];
                    if (a < 10) continue;
                    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    if (luma < 210) return false; // hay un pixel oscuro → fila no vacía
                }
                return true;
            };

            // Busca la última fila con texto y corta justo 3px después de ella,
            // así el corte cae siempre en el espacio en blanco ENTRE líneas
            // y no parte letras ni deja artefactos en la página siguiente.
            const getSmartSliceHeight = (startY, targetHeightPx) => {
                const maxHeight = Math.min(targetHeightPx, bodyCanvas.height - startY);
                if (maxHeight <= 1 || startY + maxHeight >= bodyCanvas.height || !bodyCtx) {
                    return Math.max(1, maxHeight);
                }

                const scanBackPx = Math.min(120, maxHeight - 20);

                for (let back = 0; back < scanBackPx; back++) {
                    const absoluteY = startY + maxHeight - back;
                    if (!isRowEmpty(absoluteY)) {
                        // Última fila con texto encontrada → cortar 3px después
                        const sliceHeight = maxHeight - back + 3;
                        return Math.max(20, Math.min(maxHeight, sliceHeight));
                    }
                }

                return Math.max(1, maxHeight);
            };

            // ── 4. Calcular alturas de corte ─────────────────────────────────────
            const page1BodyPx = Math.floor(contentHeightPrintSafe / bodyMmPerPx);
            const page2BodyPx = Math.floor((contentHeightPrintSafe - headerHeightMm) / bodyMmPerPx);
            const remainingAfterPage1 = Math.max(0, bodyCanvas.height - page1BodyPx);
            const totalPages = remainingAfterPage1 > 0
                ? 1 + Math.ceil(remainingAfterPage1 / Math.max(1, page2BodyPx))
                : 1;

            // ── 5. Paginar ───────────────────────────────────────────────────────
            let renderedPx = 0;
            let pageIndex  = 0;
            const pageJoinTrimPx = 0; // sin trim: el corte ya cae en espacio blanco

            while (renderedPx < bodyCanvas.height) {
                if (pageIndex > 0) pdf.addPage();

                if (pageIndex === 0) {
                    // Página 1: header incluido en el bodyCanvas
                    const targetSlicePx = Math.min(page1BodyPx, bodyCanvas.height - renderedPx);
                    const slicePx = getSmartSliceHeight(renderedPx, targetSlicePx);
                    const page    = makePageCanvas(renderedPx, slicePx, false);
                    pdf.addImage(page.toDataURL('image/jpeg', 0.80), 'JPEG',
                        marginSide, marginTop, contentWidth, slicePx * bodyMmPerPx);
                    renderedPx += slicePx;
                    if (renderedPx < bodyCanvas.height) {
                        renderedPx = Math.min(bodyCanvas.height, renderedPx + pageJoinTrimPx);
                    }
                } else {
                    // Páginas 2+: header independiente + continuación del body
                    const currentPage   = pageIndex + 1;
                    const headerForPage = await renderDiv(
                        this.createDocHeaderHTML(doc, `${currentPage} de ${totalPages}`)
                    );
                    pdf.addImage(headerForPage.toDataURL('image/jpeg', 0.80), 'JPEG',
                        marginSide, marginTop, contentWidth, headerHeightMm);

                    const targetSlicePx = Math.min(page2BodyPx, bodyCanvas.height - renderedPx);
                    const slicePx = getSmartSliceHeight(renderedPx, targetSlicePx);
                    const page    = makePageCanvas(renderedPx, slicePx, true);
                    pdf.addImage(page.toDataURL('image/jpeg', 0.80), 'JPEG',
                        marginSide, marginTop + headerHeightMm, contentWidth, slicePx * bodyMmPerPx);
                    renderedPx += slicePx;
                    if (renderedPx < bodyCanvas.height) {
                        renderedPx = Math.min(bodyCanvas.height, renderedPx + pageJoinTrimPx);
                    }
                }
                pageIndex++;
            }

            const fileName = `Documento_${doc.codigo}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);

            return { success: true, fileName };
        } catch (error) {
            console.error('Error generando PDF desde HTML:', error);
            return { success: false, message: error.message };
        }
    }

    // Recorta una franja vertical de un canvas
    static _sliceCanvas(src, offsetY, heightPx) {
        const c   = document.createElement('canvas');
        c.width   = src.width;
        c.height  = heightPx;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(src, 0, offsetY, src.width, heightPx, 0, 0, c.width, heightPx);
        return c;
    }

    // Header independiente del documento (para repetir en páginas 2+)
    static createDocHeaderHTML(doc, pageLabel = '') {
        const fechaTrdFija = '30-10-2025';
        return `
            <div style="font-family: Arial, sans-serif;">
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0;">
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <div style="flex-shrink: 0;">
                                <img src="img/empresa_marca_agua.jpg" alt="Logo Veterinaria" style="width: 90px; height: 90px; object-fit: contain;" />
                            </div>
                            <div style="display: flex; flex-direction: column; justify-content: flex-start; padding-top: 8px; font-family: Arial, sans-serif;">
                                <div style="font-size: 20px; font-weight: bold; color: #000; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2; margin-bottom: 5px; font-family: Arial, sans-serif;">
                                    VETERINARIA SAN MARTIN DE PORRES
                                </div>
                                <div style="font-size: 12px; color: #000; margin-top: 2px; font-family: Arial, sans-serif;">
                                    3-105-761559
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right; font-size: 12px; color: #000; line-height: 1.7; padding-top: 8px; font-family: Arial, sans-serif;">
                            <div>Código: ${doc.codigo}</div>
                            <div>F.TRD: ${fechaTrdFija}</div>
                            <div>Página: ${pageLabel || '1 de 1'}</div>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 25px; font-family: Arial, sans-serif;">
                    <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.2px; color: #000; font-family: Arial, sans-serif; line-height: 1.2;">COMUNICACIÓN OFICIAL INTERNA</h1>
                    <p style="font-size: 18px; font-weight: bold; color: #000; font-family: Arial, sans-serif; margin-top: 2px; line-height: 1.2;">${fechaTrdFija}</p>
                </div>
            </div>`;
    }


    // Crear HTML del documento para renderizar
    // Nota: includeSignature y signatureData ya no se usan, siempre se muestran todas las firmas disponibles
    static createDocumentHTML(doc, includeSignature = false, signatureData = null) {
        const dep = DEPARTAMENTOS[doc.departamento];
        const fechaTrdFija = '30-10-2025';

        let html = `
            <div style="font-family: Arial, sans-serif !important; color: #000; background: white; padding: 20px; margin: 0; position: relative; min-height: 100vh;">
                <!-- MARCA DE AGUA HORIZONTAL -->
                <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: 0.18; z-index: 0; pointer-events: none; width: 100%; text-align: center;">
                    <img src="img/empresa_marca_agua.jpg" alt="Marca de agua" style="width: 80%; height: auto; object-fit: contain; opacity: 0.25;" />
                </div>

                <!-- CONTENIDO PRINCIPAL -->
                <div style="position: relative; z-index: 1;">
                <!-- HEADER -->
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #000;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0;">
                        <!-- Logo y texto izquierda -->
                        <div style="display: flex; align-items: flex-start; gap: 10px;">
                            <!-- Logo circular sin texto debajo -->
                            <div style="flex-shrink: 0;">
                                <img src="img/empresa_marca_agua.jpg" alt="Logo Veterinaria" style="width: 90px; height: 90px; object-fit: contain;" />
                            </div>
                            <!-- Texto principal a la derecha del logo -->
                            <div style="display: flex; flex-direction: column; justify-content: flex-start; padding-top: 8px; font-family: Arial, sans-serif;">
                                <div style="font-size: 20px; font-weight: bold; color: #000; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2; margin-bottom: 5px; font-family: Arial, sans-serif;">
                                    VETERINARIA SAN MARTIN DE PORRES
                                </div>
                                <div style="font-size: 12px; color: #000; margin-top: 2px; font-family: Arial, sans-serif;">
                                    3-105-761559
                                </div>
                            </div>
                        </div>
                        <!-- Info documento derecha -->
                        <div style="text-align: right; font-size: 12px; color: #000; line-height: 1.7; padding-top: 8px; font-family: Arial, sans-serif;">
                            <div>Código: ${doc.codigo}</div>
                            <div>F.TRD: ${fechaTrdFija}</div>
                            <div>Página: 1 de 1</div>
                        </div>
                    </div>
                </div>

                <!-- TÍTULO CENTRADO -->
                <div style="text-align: center; margin-bottom: 25px; font-family: Arial, sans-serif;">
                    <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.2px; color: #000; font-family: Arial, sans-serif; line-height: 1.2;">COMUNICACIÓN OFICIAL INTERNA</h1>
                    <p style="font-size: 18px; font-weight: bold; color: #000; font-family: Arial, sans-serif; margin-top: 2px; line-height: 1.2;">${fechaTrdFija}</p>
                </div>

                <!-- PARA/DE/ASUNTO -->
                <div style="margin-bottom: 25px; font-size: 16px; line-height: 1.5; font-family: Arial, sans-serif;">
                    <div style="margin: 0; padding: 0; font-size: 16px; line-height: 1.5; font-weight: normal; font-family: Arial, sans-serif;"><strong>Para:</strong> ${doc.para || this.getRecipientsText(doc)}</div>
                    <div style="margin: 0; padding: 0; font-size: 16px; line-height: 1.5; font-weight: normal; font-family: Arial, sans-serif;"><strong>De:</strong> ${doc.de || doc.creadoPorNombre}</div>
                    <div style="margin: 0; padding: 0; font-size: 16px; line-height: 1.5; font-weight: normal; font-family: Arial, sans-serif;"><strong>Asunto:</strong> ${doc.asunto || doc.titulo}</div>
                </div>

                <!-- CONTENIDO -->
                <div style="font-size: 16px; line-height: 1.5; margin-bottom: 30px; text-align: justify; font-family: Arial, sans-serif;">
                    <style>
                        #pdf-content, #pdf-content *, #pdf-content p, #pdf-content div, #pdf-content span, 
                        #pdf-content strong, #pdf-content em, #pdf-content b, #pdf-content i, #pdf-content u,
                        #pdf-content h1, #pdf-content h2, #pdf-content h3, #pdf-content h4, #pdf-content h5, #pdf-content h6,
                        #pdf-content li, #pdf-content ul, #pdf-content ol {
                            font-size: 16px !important;
                            line-height: 1.5 !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            font-family: Arial, sans-serif !important;
                        }
                        #pdf-content p, #pdf-content div, #pdf-content li {
                            margin-bottom: 8px !important;
                        }
                        #pdf-content p:last-child, #pdf-content div:last-child, #pdf-content li:last-child {
                            margin-bottom: 0 !important;
                        }
                        #pdf-content ul, #pdf-content ol {
                            padding-left: 20px !important;
                            margin-bottom: 8px !important;
                        }
                    </style>
                    <div id="pdf-content">${doc.contenido}</div>
                </div>
        `;

        // Las firmas se muestran en los cuadros del footer, no aquí

        // Obtener todas las firmas del documento
        const firmasArray = doc.firmas ? Object.values(doc.firmas) : [];
        console.log('Firmas encontradas en el documento:', firmasArray.length, firmasArray);
        console.log('Creador del documento:', doc.creadoPor);
        
        // Identificar firma del encargado (creador del documento)
        let firmaEncargado = null;
        let firmaEncargadoDibujo = null;
        let nombreEncargado = doc.creadoPorNombre || 'Encargado';
        
        if (firmasArray.length > 0 && doc.creadoPor) {
            // Buscar la firma del creador del documento
            firmaEncargado = firmasArray.find(f => f.userId === doc.creadoPor);
            if (firmaEncargado) {
                firmaEncargadoDibujo = firmaEncargado.firmaDibujo || null;
                nombreEncargado = firmaEncargado.nombre;
                console.log('Firma del encargado encontrada:', nombreEncargado, 'con dibujo:', !!firmaEncargadoDibujo);
            } else {
                console.log('El creador no ha firmado aún');
            }
        }
        
        // Identificar firma del empleado (primera firma que no sea del encargado)
        let firmaEmpleado = null;
        let firmaEmpleadoDibujo = null;
        let nombreEmpleado = null;
        
        // Si hay firmas pero no se encontró encargado, usar la primera como encargado
        if (!firmaEncargado && firmasArray.length > 0) {
            firmaEncargado = firmasArray[0];
            firmaEncargadoDibujo = firmaEncargado.firmaDibujo || null;
            nombreEncargado = firmaEncargado.nombre;
            console.log('Usando primera firma como encargado:', nombreEncargado);
            
            // Si hay más de una firma, la segunda es el empleado
            if (firmasArray.length > 1) {
                firmaEmpleado = firmasArray[1];
                firmaEmpleadoDibujo = firmaEmpleado.firmaDibujo || null;
                nombreEmpleado = firmaEmpleado.nombre;
                console.log('Usando segunda firma como empleado:', nombreEmpleado);
            }
        } else if (firmaEncargado && firmasArray.length > 1) {
            // Si hay encargado y hay más firmas, buscar la primera que no sea del encargado
            firmaEmpleado = firmasArray.find(f => f.userId !== doc.creadoPor);
            if (firmaEmpleado) {
                firmaEmpleadoDibujo = firmaEmpleado.firmaDibujo || null;
                nombreEmpleado = firmaEmpleado.nombre;
                console.log('Firma del empleado encontrada:', nombreEmpleado, 'con dibujo:', !!firmaEmpleadoDibujo);
            } else {
                console.log('No se encontró firma de empleado (todas las firmas son del encargado)');
            }
        } else if (firmasArray.length > 0 && !firmaEncargado) {
            // Si no hay encargado pero hay firmas, usar la primera como encargado y la segunda como empleado
            firmaEncargado = firmasArray[0];
            firmaEncargadoDibujo = firmaEncargado.firmaDibujo || null;
            nombreEncargado = firmaEncargado.nombre;
            if (firmasArray.length > 1) {
                firmaEmpleado = firmasArray[1];
                firmaEmpleadoDibujo = firmaEmpleado.firmaDibujo || null;
                nombreEmpleado = firmaEmpleado.nombre;
            }
        }
        
        html += `
                <!-- FOOTER - Dos cuadros de firma -->
                <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-family: Arial, sans-serif;">
                    <div style="display: flex; justify-content: space-between; gap: 30px; flex-wrap: wrap;">
                        <!-- Cuadro izquierdo: Firma del encargado -->
                        <div style="flex: 1; min-width: 250px; text-align: center;">
                            <p style="font-size: 13px; font-weight: bold; margin-bottom: 15px; color: #000; font-family: Arial, sans-serif;">Firma del encargado del comunicado</p>
                            <div style="border: 2px dashed #1565c0; border-radius: 8px; padding: 20px; background: white; min-height: 120px; position: relative; display: flex; align-items: center; justify-content: center;">
                                ${firmaEncargadoDibujo ? `
                                    <img src="${firmaEncargadoDibujo}" alt="Firma encargado" style="max-width: 100%; max-height: 120px; display: block;" />
                                ` : `
                                    <p style="color: #999; font-size: 11px; font-style: italic; font-family: Arial, sans-serif;">Firma no disponible</p>
                                `}
                            </div>
                            ${firmaEncargado ? `
                                <div style="text-align: center; font-size: 11px; color: #666; margin-top: 10px; font-family: Arial, sans-serif;">
                                    <p style="margin: 3px 0; font-family: Arial, sans-serif;"><strong>${firmaEncargado.nombre}</strong></p>
                                    <p style="margin: 3px 0; font-family: Arial, sans-serif;">${ROLES[firmaEncargado.rol]?.nombre || firmaEncargado.rol}</p>
                                </div>
                            ` : `
                                <div style="text-align: center; font-size: 11px; color: #666; margin-top: 10px; font-family: Arial, sans-serif;">
                                    <p style="margin: 3px 0; font-family: Arial, sans-serif;"><strong>${nombreEncargado}</strong></p>
                                </div>
                            `}
                        </div>
                        
                        <!-- Cuadro derecho: Firma del empleado -->
                        <div style="flex: 1; min-width: 250px; text-align: center;">
                            <p style="font-size: 13px; font-weight: bold; margin-bottom: 15px; color: #000; font-family: Arial, sans-serif;">Firma del empleado</p>
                            <div style="border: 2px dashed #1565c0; border-radius: 8px; padding: 20px; background: white; min-height: 120px; position: relative; display: flex; align-items: center; justify-content: center;">
                                ${firmaEmpleadoDibujo ? `
                                    <img src="${firmaEmpleadoDibujo}" alt="Firma empleado" style="max-width: 100%; max-height: 120px; display: block;" />
                                ` : `
                                    <p style="color: #999; font-size: 11px; font-style: italic; font-family: Arial, sans-serif;">Firma no disponible</p>
                                `}
                            </div>
                            ${firmaEmpleado ? `
                                <div style="text-align: center; font-size: 11px; color: #666; margin-top: 10px; font-family: Arial, sans-serif;">
                                    <p style="margin: 3px 0; font-family: Arial, sans-serif;"><strong>${firmaEmpleado.nombre}</strong></p>
                                    <p style="margin: 3px 0; font-family: Arial, sans-serif;">${ROLES[firmaEmpleado.rol]?.nombre || firmaEmpleado.rol}</p>
                                </div>
                            ` : `
                                <div style="text-align: center; font-size: 11px; color: #999; margin-top: 10px; font-family: Arial, sans-serif;">
                                    <p style="margin: 3px 0; font-family: Arial, sans-serif; font-style: italic;">Sin firmar</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;

        return html;
    }

    // Obtener texto de destinatarios
    static getRecipientsText(doc) {
        // Si hay firmas requeridas, mostrar información
        if (doc.firmasRequeridas && doc.firmasRequeridas.length > 0) {
            return 'Personal requerido para firma';
        }
        const dep = DEPARTAMENTOS[doc.departamento];
        return dep ? `Personal de ${dep.nombre}` : 'Personal';
    }

    // Limpiar HTML y convertir a texto plano
    static stripHTML(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // Generar PDF de solicitud de permiso sin goce de salario
    static async generateRequestPDF(req) {
        try {
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = '210mm';
            tempDiv.style.maxWidth = '800px';
            tempDiv.style.padding = '20mm';
            tempDiv.style.backgroundColor = 'white';
            tempDiv.style.fontFamily = 'Arial, sans-serif';
            document.body.appendChild(tempDiv);

            tempDiv.innerHTML = this.createRequestHTML(req);

            await this.waitForImages(tempDiv);

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const canvas = await html2canvas(tempDiv, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 800
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

            document.body.removeChild(tempDiv);

            const safeName = (req.solicitanteNombre || req.id || 'solicitud').replace(/\s+/g, '_');
            const fecha = new Date().toISOString().split('T')[0];
            const fileName = `Permiso_Sin_Goce_${safeName}_${fecha}.pdf`;
            pdf.save(fileName);

            return { success: true, fileName };
        } catch (error) {
            console.error('Error generando PDF de solicitud:', error);
            return { success: false, message: error.message };
        }
    }

    // Crear HTML profesional para cualquier tipo de solicitud
    static createRequestHTML(req) {
        const datos = req.datos || {};
        const empresa = APP_CONFIG?.appName || 'La empresa';
        const nombreCompleto = req.solicitanteNombre || 'Empleado';
        const depNombre = DEPARTAMENTOS[req.departamento]?.nombre || 'su departamento';

        const fechaSolicitud = new Date(req.fechaSolicitud);
        const fechaSolicitudShort = fechaSolicitud.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const firmaEmpleado = req.firma || null;
        const firmaAdmin = req.firmaAdmin || null;

        const estadoBadgeColor = req.estado === 'aprobada' ? '#2e7d32' : req.estado === 'rechazada' ? '#c62828' : '#e65100';
        const estadoTexto = req.estado === 'aprobada' ? 'APROBADA' : req.estado === 'rechazada' ? 'RECHAZADA' : 'PENDIENTE';

        const { titulo, bodyHTML } = this.getRequestBodyHTML(req);

        return `
        <div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 20px; position: relative; min-height: 100vh;">
            <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: 0; pointer-events: none; width: 100%; text-align: center;">
                <img src="img/empresa_marca_agua.jpg" alt="Marca de agua" style="width: 80%; height: auto; object-fit: contain;" />
            </div>

            <div style="position: relative; z-index: 1;">
                <!-- HEADER -->
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #1a237e;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                            <div style="flex-shrink: 0;">
                                <img src="img/empresa_marca_agua.jpg" alt="Logo" style="width: 85px; height: 85px; object-fit: contain;" />
                            </div>
                            <div style="display: flex; flex-direction: column; justify-content: center; padding-top: 10px;">
                                <div style="font-size: 17px; font-weight: bold; color: #1a237e; text-transform: uppercase; line-height: 1.2; margin-bottom: 4px;">VETERINARIA SAN MARTIN DE PORRES</div>
                                <div style="font-size: 12px; color: #555;">Cédula Jurídica: 3-105-761559</div>
                            </div>
                        </div>
                        <div style="text-align: right; font-size: 12px; color: #333; line-height: 1.8; padding-top: 10px;">
                            <div><strong>Fecha:</strong> ${fechaSolicitudShort}</div>
                            <div><strong>Solicitante:</strong> ${nombreCompleto}</div>
                            <div><strong>Departamento:</strong> ${depNombre}</div>
                            <div style="margin-top: 4px;">
                                <span style="background: ${estadoBadgeColor}; color: white; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">${estadoTexto}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TÍTULO -->
                <div style="text-align: center; margin-bottom: 28px;">
                    <h1 style="font-size: 17px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1a237e; margin: 0 0 4px 0; border-bottom: 1px solid #c5cae9; padding-bottom: 8px; display: inline-block;">${titulo}</h1>
                </div>

                <!-- CUERPO -->
                <div style="font-size: 13px; line-height: 1.8; text-align: justify; margin-bottom: 20px;">
                    ${bodyHTML}
                    ${req.justificacion ? `
                    <div style="padding: 10px 14px; background: #fff8e1; border-left: 3px solid #f9a825; border-radius: 0 4px 4px 0; margin-top: 16px;">
                        <strong style="font-size: 12px;">Comentario del administrador:</strong>
                        <p style="margin: 4px 0 0; font-size: 12px;">${req.justificacion}</p>
                    </div>` : ''}
                </div>

                <!-- CUADROS DE FIRMA -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #1a237e;">
                    <div style="display: flex; justify-content: space-between; gap: 24px;">
                        <div style="flex: 1; text-align: center; border: 1px solid #c5cae9; border-radius: 8px; padding: 16px; background: #fafafa;">
                            <p style="font-size: 11px; font-weight: bold; margin: 0 0 10px; color: #1a237e; text-transform: uppercase; letter-spacing: 0.8px;">Firma del Solicitante</p>
                            <div style="border: 2px dashed #1565c0; border-radius: 6px; padding: 10px; background: white; min-height: 90px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                                ${firmaEmpleado?.firmaDibujo
                                    ? `<img src="${firmaEmpleado.firmaDibujo}" alt="Firma empleado" style="max-width: 100%; max-height: 80px;" />`
                                    : `<p style="color: #bbb; font-size: 11px; font-style: italic; margin: 0;">Sin firma registrada</p>`}
                            </div>
                            <p style="font-size: 12px; font-weight: bold; margin: 4px 0; color: #000;">${firmaEmpleado?.nombre || nombreCompleto}</p>
                            <p style="font-size: 11px; color: #555; margin: 2px 0;">${depNombre}</p>
                            ${firmaEmpleado?.fecha ? `<p style="font-size: 10px; color: #888; margin: 2px 0;">${new Date(firmaEmpleado.fecha).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                        </div>
                        <div style="flex: 1; text-align: center; border: 1px solid #c5cae9; border-radius: 8px; padding: 16px; background: #fafafa;">
                            <p style="font-size: 11px; font-weight: bold; margin: 0 0 10px; color: #1a237e; text-transform: uppercase; letter-spacing: 0.8px;">Firma del Administrador</p>
                            <div style="border: 2px dashed #1565c0; border-radius: 6px; padding: 10px; background: white; min-height: 90px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                                ${firmaAdmin?.firmaDibujo
                                    ? `<img src="${firmaAdmin.firmaDibujo}" alt="Firma admin" style="max-width: 100%; max-height: 80px;" />`
                                    : `<p style="color: #bbb; font-size: 11px; font-style: italic; margin: 0;">Sin firma registrada</p>`}
                            </div>
                            <p style="font-size: 12px; font-weight: bold; margin: 4px 0; color: #000;">${firmaAdmin?.nombre || (req.respondidoPorNombre || 'Administrador')}</p>
                            <p style="font-size: 11px; color: #555; margin: 2px 0;">${firmaAdmin?.rol ? (ROLES[firmaAdmin.rol]?.nombre || firmaAdmin.rol) : 'Administrador'}</p>
                            ${firmaAdmin?.fecha ? `<p style="font-size: 10px; color: #888; margin: 2px 0;">${new Date(firmaAdmin.fecha).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // Devuelve { titulo, bodyHTML } según el tipo de solicitud
    static getRequestBodyHTML(req) {
        const datos = req.datos || {};
        const empresa = APP_CONFIG?.appName || 'La empresa';
        const nombre = req.solicitanteNombre || 'Empleado';
        const dep = DEPARTAMENTOS[req.departamento]?.nombre || 'su departamento';

        const fSolLong = new Date(req.fechaSolicitud).toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });
        const toDate = (str) => str ? new Date(str + 'T12:00:00').toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' }) : '_____';
        const motivo = datos.motivo || '_______________________________________________';

        const fi = toDate(datos.fecha_inicio);
        const ff = toDate(datos.fecha_fin);
        const dias = (datos.fecha_inicio && datos.fecha_fin)
            ? `${RequestManager.calcDays(datos.fecha_inicio, datos.fecha_fin)} día(s)` : '_____';

        const cierre = `
            <p style="margin-bottom: 14px;">Declaro que la información aquí consignada es veraz y asumo la responsabilidad correspondiente.</p>
            <p style="margin-bottom: 30px;">En Costa Rica, a los <strong>${fSolLong}</strong>.</p>`;

        switch (req.tipo) {
            case 'sin_goce':
                return {
                    titulo: 'SOLICITUD DE PERMISO SIN GOCE SALARIAL',
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio solicito formalmente un permiso sin goce de salario.</p>
                        <p style="margin-bottom:14px;">El permiso se solicita para el período comprendido desde el día <strong>${fi}</strong> hasta el día <strong>${ff}</strong>, para un total de <strong>${dias}</strong> calendario, de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica y las disposiciones emitidas por el Ministerio de Trabajo y Seguridad Social, así como las políticas internas de ${empresa}.</p>
                        <p style="margin-bottom:6px;"><strong>Motivo del permiso:</strong></p>
                        <p style="margin-bottom:14px;padding:8px 12px;background:#f5f5f5;border-left:3px solid #1a237e;border-radius:0 4px 4px 0;font-style:italic;">${motivo}</p>
                        <p style="margin-bottom:14px;">Manifiesto que entiendo y acepto que durante este período no devengaré salario ni beneficios salariales asociados, y que el puesto de trabajo, así como las obligaciones y responsabilidades, se mantienen vigentes al término del presente permiso, de acuerdo con la normativa laboral costarricense y la normativa interna de ${empresa}.</p>
                        ${cierre}`
                };

            case 'vacaciones': {
                const obs = datos.observaciones ? `<p style="margin-bottom:6px;"><strong>Observaciones:</strong></p><p style="margin-bottom:14px;padding:8px 12px;background:#f5f5f5;border-left:3px solid #1a237e;border-radius:0 4px 4px 0;">${datos.observaciones}</p>` : '';
                return {
                    titulo: 'SOLICITUD DE DISFRUTE DE VACACIONES',
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio solicito formalmente el disfrute de mis vacaciones acumuladas.</p>
                        <p style="margin-bottom:14px;">El período de vacaciones solicitado comprende desde el día <strong>${fi}</strong> hasta el día <strong>${ff}</strong>, para un total de <strong>${dias}</strong> calendario, de conformidad con el artículo 59 del Código de Trabajo de la República de Costa Rica y las disposiciones aplicables en materia de descanso remunerado. Entiendo que el disfrute de vacaciones es un derecho irrenunciable reconocido por la legislación laboral costarricense.</p>
                        ${obs}
                        <p style="margin-bottom:14px;">Manifiesto que he coordinado con mi jefatura inmediata la cobertura de mis funciones durante el período de ausencia, a fin de no afectar la continuidad de los servicios de ${empresa}. Asimismo, me comprometo a dejar debidamente documentadas las labores pendientes y a estar disponible en la medida de lo posible para cualquier consulta urgente que pudiera surgir durante mi ausencia.</p>
                        ${cierre}`
                };
            }

            case 'ingreso_posterior': {
                const fecha = toDate(datos.fecha);
                const hora = datos.hora_ingreso || '_____';
                return {
                    titulo: 'SOLICITUD DE INGRESO POSTERIOR',
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio notifico formalmente que el día <strong>${fecha}</strong> realizaré mi ingreso de forma posterior al horario habitual establecido.</p>
                        <div style="margin-bottom:14px;padding:10px 14px;background:#f5f5f5;border-radius:4px;">
                            <p style="margin:0;"><strong>Hora de ingreso:</strong> ${hora}</p>
                        </div>
                        <p style="margin-bottom:6px;"><strong>Motivo:</strong></p>
                        <p style="margin-bottom:14px;padding:8px 12px;background:#f5f5f5;border-left:3px solid #1a237e;border-radius:0 4px 4px 0;font-style:italic;">${motivo}</p>
                        <p style="margin-bottom:14px;">Manifiesto que tomaré las medidas necesarias para compensar el tiempo de ausencia de conformidad con las políticas internas de ${empresa} y lo dispuesto en el Código de Trabajo. Entiendo que los ingresos posteriores deben ser debidamente justificados y que la empresa podrá solicitar los comprobantes que estime convenientes. Me comprometo a cumplir con la jornada laboral correspondiente y a no afectar el normal desarrollo de las actividades del departamento.</p>
                        ${cierre}`
                };
            }

            case 'salida_anticipada': {
                const fecha = toDate(datos.fecha);
                const hora = datos.hora_salida || '_____';
                return {
                    titulo: 'SOLICITUD DE SALIDA ANTICIPADA',
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio solicito formalmente autorización para retirarme antes del horario laboral establecido.</p>
                        <div style="margin-bottom:14px;padding:10px 14px;background:#f5f5f5;border-radius:4px;">
                            <p style="margin:0 0 4px;"><strong>Fecha:</strong> ${fecha}</p>
                            <p style="margin:0;"><strong>Hora de salida anticipada:</strong> ${hora}</p>
                        </div>
                        <p style="margin-bottom:6px;"><strong>Motivo:</strong></p>
                        <p style="margin-bottom:14px;padding:8px 12px;background:#f5f5f5;border-left:3px solid #1a237e;border-radius:0 4px 4px 0;font-style:italic;">${motivo}</p>
                        <p style="margin-bottom:14px;">Manifiesto que coordinaré con mi jefatura la compensación del tiempo correspondiente de conformidad con las políticas internas de ${empresa}. Entiendo que la salida anticipada queda sujeta a las necesidades del servicio y al criterio del superior inmediato. Me comprometo a dejar en orden las labores bajo mi responsabilidad y a reponer las horas no trabajadas según lo acordado con la empresa.</p>
                        ${cierre}`
                };
            }

            case 'cambio_horario': {
                const fecha = toDate(datos.fecha);
                const actual = datos.horario_actual || '_____';
                const solicitado = datos.horario_solicitado || '_____';
                return {
                    titulo: 'SOLICITUD DE CAMBIO DE HORARIO',
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio solicito formalmente la modificación de mi horario de trabajo.</p>
                        <div style="margin-bottom:14px;padding:10px 14px;background:#f5f5f5;border-radius:4px;">
                            <p style="margin:0 0 4px;"><strong>Horario actual:</strong> ${actual}</p>
                            <p style="margin:0 0 4px;"><strong>Horario solicitado:</strong> ${solicitado}</p>
                            <p style="margin:0;"><strong>Fecha de aplicación:</strong> ${fecha}</p>
                        </div>
                        <p style="margin-bottom:6px;"><strong>Motivo del cambio:</strong></p>
                        <p style="margin-bottom:14px;padding:8px 12px;background:#f5f5f5;border-left:3px solid #1a237e;border-radius:0 4px 4px 0;font-style:italic;">${motivo}</p>
                        <p style="margin-bottom:14px;">Manifiesto que el cambio de horario solicitado no afectará negativamente el desempeño de mis funciones ni la prestación de los servicios de ${empresa}, y me comprometo a cumplir con la totalidad de las horas laborales establecidas. Entiendo que la modificación del horario queda sujeta a la aprobación de la jefatura y a las necesidades operativas de la organización. Una vez aprobado, me comprometo a cumplir de manera puntual y responsable el nuevo horario.</p>
                        ${cierre}`
                };
            }

            case 'estudio': {
                const inst = datos.institucion || '_____';
                return {
                    titulo: 'SOLICITUD DE PERMISO DE ESTUDIO',
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio solicito formalmente un permiso para actividades de formación académica.</p>
                        <div style="margin-bottom:14px;padding:10px 14px;background:#f5f5f5;border-radius:4px;">
                            <p style="margin:0 0 4px;"><strong>Institución educativa:</strong> ${inst}</p>
                            <p style="margin:0;"><strong>Período:</strong> desde el día ${fi} hasta el día ${ff}, para un total de ${dias}.</p>
                        </div>
                        <p style="margin-bottom:6px;"><strong>Motivo:</strong></p>
                        <p style="margin-bottom:14px;padding:8px 12px;background:#f5f5f5;border-left:3px solid #1a237e;border-radius:0 4px 4px 0;font-style:italic;">${motivo}</p>
                        <p style="margin-bottom:14px;">El presente permiso se solicita de conformidad con lo establecido en el Código de Trabajo de la República de Costa Rica respecto a permisos de capacitación y estudio, así como las políticas internas de ${empresa}. Manifiesto que la formación que recibiré contribuirá a mi desarrollo profesional y, en consecuencia, al mejor desempeño de mis labores. Me comprometo a coordinar con mi jefatura las fechas de ausencia y a no afectar el normal desarrollo de las actividades del departamento.</p>
                        ${cierre}`
                };
            }

            case 'dias_festivos': {
                const fecha = toDate(datos.fecha);
                const desc = datos.descripcion || '_____';
                return {
                    titulo: 'NOTIFICACIÓN DE DÍA FESTIVO',
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio registro formalmente la siguiente ausencia por día festivo, de conformidad con el calendario oficial de días feriados de la República de Costa Rica y con lo dispuesto en el Código de Trabajo en materia de descansos obligatorios.</p>
                        <div style="margin-bottom:14px;padding:10px 14px;background:#f5f5f5;border-radius:4px;">
                            <p style="margin:0 0 4px;"><strong>Fecha:</strong> ${fecha}</p>
                            <p style="margin:0;"><strong>Descripción:</strong> ${desc}</p>
                        </div>
                        <p style="margin-bottom:14px;">La presente notificación tiene como fin dejar constancia formal del día festivo señalado, según lo establecido en el Código de Trabajo y la normativa laboral vigente. Entiendo que en los días feriados de carácter nacional el trabajador tiene derecho al descanso remunerado, salvo las excepciones previstas en la ley. Dejo constancia de que he informado con la debida anticipación a mi jefatura para que se tomen las medidas organizativas que correspondan.</p>
                        <p style="margin-bottom:14px;">Declaro que la información aquí consignada es veraz.</p>
                        <p style="margin-bottom:30px;">En Costa Rica, a los <strong>${fSolLong}</strong>.</p>`
                };
            }

            default:
                return {
                    titulo: (req.tipoNombre || req.tipo || 'SOLICITUD').toUpperCase(),
                    bodyHTML: `
                        <p style="margin-bottom:14px;">Yo, <strong>${nombre}</strong>, quien laboro para <strong>${empresa}</strong>, adscrito(a) al departamento de <strong>${dep}</strong>, por este medio presento la siguiente solicitud de tipo <strong>${req.tipoNombre || req.tipo}</strong>.</p>
                        ${cierre}`
                };
        }
    }
}
