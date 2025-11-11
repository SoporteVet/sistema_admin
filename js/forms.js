/**
 * Forms Manager
 * Handles form rendering, validation, and submission
 */

import db from './database.js';
import auth from './auth.js';
import { showNotification } from './notifications.js';
import formValidation from './form-validation.js';
import VacationCalendar from './vacation-calendar.js';
import templatesManager from './templates.js';

class FormsManager {
    constructor() {
        this.departamentos = [];
        this.vacationCalendar = new VacationCalendar();
        this.loadDepartamentos();
        
        // Estructura de códigos por departamento y categoría
        this.codigosComunicados = {
            // GERENCIA GENERAL - DG-100
            'GG': {
                codigoBase: 'DG-100',
                categorias: {
                    'comunicacion-oficial': {
                        nombre: 'Comunicación Oficial',
                        subcodigos: {
                            'interno': '1.1',
                            'externo': '1.2'
                        }
                    },
                    'memorando': {
                        nombre: 'Memorando',
                        subcodigos: {
                            'interno': '2.1',
                            'externo': '2.2'
                        }
                    },
                    'investigacion': {
                        nombre: 'Investigación',
                        subcodigos: {
                            'interno': '3',
                            'externo': '3'
                        }
                    }
                }
            },
            // FINANZAS - DG-F-101
            'FI': {
                codigoBase: 'DG-F-101',
                categorias: {
                    'comunicacion-oficial': {
                        nombre: 'Comunicación Oficial',
                        subcodigos: {
                            'interno': '1.1',
                            'externo': '1.2'
                        }
                    },
                    'memorando': {
                        nombre: 'Memorando',
                        subcodigos: {
                            'interno': '2.1',
                            'externo': '2.2'
                        }
                    },
                    'prestamo': {
                        nombre: 'Préstamo',
                        subcodigos: {
                            'interno': '3.1',
                            'externo': '3.1'
                        }
                    },
                    'acuerdo-pago': {
                        nombre: 'Acuerdo de Pago',
                        subcodigos: {
                            'prestamo': '4.1',
                            'consumible': '4.2'
                        }
                    }
                }
            },
            // INTERNOS DOCUMENTOS - IN.200
            'IN': {
                codigoBase: 'IN.200',
                categorias: {
                    'comunicacion-oficial': {
                        nombre: 'Comunicación Oficial',
                        subcodigos: {
                            'interno': '1.1',
                            'externo': '1.2'
                        }
                    }
                }
            },
            // RECURSOS HUMANOS - RH.300
            'RH': {
                codigoBase: 'RH.300',
                categorias: {
                    'comunicacion-oficial': {
                        nombre: 'Comunicación Oficial',
                        subcodigos: {
                            'interno': '1.1',
                            'externo': '1.2'
                        }
                    },
                    'memorando': {
                        nombre: 'Memorando',
                        subcodigos: {
                            'interno': '2.1',
                            'externo': '2.2'
                        }
                    },
                    'consentimiento': {
                        nombre: 'Consentimiento',
                        subcodigos: {
                            'liberacion-condicionada': '3.1',
                            'salida-condicionada': '3.2',
                            'salida-24h': '3.3',
                            'internamiento': '3.4',
                            'liberacion': '3.5'
                        }
                    },
                    'informe': {
                        nombre: 'Informe',
                        subcodigos: {
                            'ingreso-paciente': '4.1',
                            'hojas-anestesia': '4.2',
                            'epicrisis': '4.3'
                        }
                    },
                    'norma': {
                        nombre: 'Norma',
                        subcodigos: {
                            'hospitalizacion': '5.1'
                        }
                    }
                }
            },
            // TECNOLOGÍA DE LA INFORMACIÓN - IT-400
            'IT': {
                codigoBase: 'IT-400',
                categorias: {
                    'comunicacion-oficial': {
                        nombre: 'Comunicación Oficial',
                        subcodigos: {
                            'interno': '1.1',
                            'externo': '1.2'
                        }
                    },
                    'memorando': {
                        nombre: 'Memorando',
                        subcodigos: {
                            'interno': '2.1',
                            'externo': '2.2'
                        }
                    },
                    'reporte-tecnico': {
                        nombre: 'Reporte Técnico',
                        subcodigos: {
                            'interno': '3.1',
                            'externo': '3.2'
                        }
                    },
                    'solicitud-sistema': {
                        nombre: 'Solicitud de Sistema',
                        subcodigos: {
                            'nuevo-sistema': '4.1',
                            'mantenimiento': '4.2',
                            'actualizacion': '4.3'
                        }
                    }
                }
            },
            // MERCADEO - MK-500
            'MK': {
                codigoBase: 'MK-500',
                categorias: {
                    'comunicacion-oficial': {
                        nombre: 'Comunicación Oficial',
                        subcodigos: {
                            'interno': '1.1',
                            'externo': '1.2'
                        }
                    },
                    'memorando': {
                        nombre: 'Memorando',
                        subcodigos: {
                            'interno': '2.1',
                            'externo': '2.2'
                        }
                    },
                    'campana': {
                        nombre: 'Campaña',
                        subcodigos: {
                            'lanzamiento': '3.1',
                            'promocion': '3.2',
                            'evento': '3.3'
                        }
                    },
                    'reporte-marketing': {
                        nombre: 'Reporte de Marketing',
                        subcodigos: {
                            'analisis': '4.1',
                            'resultados': '4.2',
                            'proyeccion': '4.3'
                        }
                    }
                }
            },
            // OPERACIONES - OP-600
            'OP': {
                codigoBase: 'OP-600',
                categorias: {
                    'comunicacion-oficial': {
                        nombre: 'Comunicación Oficial',
                        subcodigos: {
                            'interno': '1.1',
                            'externo': '1.2'
                        }
                    },
                    'memorando': {
                        nombre: 'Memorando',
                        subcodigos: {
                            'interno': '2.1',
                            'externo': '2.2'
                        }
                    },
                    'procedimiento': {
                        nombre: 'Procedimiento',
                        subcodigos: {
                            'operativo': '3.1',
                            'seguridad': '3.2',
                            'calidad': '3.3'
                        }
                    },
                    'reporte-operativo': {
                        nombre: 'Reporte Operativo',
                        subcodigos: {
                            'diario': '4.1',
                            'semanal': '4.2',
                            'mensual': '4.3',
                            'incidente': '4.4'
                        }
                    }
                }
            }
        };
        
        // Mapeo de códigos de departamento a claves de códigosComunicados
        this.mapeoDepartamentos = {
            'RH': 'RH',
            'FI': 'FI',
            'IT': 'IT',
            'MK': 'MK',
            'OP': 'OP',
            'GG': 'GG',  // Si existe Gerencia General
            'IN': 'IN'   // Si existe Internos
        };
    }

    /**
     * Load departamentos from database
     */
    async loadDepartamentos() {
        await db.ensureInit();
        this.departamentos = await db.getAll('departamentos');
        this.updateDepartamentoSelects();
    }

    /**
     * Update all departamento select elements
     */
    updateDepartamentoSelects() {
        const selects = document.querySelectorAll('[id*="departamento"]');
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Seleccione...</option>';
            this.departamentos.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.codigo;
                option.textContent = `${dept.codigo} - ${dept.nombre}`;
                select.appendChild(option);
            });
            if (currentValue) {
                select.value = currentValue;
            }
        });
    }

    /**
     * Get codigo configuration for a departamento
     */
    getCodigoConfig(departamento) {
        const deptKey = this.mapeoDepartamentos[departamento] || departamento;
        return this.codigosComunicados[deptKey] || null;
    }

    /**
     * Get available categorias for a departamento
     */
    getCategorias(departamento) {
        const config = this.getCodigoConfig(departamento);
        if (!config) return [];
        return Object.keys(config.categorias).map(key => ({
            key,
            nombre: config.categorias[key].nombre
        }));
    }

    /**
     * Get subcodigos for a categoria
     */
    getSubcodigos(departamento, categoria, tipo) {
        const config = this.getCodigoConfig(departamento);
        if (!config || !config.categorias[categoria]) return null;
        
        const categoriaData = config.categorias[categoria];
        const subcodigos = categoriaData.subcodigos;
        
        // Para categorías que usan tipo (interno/externo)
        if (subcodigos[tipo]) {
            return {
                subcodigo: subcodigos[tipo],
                requiereSubcategoria: false
            };
        }
        
        // Para categorías que requieren subcategoría específica
        return {
            subcodigos: subcodigos,
            requiereSubcategoria: true
        };
    }

    /**
     * Generate unique code for comunicado
     */
    async generateComunicadoCode(departamento, categoria, tipo, subcategoria = null) {
        const config = this.getCodigoConfig(departamento);
        
        // Si no hay configuración, usar formato antiguo
        if (!config) {
            const year = new Date().getFullYear();
            const comunicados = await db.getComunicadosByDepartamento(departamento);
            const yearComunicados = comunicados.filter(c => c.fecha.startsWith(year.toString()));
            const nextNumber = String(yearComunicados.length + 1).padStart(3, '0');
            return `${departamento}-${year}-${nextNumber}`;
        }

        // Obtener subcódigo
        let subcodigo;
        let subcodigoInfo = tipo ? this.getSubcodigos(departamento, categoria, tipo) : null;
        
        // Si no hay info con tipo, verificar si la categoría tiene subcódigos que no dependen del tipo
        if (!subcodigoInfo) {
            const categoriaData = config.categorias[categoria];
            const subcodigos = categoriaData.subcodigos;
            const keys = Object.keys(subcodigos);
            
            // Si tiene subcódigos que no son "interno" o "externo", requiere subcategoría
            if (keys.length > 0 && !keys.includes('interno') && !keys.includes('externo')) {
                if (!subcategoria || !subcodigos[subcategoria]) {
                    throw new Error('Se requiere una subcategoría para esta categoría');
                }
                subcodigo = subcodigos[subcategoria];
            } else {
                throw new Error('No se pudo obtener la configuración de subcódigo');
            }
        } else {
            if (subcodigoInfo.requiereSubcategoria) {
                if (!subcategoria || !subcodigoInfo.subcodigos[subcategoria]) {
                    throw new Error('Se requiere una subcategoría para esta categoría');
                }
                subcodigo = subcodigoInfo.subcodigos[subcategoria];
            } else {
                subcodigo = subcodigoInfo.subcodigo;
            }
        }

        // Obtener número secuencial para este código base + subcódigo
        const codigoBase = `${config.codigoBase}-${subcodigo}`;
        const allComunicados = await db.getAll('comunicados');
        const matchingComunicados = allComunicados.filter(c => 
            c.codigo && c.codigo.startsWith(codigoBase)
        );
        
        const nextNumber = String(matchingComunicados.length + 1).padStart(3, '0');
        return `${codigoBase}-${nextNumber}`;
    }

    /**
     * Update categorias select based on departamento
     */
    updateCategoriasSelect() {
        const departamentoSelect = document.getElementById('comunicado-departamento');
        const categoriaSelect = document.getElementById('comunicado-categoria');
        const categoriaGroup = document.getElementById('comunicado-categoria-group');
        const subcategoriaContainer = document.getElementById('comunicado-subcategoria-container');
        const subcategoriaSelect = document.getElementById('comunicado-subcategoria');
        
        if (!departamentoSelect || !categoriaSelect) {
            console.warn('updateCategoriasSelect: No se encontraron los elementos del formulario');
            return;
        }
        
        const departamento = departamentoSelect.value;
        console.log('updateCategoriasSelect: Departamento seleccionado:', departamento);
        
        // Si no hay departamento seleccionado, ocultar categorías
        if (!departamento) {
            if (categoriaGroup) {
                categoriaGroup.style.display = 'none';
            }
            categoriaSelect.innerHTML = '<option value="">Seleccione...</option>';
            categoriaSelect.required = false;
            categoriaSelect.disabled = true;
            if (subcategoriaContainer) {
                subcategoriaContainer.style.display = 'none';
            }
            if (subcategoriaSelect) {
                subcategoriaSelect.innerHTML = '';
                subcategoriaSelect.required = false;
            }
            return;
        }
        
        const categorias = this.getCategorias(departamento);
        console.log('updateCategoriasSelect: Categorías encontradas:', categorias);
        
        // Limpiar opciones
        categoriaSelect.innerHTML = '<option value="">Seleccione...</option>';
        if (subcategoriaSelect) {
            subcategoriaSelect.innerHTML = '';
        }
        if (subcategoriaContainer) {
            subcategoriaContainer.style.display = 'none';
        }
        
        // Si hay categorías disponibles, mostrar el campo y agregarlas
        if (categorias.length > 0) {
            if (categoriaGroup) {
                categoriaGroup.style.display = 'block';
                console.log('updateCategoriasSelect: Mostrando campo de categoría');
            }
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.key;
                option.textContent = cat.nombre;
                categoriaSelect.appendChild(option);
            });
            categoriaSelect.required = true;
            categoriaSelect.disabled = false;
        } else {
            if (categoriaGroup) {
                categoriaGroup.style.display = 'none';
            }
            categoriaSelect.required = false;
            categoriaSelect.disabled = true;
            console.log('updateCategoriasSelect: No hay categorías para este departamento');
        }
        
        // Actualizar subcategorías si ya hay tipo seleccionado o si la categoría no depende del tipo
        const tipoSelect = document.getElementById('comunicado-tipo');
        if (categoriaSelect.value) {
            this.updateSubcategoriasSelect();
        }
    }

    /**
     * Update subcategorias select based on categoria and tipo
     */
    updateSubcategoriasSelect() {
        const departamentoSelect = document.getElementById('comunicado-departamento');
        const categoriaSelect = document.getElementById('comunicado-categoria');
        const tipoSelect = document.getElementById('comunicado-tipo');
        const subcategoriaContainer = document.getElementById('comunicado-subcategoria-container');
        const subcategoriaSelect = document.getElementById('comunicado-subcategoria');
        
        if (!departamentoSelect || !categoriaSelect || !subcategoriaSelect) return;
        
        const departamento = departamentoSelect.value;
        const categoria = categoriaSelect.value;
        const tipo = tipoSelect ? tipoSelect.value : '';
        
        if (!departamento || !categoria) {
            if (subcategoriaContainer) {
                subcategoriaContainer.style.display = 'none';
            }
            return;
        }
        
        // Si no hay tipo pero la categoría puede requerir subcategoría, intentar obtenerla
        const subcodigoInfo = tipo ? this.getSubcodigos(departamento, categoria, tipo) : null;
        
        // Si no hay info con tipo, verificar si la categoría tiene subcódigos que no dependen del tipo
        if (!subcodigoInfo) {
            const config = this.getCodigoConfig(departamento);
            if (config && config.categorias[categoria]) {
                const categoriaData = config.categorias[categoria];
                const subcodigos = categoriaData.subcodigos;
                
                // Si tiene subcódigos que no son "interno" o "externo", requiere subcategoría
                const keys = Object.keys(subcodigos);
                if (keys.length > 0 && !keys.includes('interno') && !keys.includes('externo')) {
                    subcategoriaSelect.innerHTML = '<option value="">Seleccione...</option>';
                    keys.forEach(key => {
                        const option = document.createElement('option');
                        option.value = key;
                        const nombre = this.getSubcategoriaNombre(departamento, categoria, key);
                        option.textContent = nombre;
                        subcategoriaSelect.appendChild(option);
                    });
                    if (subcategoriaContainer) {
                        subcategoriaContainer.style.display = 'block';
                    }
                    subcategoriaSelect.required = true;
                    return;
                }
            }
            
            if (subcategoriaContainer) {
                subcategoriaContainer.style.display = 'none';
            }
            return;
        }
        
        // Si requiere subcategoría, mostrar el select
        if (subcodigoInfo.requiereSubcategoria) {
            subcategoriaSelect.innerHTML = '<option value="">Seleccione...</option>';
            Object.keys(subcodigoInfo.subcodigos).forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                // Obtener nombre descriptivo de la subcategoría
                const nombre = this.getSubcategoriaNombre(departamento, categoria, key);
                option.textContent = nombre;
                subcategoriaSelect.appendChild(option);
            });
            if (subcategoriaContainer) {
                subcategoriaContainer.style.display = 'block';
            }
            subcategoriaSelect.required = true;
        } else {
            if (subcategoriaContainer) {
                subcategoriaContainer.style.display = 'none';
            }
            subcategoriaSelect.required = false;
        }
    }

    /**
     * Get nombre for subcategoria
     */
    getSubcategoriaNombre(departamento, categoria, subcategoriaKey) {
        const nombres = {
            'prestamo': {
                'prestamo': 'Contrato de préstamo'
            },
            'acuerdo-pago': {
                'prestamo': 'Acuerdo de pago por préstamo',
                'consumible': 'Acuerdo de pago por cobro de consumible'
            },
            'consentimiento': {
                'liberacion-condicionada': 'Consentimiento de liberación condicionada',
                'salida-condicionada': 'Consentimiento de salida condicionada',
                'salida-24h': 'Consentimiento de salida condicionada por 24 horas',
                'internamiento': 'Consentimiento de internamiento',
                'liberacion': 'Consentimiento de liberación'
            },
            'informe': {
                'ingreso-paciente': 'Informe de ingreso de paciente al área de internamiento',
                'hojas-anestesia': 'Hojas de anestesia',
                'epicrisis': 'Epicrisis'
            },
            'norma': {
                'hospitalizacion': 'Normas de hospitalización'
            },
            'solicitud-sistema': {
                'nuevo-sistema': 'Solicitud de nuevo sistema',
                'mantenimiento': 'Solicitud de mantenimiento',
                'actualizacion': 'Solicitud de actualización'
            },
            'campana': {
                'lanzamiento': 'Campaña de lanzamiento',
                'promocion': 'Campaña promocional',
                'evento': 'Campaña de evento'
            },
            'reporte-marketing': {
                'analisis': 'Reporte de análisis de marketing',
                'resultados': 'Reporte de resultados',
                'proyeccion': 'Reporte de proyección'
            },
            'procedimiento': {
                'operativo': 'Procedimiento operativo',
                'seguridad': 'Procedimiento de seguridad',
                'calidad': 'Procedimiento de calidad'
            },
            'reporte-operativo': {
                'diario': 'Reporte operativo diario',
                'semanal': 'Reporte operativo semanal',
                'mensual': 'Reporte operativo mensual',
                'incidente': 'Reporte de incidente'
            }
        };
        
        return nombres[categoria]?.[subcategoriaKey] || subcategoriaKey;
    }

    /**
     * Estimate number of pages for comunicado content
     */
    estimarPaginasComunicado() {
        const contenidoTextarea = document.getElementById('comunicado-contenido');
        const paginasEstimadas = document.getElementById('comunicado-paginas-estimadas');
        const numPaginas = document.getElementById('comunicado-num-paginas');
        
        if (!contenidoTextarea || !paginasEstimadas || !numPaginas) return;
        
        const contenido = contenidoTextarea.value.trim();
        if (!contenido) {
            paginasEstimadas.style.display = 'none';
            return;
        }
        
        // Crear un elemento temporal para medir el contenido
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '800px'; // Ancho del wrapper
        tempDiv.style.fontFamily = 'Arial, Helvetica, sans-serif';
        tempDiv.style.fontSize = '16px';
        tempDiv.style.lineHeight = '1.8';
        tempDiv.style.padding = '2rem';
        tempDiv.style.background = '#ffffff';
        
        // Simular el contenido formateado
        const paragraphs = contenido.split('\n').filter(p => p.trim());
        paragraphs.forEach(p => {
            const pElem = document.createElement('p');
            pElem.style.marginBottom = '1.25rem';
            pElem.textContent = p.trim();
            tempDiv.appendChild(pElem);
        });
        
        document.body.appendChild(tempDiv);
        const contentHeight = tempDiv.scrollHeight;
        document.body.removeChild(tempDiv);
        
        // Calcular páginas (similar a calcularPaginasComunicado)
        // Tamaño A4: 210mm x 297mm
        const A4_HEIGHT_MM = 297;
        const wrapperWidth = 800; // px
        const wrapperWidthMM = 210; // mm
        const scaleFactor = wrapperWidthMM / wrapperWidth;
        const contentHeightMM = contentHeight * scaleFactor;
        
        // Altura usable por página (considerando header, footer y márgenes)
        // Header aprox: 80mm, Footer aprox: 30mm, Márgenes: 20mm
        const headerHeightMM = 80;
        const footerHeightMM = 30;
        const marginMM = 20;
        const usableHeightMM = A4_HEIGHT_MM - headerHeightMM - footerHeightMM - marginMM; // ~167mm
        
        const totalPages = Math.max(1, Math.ceil(contentHeightMM / usableHeightMM));
        
        numPaginas.textContent = totalPages;
        paginasEstimadas.style.display = 'inline';
        
        // Cambiar color si es más de una página
        if (totalPages > 1) {
            paginasEstimadas.style.color = '#3b82f6';
            paginasEstimadas.style.fontWeight = '600';
        } else {
            paginasEstimadas.style.color = '#6b7280';
            paginasEstimadas.style.fontWeight = '400';
        }
    }

    /**
     * Handle comunicado form submission
     */
    async handleComunicadoSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Validate form
        if (!formValidation.validateForm('form-comunicado')) {
            showNotification('Por favor complete todos los campos correctamente', 'error');
            return;
        }
        
        const tipo = document.getElementById('comunicado-tipo').value;
        const departamento = document.getElementById('comunicado-departamento').value;
        const categoria = document.getElementById('comunicado-categoria')?.value || '';
        const subcategoria = document.getElementById('comunicado-subcategoria')?.value || null;
        const para = document.getElementById('comunicado-para').value.trim();
        const de = document.getElementById('comunicado-de').value.trim();
        const asunto = document.getElementById('comunicado-asunto').value.trim();
        const contenido = document.getElementById('comunicado-contenido').value.trim();

        // Validar que si hay categorías disponibles, se haya seleccionado una
        const config = this.getCodigoConfig(departamento);
        if (config && !categoria) {
            showNotification('Por favor seleccione una categoría', 'error');
            return;
        }

        // Show loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Creando...';
        submitBtn.classList.add('btn-loading');

        try {
            const user = auth.getCurrentUser();
            const codigo = await this.generateComunicadoCode(departamento, categoria, tipo, subcategoria);

            const comunicado = {
                codigo,
                tipo,
                departamento,
                categoria: categoria || null,
                subcategoria: subcategoria || null,
                para,
                de,
                asunto,
                contenido,
                usuarioId: user.id,
                usuarioNombre: user.nombre,
                fecha: new Date().toISOString(),
                fechaCreacion: Date.now()
            };

            await db.add('comunicados', comunicado);
            await db.addAuditoria('COMUNICADO_CREATE', { codigo, tipo });

            showNotification('Comunicado creado exitosamente', 'success');
            this.closeModal('modal-comunicado');
            form.reset();
            
            // Reset categorias
            this.updateCategoriasSelect();
            
            // Reload comunicados if on that page
            if (document.getElementById('page-comunicados').style.display !== 'none') {
                window.app?.loadComunicados?.();
            }
        } catch (error) {
            console.error('Error creating comunicado:', error);
            showNotification(error.message || 'Error al crear el comunicado', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.classList.remove('btn-loading');
        }
    }

    /**
     * Handle solicitud form submission
     */
    async handleSolicitudSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Validate form
        if (!formValidation.validateForm('form-solicitud')) {
            showNotification('Por favor complete todos los campos correctamente', 'error');
            return;
        }
        
        const tipo = document.getElementById('solicitud-tipo').value;
        const departamento = document.getElementById('solicitud-departamento').value;

        if (!tipo || !departamento) {
            showNotification('Por favor complete todos los campos requeridos', 'error');
            return;
        }
        
        // Show loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Enviando...';
        submitBtn.classList.add('btn-loading');

        // Validate signature
        let signatureCanvas;
        let signatureCtx;
        
        if (window.signatureManagerSolicitud && window.signatureManagerSolicitud.canvas) {
            signatureCanvas = window.signatureManagerSolicitud.canvas;
            signatureCtx = window.signatureManagerSolicitud.ctx;
        } else {
            signatureCanvas = document.getElementById('signature-canvas-solicitud');
            if (!signatureCanvas) {
                showNotification('Error: No se encontró el panel de firma', 'error');
                return;
            }
            signatureCtx = signatureCanvas.getContext('2d');
        }
        
        // Check if canvas has any drawing (non-white pixels)
        const imageData = signatureCtx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height);
        let hasSignature = false;
        for (let i = 0; i < imageData.data.length; i += 4) {
            // Check if pixel is not white (R, G, B not all 255) or has non-zero alpha
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];
            if ((r !== 255 || g !== 255 || b !== 255) && a > 0) {
                hasSignature = true;
                break;
            }
        }
        
        if (!hasSignature) {
            showNotification('Debe proporcionar su firma digital', 'error');
            return;
        }

        try {
            const user = auth.getCurrentUser();
            let solicitudData = {
                tipo,
                departamento,
                usuarioId: user.id,
                usuarioNombre: user.nombre,
                estado: 'pendiente',
                fecha: new Date().toISOString(),
                fechaCreacion: Date.now()
            };

            // Get fields based on tipo
            if (tipo === 'permiso') {
                const fechaInicio = document.getElementById('permiso-fecha-inicio').value;
                const fechaFin = document.getElementById('permiso-fecha-fin').value;
                const motivo = document.getElementById('permiso-motivo').value.trim();
                
                if (!fechaInicio || !fechaFin || !motivo) {
                    showNotification('Por favor complete todos los campos', 'error');
                    return;
                }

                solicitudData.fechaInicio = fechaInicio;
                solicitudData.fechaFin = fechaFin;
                solicitudData.motivo = motivo;
                solicitudData.dias = this.calculateDays(fechaInicio, fechaFin);
            } else if (tipo === 'vacaciones') {
                const fechaInicio = document.getElementById('vacaciones-fecha-inicio').value;
                const fechaFin = document.getElementById('vacaciones-fecha-fin').value;
                const observaciones = document.getElementById('vacaciones-observaciones').value.trim();
                
                if (!fechaInicio || !fechaFin) {
                    showNotification('Por favor seleccione las fechas', 'error');
                    return;
                }

                // Store dates as YYYY-MM-DD strings to avoid timezone issues
                solicitudData.fechaInicio = fechaInicio;
                solicitudData.fechaFin = fechaFin;
                solicitudData.dias = this.calculateDays(fechaInicio, fechaFin);
                solicitudData.observaciones = observaciones || '';
            } else if (tipo === 'otra') {
                const titulo = document.getElementById('otra-titulo').value.trim();
                const descripcion = document.getElementById('otra-descripcion').value.trim();
                
                if (!titulo || !descripcion) {
                    showNotification('Por favor complete todos los campos', 'error');
                    return;
                }

                solicitudData.titulo = titulo;
                solicitudData.descripcion = descripcion;
            }

            // Save solicitud first to get the ID
            const solicitudId = await db.add('solicitudes', solicitudData);
            
            // Save employee signature - get canvas with correct context
            let signatureData;
            if (window.signatureManagerSolicitud && window.signatureManagerSolicitud.canvas) {
                signatureData = window.signatureManagerSolicitud.canvas.toDataURL('image/png');
            } else {
                signatureData = signatureCanvas.toDataURL('image/png');
            }
            
            await db.add('firmas', {
                solicitudId: solicitudId,
                usuarioId: user.id,
                imagen: signatureData,
                tipo: 'empleado',
                fecha: new Date().toISOString(),
                timestamp: Date.now()
            });

            await db.addAuditoria('SOLICITUD_CREATE', { tipo, usuarioId: user.id, solicitudId });

            showNotification('Solicitud enviada exitosamente', 'success');
            this.closeModal('modal-solicitud');
            form.reset();
            
            // Clear signature
            if (window.signatureManagerSolicitud) {
                window.signatureManagerSolicitud.clear();
            } else {
                signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
            }
            
            // Reload solicitudes if on that page
            if (document.getElementById('page-solicitudes').style.display !== 'none') {
                window.app?.loadSolicitudes?.();
            }
        } catch (error) {
            console.error('Error creating solicitud:', error);
            showNotification('Error al enviar la solicitud', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.classList.remove('btn-loading');
        }
    }

    /**
     * Calculate days between dates (handles date strings correctly)
     */
    calculateDays(startDate, endDate) {
        // Parse date strings (YYYY-MM-DD) correctly without timezone issues
        let start, end;
        
        if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
            const [year, month, day] = startDate.split('-').map(Number);
            start = new Date(year, month - 1, day);
        } else {
            start = new Date(startDate);
        }
        
        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            const [year, month, day] = endDate.split('-').map(Number);
            end = new Date(year, month - 1, day);
        } else {
            end = new Date(endDate);
        }
        
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }

    /**
     * Render solicitud fields based on tipo
     */
    renderSolicitudFields(tipo) {
        const container = document.getElementById('solicitud-fields');
        container.innerHTML = '';

        if (tipo === 'permiso') {
            container.innerHTML = `
                <div class="form-group">
                    <label for="permiso-fecha-inicio">Fecha Inicio *</label>
                    <input type="date" id="permiso-fecha-inicio" required>
                </div>
                <div class="form-group">
                    <label for="permiso-fecha-fin">Fecha Fin *</label>
                    <input type="date" id="permiso-fecha-fin" required>
                </div>
                <div class="form-group">
                    <label for="permiso-motivo">Motivo *</label>
                    <textarea id="permiso-motivo" rows="4" required></textarea>
                </div>
            `;
        } else if (tipo === 'vacaciones') {
            container.innerHTML = `
                <div id="vacation-templates-container"></div>
                <div class="form-group">
                    <label>Calendario de Vacaciones</label>
                    <div id="vacation-calendar-container"></div>
                </div>
                <div class="form-group">
                    <label for="vacaciones-fecha-inicio">Fecha Inicio *</label>
                    <input type="date" id="vacaciones-fecha-inicio" required>
                </div>
                <div class="form-group">
                    <label for="vacaciones-fecha-fin">Fecha Fin *</label>
                    <input type="date" id="vacaciones-fecha-fin" required>
                </div>
                <div class="form-group">
                    <label for="vacaciones-observaciones">Observaciones</label>
                    <textarea id="vacaciones-observaciones" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary save-template-btn" onclick="formsManager.saveTemplatePrompt('vacaciones')">
                        💾 Guardar como Plantilla
                    </button>
                </div>
            `;
            
            // Render templates
            setTimeout(() => {
                templatesManager.renderTemplatesSelector('vacation-templates-container', 'vacaciones');
                this.vacationCalendar.renderCalendar('vacation-calendar-container');
            }, 100);
        } else if (tipo === 'permiso') {
            container.innerHTML = `
                <div id="permiso-templates-container"></div>
                <div class="form-group">
                    <label for="permiso-fecha-inicio">Fecha Inicio *</label>
                    <input type="date" id="permiso-fecha-inicio" required>
                </div>
                <div class="form-group">
                    <label for="permiso-fecha-fin">Fecha Fin *</label>
                    <input type="date" id="permiso-fecha-fin" required>
                </div>
                <div class="form-group">
                    <label for="permiso-motivo">Motivo *</label>
                    <textarea id="permiso-motivo" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary save-template-btn" onclick="formsManager.saveTemplatePrompt('permiso')">
                        💾 Guardar como Plantilla
                    </button>
                </div>
            `;
            
            setTimeout(() => {
                templatesManager.renderTemplatesSelector('permiso-templates-container', 'permiso');
            }, 100);
        } else if (tipo === 'otra') {
            container.innerHTML = `
                <div id="otra-templates-container"></div>
                <div class="form-group">
                    <label for="otra-titulo">Título *</label>
                    <input type="text" id="otra-titulo" required>
                </div>
                <div class="form-group">
                    <label for="otra-descripcion">Descripción *</label>
                    <textarea id="otra-descripcion" rows="6" required></textarea>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-secondary save-template-btn" onclick="formsManager.saveTemplatePrompt('otra')">
                        💾 Guardar como Plantilla
                    </button>
                </div>
            `;
            
            setTimeout(() => {
                templatesManager.renderTemplatesSelector('otra-templates-container', 'otra');
            }, 100);
        }

        // Set min date to today for date inputs (using local date)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        const fechaInicioId = tipo === 'permiso' ? 'permiso-fecha-inicio' : tipo === 'vacaciones' ? 'vacaciones-fecha-inicio' : null;
        const fechaFinId = tipo === 'permiso' ? 'permiso-fecha-fin' : tipo === 'vacaciones' ? 'vacaciones-fecha-fin' : null;
        
        if (fechaInicioId && fechaFinId) {
            container.querySelectorAll('input[type="date"]').forEach(input => {
                input.min = todayStr;
            });
            
            // Setup validation after fields are rendered
            setTimeout(() => {
                const startField = document.getElementById(fechaInicioId);
                const endField = document.getElementById(fechaFinId);
                if (startField && endField) {
                    formValidation.setupDateRangeValidation(fechaInicioId, fechaFinId);
                }
            }, 50);
            
            // Update calendar when dates change
            if (tipo === 'vacaciones') {
                setTimeout(() => {
                    const fechaInicioInput = document.getElementById('vacaciones-fecha-inicio');
                    const fechaFinInput = document.getElementById('vacaciones-fecha-fin');
                    
                    [fechaInicioInput, fechaFinInput].forEach(input => {
                        if (input) {
                            input.addEventListener('change', () => {
                                this.vacationCalendar.renderCalendar('vacation-calendar-container', 
                                    fechaInicioInput.value, fechaFinInput.value);
                            });
                        }
                    });
                }, 200);
            }
        }
    }

    /**
     * Save template prompt
     */
    async saveTemplatePrompt(tipo) {
        const name = prompt('Nombre de la plantilla:');
        if (!name || !name.trim()) return;

        const formData = {};
        
        if (tipo === 'permiso') {
            formData.fechaInicio = document.getElementById('permiso-fecha-inicio')?.value || '';
            formData.fechaFin = document.getElementById('permiso-fecha-fin')?.value || '';
            formData.motivo = document.getElementById('permiso-motivo')?.value || '';
        } else if (tipo === 'vacaciones') {
            formData.fechaInicio = document.getElementById('vacaciones-fecha-inicio')?.value || '';
            formData.fechaFin = document.getElementById('vacaciones-fecha-fin')?.value || '';
            formData.observaciones = document.getElementById('vacaciones-observaciones')?.value || '';
        } else if (tipo === 'otra') {
            formData.titulo = document.getElementById('otra-titulo')?.value || '';
            formData.descripcion = document.getElementById('otra-descripcion')?.value || '';
        }

        // Check if has at least one field filled
        const hasData = Object.values(formData).some(v => v.trim());
        if (!hasData) {
            showNotification('Complete al menos un campo antes de guardar', 'error');
            return;
        }

        await templatesManager.saveTemplate(name.trim(), formData);
        showNotification(`Plantilla "${name}" guardada exitosamente`, 'success');
        
        // Refresh templates list
        const containerId = `${tipo}-templates-container`;
        templatesManager.renderTemplatesSelector(containerId, tipo);
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            // Clear signature when closing solicitud modal
            if (modalId === 'modal-solicitud') {
                const signatureCanvas = document.getElementById('signature-canvas-solicitud');
                if (signatureCanvas && window.signatureManagerSolicitud) {
                    window.signatureManagerSolicitud.clear();
                }
            }
        }
    }

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            
            // Setup form validation
            if (modalId === 'modal-comunicado') {
                // Reset categorias when opening modal
                setTimeout(() => {
                    // Asegurar que los departamentos estén cargados
                    this.updateDepartamentoSelects();
                    // Reset categorias
                    this.updateCategoriasSelect();
                    formValidation.setupFormValidation('form-comunicado');
                }, 100);
            } else if (modalId === 'modal-solicitud') {
                setTimeout(() => {
                    formValidation.setupFormValidation('form-solicitud');
                    this.initializeSolicitudSignature();
                }, 150);
            }
        }
    }

    /**
     * Initialize signature canvas for solicitud form
     */
    initializeSolicitudSignature() {
        const signatureCanvas = document.getElementById('signature-canvas-solicitud');
        if (!signatureCanvas) return;

        // Create or reuse signature manager for solicitud
        if (!window.signatureManagerSolicitud) {
            window.signatureManagerSolicitud = {
                canvas: signatureCanvas,
                ctx: signatureCanvas.getContext('2d'),
                isDrawing: false,
                lastX: 0,
                lastY: 0,
                init: function() {
                    this.setupCanvas();
                    this.setupEvents();
                },
                setupCanvas: function() {
                    const container = signatureCanvas.parentElement;
                    let baseWidth, baseHeight;
                    
                    if (container) {
                        const rect = container.getBoundingClientRect();
                        const availableWidth = rect.width - 64;
                        baseWidth = Math.min(availableWidth, 600);
                        baseHeight = 240;
                    } else {
                        baseWidth = 600;
                        baseHeight = 240;
                    }

                    const dpr = window.devicePixelRatio || 1;
                    signatureCanvas.width = baseWidth * dpr;
                    signatureCanvas.height = baseHeight * dpr;
                    signatureCanvas.style.width = baseWidth + 'px';
                    signatureCanvas.style.height = baseHeight + 'px';
                    this.ctx.scale(dpr, dpr);

                    this.ctx.strokeStyle = '#000000';
                    this.ctx.lineWidth = 1.2;
                    this.ctx.lineCap = 'round';
                    this.ctx.lineJoin = 'round';
                    this.ctx.imageSmoothingEnabled = true;
                    this.ctx.imageSmoothingQuality = 'high';
                },
                getCoordinates: function(e) {
                    const rect = signatureCanvas.getBoundingClientRect();
                    return {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };
                },
                startDrawing: function(e) {
                    this.isDrawing = true;
                    const coords = this.getCoordinates(e);
                    this.lastX = coords.x;
                    this.lastY = coords.y;
                },
                draw: function(e) {
                    if (!this.isDrawing) return;
                    const coords = this.getCoordinates(e);
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.lastX, this.lastY);
                    this.ctx.lineTo(coords.x, coords.y);
                    this.ctx.stroke();
                    this.lastX = coords.x;
                    this.lastY = coords.y;
                },
                stopDrawing: function() {
                    this.isDrawing = false;
                },
                setupEvents: function() {
                    const canvas = this.canvas;
                    const self = this;

                    // Mouse events
                    canvas.addEventListener('mousedown', (e) => self.startDrawing(e));
                    canvas.addEventListener('mousemove', (e) => self.draw(e));
                    canvas.addEventListener('mouseup', () => self.stopDrawing());
                    canvas.addEventListener('mouseout', () => self.stopDrawing());

                    // Touch events for mobile
                    canvas.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const mouseEvent = new MouseEvent('mousedown', {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                        });
                        canvas.dispatchEvent(mouseEvent);
                    });

                    canvas.addEventListener('touchmove', (e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const mouseEvent = new MouseEvent('mousemove', {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                        });
                        canvas.dispatchEvent(mouseEvent);
                    });

                    canvas.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        const mouseEvent = new MouseEvent('mouseup', {});
                        canvas.dispatchEvent(mouseEvent);
                    });
                },
                clear: function() {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }
            };
        }
        
        window.signatureManagerSolicitud.init();
    }
}

// Export singleton instance
const formsManager = new FormsManager();

// Setup form handlers
document.addEventListener('DOMContentLoaded', () => {
    // Comunicado form
    const comunicadoForm = document.getElementById('form-comunicado');
    if (comunicadoForm) {
        comunicadoForm.addEventListener('submit', (e) => formsManager.handleComunicadoSubmit(e));
    }
    
    // Usar delegación de eventos para los selects que pueden no estar disponibles al inicio
    document.addEventListener('change', (e) => {
        // Handle departamento change - update categorias
        if (e.target && e.target.id === 'comunicado-departamento') {
            console.log('Event listener: Cambio en departamento detectado');
            formsManager.updateCategoriasSelect();
        }
        
        // Handle tipo change - update subcategorias
        if (e.target && e.target.id === 'comunicado-tipo') {
            console.log('Event listener: Cambio en tipo detectado');
            formsManager.updateSubcategoriasSelect();
        }
        
        // Handle categoria change - update subcategorias
        if (e.target && e.target.id === 'comunicado-categoria') {
            console.log('Event listener: Cambio en categoría detectado');
            formsManager.updateSubcategoriasSelect();
        }
    });

    // Calcular páginas estimadas mientras se escribe el contenido
    const contenidoTextarea = document.getElementById('comunicado-contenido');
    if (contenidoTextarea) {
        contenidoTextarea.addEventListener('input', () => {
            formsManager.estimarPaginasComunicado();
        });
    }

    // Solicitud form
    const solicitudForm = document.getElementById('form-solicitud');
    if (solicitudForm) {
        solicitudForm.addEventListener('submit', (e) => formsManager.handleSolicitudSubmit(e));
        
        // Handle tipo change
        const tipoSelect = document.getElementById('solicitud-tipo');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', (e) => {
                formsManager.renderSolicitudFields(e.target.value);
            });
        }
    }

    // Modal close handlers
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // New comunicado button
    const btnNewComunicado = document.getElementById('btn-new-comunicado');
    if (btnNewComunicado) {
        btnNewComunicado.addEventListener('click', () => {
            formsManager.openModal('modal-comunicado');
        });
    }

    // New solicitud button
    const btnNewSolicitud = document.getElementById('btn-new-solicitud');
    if (btnNewSolicitud) {
        btnNewSolicitud.addEventListener('click', () => {
            formsManager.openModal('modal-solicitud');
            document.getElementById('solicitud-tipo').value = '';
            formsManager.renderSolicitudFields('');
        });
    }

    // Clear signature button for solicitud form
    const clearSignatureSolicitud = document.getElementById('clear-signature-solicitud');
    if (clearSignatureSolicitud) {
        clearSignatureSolicitud.addEventListener('click', () => {
            if (window.signatureManagerSolicitud) {
                window.signatureManagerSolicitud.clear();
            } else {
                const signatureCanvas = document.getElementById('signature-canvas-solicitud');
                if (signatureCanvas) {
                    const ctx = signatureCanvas.getContext('2d');
                    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
                }
            }
        });
    }
});

window.formsManager = formsManager; // Make globally available for onclick handlers
export default formsManager;

