// ============================================================
// DATA.JS - Datos de configuración y utilidades
// Veterinaria San Martín de Porres - Firebase Edition
// ============================================================

const APP_CONFIG = {
    appName: 'Veterinaria San Martín de Porres',
    appShort: 'VSMP',
    version: '2.0.0'
};

// Flujo en dos pasos: revisión TI (TI-500) → resolución Gerencia General (DG-100)
const SOLICITUD_HORAS_EXTRA_CONFIG = {
    deptoTI: 'TI-500',
    deptoGerencia: 'DG-100',
    tipo: 'horas_extraordinarias'
};

// ============================================================
// DEPARTAMENTOS Y TIPOS DE DOCUMENTOS
// ============================================================
const DEPARTAMENTOS = {
    'TI-500': {
        nombre: 'Tecnologías de Información',
        codigo: 'TI-500',
        color: '#006064',
        icono: 'fas fa-laptop-code',
        categorias: {
            '1': {
                nombre: 'Comunicaciones Oficiales',
                subcategorias: {
                    '1.1': 'Comunicación oficial interna',
                    '1.2': 'Comunicación oficial externa'
                }
            }
        }
    },
    'DG-100': {
        nombre: 'Gerencia General',
        codigo: 'DG-100',
        color: '#1a237e',
        icono: 'fas fa-building',
        categorias: {
            '1': {
                nombre: 'Comunicaciones Oficiales',
                subcategorias: {
                    '1.1': 'Comunicación oficial interna',
                    '1.2': 'Comunicación oficial externa'
                }
            },
            '2': {
                nombre: 'Memorandos',
                subcategorias: {
                    '2.1': 'Memorando interno',
                    '2.2': 'Memorando externo'
                }
            },
            '3': {
                nombre: 'Investigaciones',
                subcategorias: {
                    '3.1': 'Investigación'
                }
            }
        }
    },
    'DG-F-101': {
        nombre: 'Finanzas',
        codigo: 'DG-F-101',
        color: '#0d47a1',
        icono: 'fas fa-chart-line',
        categorias: {
            '1': {
                nombre: 'Comunicaciones Oficiales',
                subcategorias: {
                    '1.1': 'Comunicación oficial interna',
                    '1.2': 'Comunicación oficial externa'
                }
            },
            '2': {
                nombre: 'Memorandos',
                subcategorias: {
                    '2.1': 'Memorando interno',
                    '2.2': 'Memorando externo'
                }
            },
            '3': {
                nombre: 'Préstamo - Adelantos',
                subcategorias: {
                    '3.1': 'Contrato de préstamo',
                    '3.2': 'Contrato Adelanto de Salario',
                    '3.3': 'Contrato de reconocimiento y pago por daños',
                    '3.4': 'Pagaré'
                }
            },
            '4': {
                nombre: 'Acuerdos de Pago',
                subcategorias: {
                    '4.1': 'Acuerdo de pago por préstamo',
                    '4.2': 'Acuerdo de pago por cobro de consumible'
                }
            }
        }
    },
    'IN-200': {
        nombre: 'Internos Documentos',
        codigo: 'IN-200',
        color: '#1b5e20',
        icono: 'fas fa-file-medical',
        categorias: {
            '1': {
                nombre: 'Comunicaciones Oficiales',
                subcategorias: {
                    '1.1': 'Comunicación oficial interna',
                    '1.2': 'Comunicación oficial externa'
                }
            },
            '2': {
                nombre: 'Memorandos',
                subcategorias: {
                    '2.1': 'Memorando interno',
                    '2.2': 'Memorando externo'
                }
            },
            '3': {
                nombre: 'Consentimientos',
                subcategorias: {
                    '3.1': 'Consentimiento de liberación condicionada',
                    '3.2': 'Consentimiento de salida condicionada',
                    '3.3': 'Consentimiento de salida condicionada por 24/48 horas',
                    '3.4': 'Consentimiento de liberación'
                }
            },
            '4': {
                nombre: 'Informes',
                subcategorias: {
                    '4.1': 'Epicrisis'
                }
            },
            '5': {
                nombre: 'Normas',
                subcategorias: {
                    '5.1': 'Normas de hospitalización'
                }
            }
        }
    },
    'RH-300': {
        nombre: 'Recursos Humanos',
        codigo: 'RH-300',
        color: '#e65100',
        icono: 'fas fa-users',
        categorias: {
            '1': {
                nombre: 'Comunicaciones Oficiales',
                subcategorias: {
                    '1.1': 'Comunicación oficial interna',
                    '1.2': 'Comunicación oficial externa'
                }
            },
            '2': {
                nombre: 'Memorandos',
                subcategorias: {
                    '2.1': 'Memorando interno',
                    '2.2': 'Memorando externo'
                }
            },
            '3': {
                nombre: 'Acciones de Ingreso',
                subcategorias: {
                    '3.1': 'Acción de ingreso',
                    '3.2': 'Carta Oferta'
                }
            },
            '4': {
                nombre: 'Contratos',
                subcategorias: {
                    '4.1': 'Indefinido',
                    '4.2': 'Tiempo Definido (SP)'
                }
            },
            '5': {
                nombre: 'Solicitud de Permisos',
                subcategorias: {
                    '5.1': 'Ingreso Posterior',
                    '5.2': 'Salida Anticipada',
                    '5.3': 'Sin goce salarial',
                    '5.4': 'Cambio de Horario',
                    '5.5': 'Estudio',
                    '5.6': 'Disfrute de Vacaciones',
                    '5.7': 'Días Festivos'
                }
            },
            '6': {
                nombre: 'Procesos',
                subcategorias: {
                    '6.1': 'Proceso Disciplinario',
                    '6.1.2': 'Sanciones Disciplinarias',
                    '6.2': 'Aprensivimientos',
                    '6.3': 'Amonestaciones',
                    '6.4': 'Suspensiones'
                }
            },
            '7': {
                nombre: 'Constancias',
                subcategorias: {
                    '7.1': 'Laborales',
                    '7.2': 'Salariales'
                }
            },
            '8': {
                nombre: 'Liquidaciones',
                subcategorias: {
                    '8.1': 'Laborales'
                }
            },
            '9': {
                nombre: 'Despidos',
                subcategorias: {
                    '9.1': 'Despidos Laborales'
                }
            },
            '10': {
                nombre: 'Rebajos de Planilla',
                subcategorias: {
                    '10.1': 'Autorización deducción de planilla'
                }
            }
        }
    },
    'RC-400': {
        nombre: 'Recepción',
        codigo: 'RC-400',
        color: '#4a148c',
        icono: 'fas fa-concierge-bell',
        categorias: {
            '1': {
                nombre: 'Comunicaciones Oficiales',
                subcategorias: {
                    '1.1': 'Comunicación oficial interna',
                    '1.2': 'Comunicación oficial externa'
                }
            },
            '2': {
                nombre: 'Memorandos',
                subcategorias: {
                    '2.1': 'Memorando interno',
                    '2.2': 'Memorando externo'
                }
            },
            '3': {
                nombre: 'Consentimientos',
                subcategorias: {
                    '3.1': 'Consentimiento de internamiento'
                }
            },
            '4': {
                nombre: 'Informes',
                subcategorias: {
                    '4.1': 'Informe de ingreso de paciente al área de internamiento',
                    '4.2': 'Hojas de anestesia'
                }
            },
            '5': {
                nombre: 'Solicitudes laborales',
                subcategorias: {
                    '5.1': 'Reporte y autorización de horas extraordinarias (RC.400.5.1)'
                }
            }
        }
    }
};

// ============================================================
// ROLES DEL SISTEMA
// ============================================================
const ROLES = {
    'admin': {
        nombre: 'Administrador',
        permisos: ['todo'],
        descripcion: 'Acceso total al sistema'
    },
    'encargado': {
        nombre: 'Encargado de Área',
        permisos: ['crear_documento', 'firmar_documento', 'aprobar_solicitud', 'ver_documentos', 'gestionar_area'],
        descripcion: 'Gestiona su departamento, aprueba solicitudes'
    },
    'empleado': {
        nombre: 'Empleado',
        permisos: ['ver_documentos', 'solicitar_vacaciones', 'solicitar_permisos', 'firmar_documento'],
        descripcion: 'Acceso básico, solicitudes y visualización'
    }
};

// ============================================================
// TIPOS DE SOLICITUDES
// ============================================================
const TIPOS_SOLICITUD = {
    'vacaciones': {
        nombre: 'Disfrute de Vacaciones',
        icono: 'fas fa-umbrella-beach',
        color: '#00897b',
        campos: ['cedula', 'puesto', 'fecha_ingreso', 'fecha_inicio', 'fecha_fin', 'observaciones']
    },
    'sin_goce': {
        nombre: 'Permiso Sin Goce de Salario',
        icono: 'fas fa-calendar-times',
        color: '#f4511e',
        campos: ['fecha_inicio', 'fecha_fin', 'motivo', 'observaciones']
    },
    'ingreso_posterior': {
        nombre: 'Ingreso Posterior',
        icono: 'fas fa-clock',
        color: '#5c6bc0',
        campos: ['fecha', 'hora_ingreso', 'motivo']
    },
    'salida_anticipada': {
        nombre: 'Salida Anticipada',
        icono: 'fas fa-sign-out-alt',
        color: '#8e24aa',
        campos: ['fecha', 'hora_salida', 'motivo']
    },
    'cambio_horario': {
        nombre: 'Cambio de Horario',
        icono: 'fas fa-exchange-alt',
        color: '#00acc1',
        campos: ['fecha', 'horario_actual', 'horario_solicitado', 'motivo']
    },
    'estudio': {
        nombre: 'Permiso de Estudio',
        icono: 'fas fa-graduation-cap',
        color: '#43a047',
        campos: ['fecha_inicio', 'fecha_fin', 'institucion', 'motivo']
    },
    'dias_festivos': {
        nombre: 'Días Festivos',
        icono: 'fas fa-star',
        color: '#fdd835',
        campos: ['fecha', 'descripcion']
    },
    'horas_extraordinarias': {
        nombre: 'Horas extraordinarias',
        icono: 'fas fa-business-time',
        color: '#37474f',
        campos: ['cedula', 'puesto', 'area_departamento', 'jefatura_inmediata', 'filas_horas'],
        flujoTiGerencia: true
    }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function generateVerificationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function formatDate(dateStr) {
    if (!dateStr) return '';

    // Si viene en formato de input date (YYYY-MM-DD), evitar problemas de zona horaria
    const simpleDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (simpleDateMatch) {
        const year = parseInt(simpleDateMatch[1], 10);
        const month = parseInt(simpleDateMatch[2], 10);
        const day = parseInt(simpleDateMatch[3], 10);
        const meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return `${day} de ${meses[month - 1]} de ${year}`;
    }

    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
    return formatDate(dateStr);
}

// Convierte un snapshot de Firebase a un array de objetos
function snapshotToArray(snapshot) {
    const arr = [];
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            arr.push({ id: child.key, ...child.val() });
        });
    }
    return arr;
}
