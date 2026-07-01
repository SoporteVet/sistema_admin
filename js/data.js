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

/** Departamentos en el flujo de quejas/sanciones: Encargado → TI → RRHH → Gerencia */
const SANCTION_FOLLOWUP_DEPT = {
    TI: 'TI-500',
    RRHH: 'RH-300',
    GERENCIA: 'DG-100'
};

/** Valor guardado en doc.para: firmantes = empleados de todos los deptos que el encargado gestiona */
const DOC_PARA_ENCARGADO_TODAS_AREAS = '__ENC_MIS_AREAS__';

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
// EVALUACIONES DE DESEMPEÑO (semestral)
// ============================================================
const EVALUACION_ESCALA = {
    min: 0,
    max: 5,
    etiquetas: {
        5: 'Excelente — supera lo esperado',
        4: 'Muy bueno — cumple muy bien',
        3: 'Bueno — cumple lo esperado',
        2: 'Regular — necesita mejorar',
        1: 'Deficiente — no cumple adecuadamente',
        0: 'No aplica o no hay evidencia suficiente'
    }
};

const EVALUACION_CLASIFICACION = [
    { min: 90, max: 100, categoria: 'Excelente', sugerenciaPersonal: 'Aumento preferencial', sugerenciaJefaturas: 'Aumento preferencial / reconocimiento de liderazgo' },
    { min: 80, max: 89, categoria: 'Muy bueno', sugerenciaPersonal: 'Aumento recomendado', sugerenciaJefaturas: 'Aumento recomendado' },
    { min: 70, max: 79, categoria: 'Bueno', sugerenciaPersonal: 'Aumento básico o moderado', sugerenciaJefaturas: 'Aumento básico o moderado' },
    { min: 60, max: 69, categoria: 'Regular', sugerenciaPersonal: 'Plan de mejora, sin aumento o aumento mínimo', sugerenciaJefaturas: 'Plan de mejora en liderazgo' },
    { min: 0, max: 59, categoria: 'Deficiente', sugerenciaPersonal: 'No aplica al aumento', sugerenciaJefaturas: 'No aplica al aumento / revisión del puesto de jefatura' }
];

const EVALUACION_DESEMPENO_CONFIG = {
    escala: EVALUACION_ESCALA,
    personal: {
        titulo: 'Evaluación de desempeño del personal',
        puntajeMaximo: 100,
        secciones: [
            {
                id: 'A', nombre: 'Puntualidad y asistencia', maxSeccion: 15,
                criterios: [
                    { id: 'A1', texto: 'Cumple con su horario de entrada y salida', max: 5 },
                    { id: 'A2', texto: 'No presenta ausencias injustificadas', max: 5 },
                    { id: 'A3', texto: 'Respeta descansos, turnos asignados y cambios autorizados', max: 5 }
                ]
            },
            {
                id: 'B', nombre: 'Cumplimiento de funciones', maxSeccion: 20,
                criterios: [
                    { id: 'B1', texto: 'Cumple correctamente las funciones propias de su puesto', max: 5 },
                    { id: 'B2', texto: 'Finaliza sus tareas sin necesidad de supervisión constante', max: 5 },
                    { id: 'B3', texto: 'Sigue protocolos internos del área', max: 5 },
                    { id: 'B4', texto: 'Mantiene orden, limpieza y responsabilidad en su área de trabajo', max: 5 }
                ]
            },
            {
                id: 'C', nombre: 'Calidad del trabajo', maxSeccion: 15,
                criterios: [
                    { id: 'C1', texto: 'Realiza su trabajo con cuidado y atención al detalle', max: 5 },
                    { id: 'C2', texto: 'Comete pocos errores o corrige oportunamente', max: 5 },
                    { id: 'C3', texto: 'Mantiene calidad incluso en momentos de alta carga laboral', max: 5 }
                ]
            },
            {
                id: 'D', nombre: 'Actitud y trabajo en equipo', maxSeccion: 15,
                criterios: [
                    { id: 'D1', texto: 'Mantiene una actitud positiva y colaborativa', max: 5 },
                    { id: 'D2', texto: 'Respeta a compañeros, clientes y jefaturas', max: 5 },
                    { id: 'D3', texto: 'Ayuda al equipo y evita generar conflictos', max: 5 }
                ]
            },
            {
                id: 'E', nombre: 'Comunicación interna', maxSeccion: 10,
                criterios: [
                    { id: 'E1', texto: 'Informa problemas, pendientes o situaciones importantes a tiempo', max: 4 },
                    { id: 'E2', texto: 'Usa adecuadamente los canales internos: radio, Argus, correo, WhatsApp laboral u otros', max: 3 },
                    { id: 'E3', texto: 'Se comunica con respeto, claridad y profesionalismo', max: 3 }
                ]
            },
            {
                id: 'F', nombre: 'Servicio al cliente y trato al paciente', maxSeccion: 10,
                criterios: [
                    { id: 'F1', texto: 'Brinda buen trato a los clientes', max: 3 },
                    { id: 'F2', texto: 'Trata a los pacientes con cuidado, respeto y empatía', max: 4 },
                    { id: 'F3', texto: 'Evita quejas por mala atención, descuido o falta de comunicación', max: 3 }
                ]
            },
            {
                id: 'G', nombre: 'Iniciativa y mejora continua', maxSeccion: 10,
                criterios: [
                    { id: 'G1', texto: 'Propone soluciones o mejoras cuando detecta problemas', max: 4 },
                    { id: 'G2', texto: 'Aprende nuevas funciones o mejora sus habilidades', max: 3 },
                    { id: 'G3', texto: 'Se adapta positivamente a cambios de procesos o instrucciones', max: 3 }
                ]
            },
            {
                id: 'H', nombre: 'Compromiso, confidencialidad y normas internas', maxSeccion: 5,
                criterios: [
                    { id: 'H1', texto: 'Cumple normas internas, confidencialidad, uso adecuado de celular, maletines, equipos, medicamentos, documentos y recursos de la veterinaria', max: 5 }
                ]
            }
        ],
        decisionesAdministrativas: [
            { id: 'aplica_aumento', label: 'Aplica para aumento salarial' },
            { id: 'aplica_aumento_moderado', label: 'Aplica para aumento salarial moderado' },
            { id: 'no_aplica', label: 'No aplica por el momento' },
            { id: 'plan_mejora', label: 'Requiere plan de mejora' },
            { id: 'seguimiento_disciplinario', label: 'Requiere seguimiento disciplinario o administrativo' }
        ],
        labelsCualitativos: {
            fortalezas: 'Fortalezas del colaborador',
            areasMejora: 'Áreas de mejora',
            recomendaciones: 'Recomendaciones de la jefatura'
        }
    },
    jefaturas: {
        titulo: 'Evaluación de desempeño para jefaturas',
        puntajeMaximo: 100,
        secciones: [
            {
                id: 'A', nombre: 'Cumplimiento de objetivos del área', maxSeccion: 20,
                criterios: [
                    { id: 'A1', texto: 'El área cumple adecuadamente sus funciones principales', max: 5 },
                    { id: 'A2', texto: 'Se reducen errores, atrasos, quejas o problemas operativos', max: 5 },
                    { id: 'A3', texto: 'Organiza adecuadamente al personal y la distribución de tareas', max: 5 },
                    { id: 'A4', texto: 'Da seguimiento a pendientes importantes del área', max: 5 }
                ]
            },
            {
                id: 'B', nombre: 'Liderazgo y manejo del equipo', maxSeccion: 20,
                criterios: [
                    { id: 'B1', texto: 'Da instrucciones claras, respetuosas y oportunas', max: 5 },
                    { id: 'B2', texto: 'Corrige errores con firmeza, respeto y objetividad', max: 5 },
                    { id: 'B3', texto: 'Evita favoritismos y aplica las normas de forma equitativa', max: 5 },
                    { id: 'B4', texto: 'Promueve un ambiente laboral sano y ordenado', max: 5 }
                ]
            },
            {
                id: 'C', nombre: 'Supervisión y control del área', maxSeccion: 15,
                criterios: [
                    { id: 'C1', texto: 'Supervisa que los protocolos se cumplan', max: 5 },
                    { id: 'C2', texto: 'Detecta problemas antes de que se agraven', max: 5 },
                    { id: 'C3', texto: 'Documenta reportes, errores, mejoras o situaciones relevantes', max: 5 }
                ]
            },
            {
                id: 'D', nombre: 'Comunicación con administración y otras áreas', maxSeccion: 15,
                criterios: [
                    { id: 'D1', texto: 'Informa a administración los problemas importantes a tiempo', max: 5 },
                    { id: 'D2', texto: 'Coordina adecuadamente con otras áreas de la veterinaria', max: 5 },
                    { id: 'D3', texto: 'Brinda reportes claros, verificables y oportunos', max: 5 }
                ]
            },
            {
                id: 'E', nombre: 'Resolución de conflictos', maxSeccion: 10,
                criterios: [
                    { id: 'E1', texto: 'Maneja conflictos sin favoritismos', max: 4 },
                    { id: 'E2', texto: 'Escucha ambas partes antes de tomar decisiones', max: 3 },
                    { id: 'E3', texto: 'Busca soluciones prácticas y evita que los problemas escalen', max: 3 }
                ]
            },
            {
                id: 'F', nombre: 'Cumplimiento de políticas internas y ejemplo personal', maxSeccion: 10,
                criterios: [
                    { id: 'F1', texto: 'Aplica las normas internas de forma pareja y objetiva', max: 4 },
                    { id: 'F2', texto: 'Da el ejemplo en puntualidad, respeto, responsabilidad y actitud', max: 3 },
                    { id: 'F3', texto: 'Respeta los lineamientos de administración, RRHH y gerencia', max: 3 }
                ]
            },
            {
                id: 'G', nombre: 'Desarrollo y acompañamiento del personal', maxSeccion: 10,
                criterios: [
                    { id: 'G1', texto: 'Capacita, orienta o guía al personal bajo su cargo', max: 3 },
                    { id: 'G2', texto: 'Identifica colaboradores con potencial o necesidades de mejora', max: 3 },
                    { id: 'G3', texto: 'Da seguimiento a planes de mejora, errores o necesidades del equipo', max: 4 }
                ]
            }
        ],
        decisionesAdministrativas: [
            { id: 'aplica_aumento', label: 'Aplica para aumento salarial' },
            { id: 'aplica_aumento_moderado', label: 'Aplica para aumento salarial moderado' },
            { id: 'no_aplica', label: 'No aplica por el momento' },
            { id: 'plan_mejora_jefatura', label: 'Requiere plan de mejora como jefatura' },
            { id: 'capacitacion_liderazgo', label: 'Requiere capacitación en liderazgo, comunicación o manejo de personal' },
            { id: 'revision_continuidad', label: 'Requiere revisión de continuidad como jefatura' }
        ],
        labelsCualitativos: {
            fortalezas: 'Fortalezas de la jefatura',
            areasMejora: 'Áreas de mejora',
            recomendaciones: 'Recomendaciones administrativas'
        }
    }
};

function getPlantillaEvaluacion(tipo) {
    return EVALUACION_DESEMPENO_CONFIG[tipo] || null;
}

function getPeriodoSemestreActual(fecha = new Date()) {
    const y = fecha.getFullYear();
    const s = fecha.getMonth() < 6 ? 'S1' : 'S2';
    return `${y}-${s}`;
}

function getPeriodoSemestreLabel(periodoSemestre) {
    if (!periodoSemestre) return '';
    const m = /^(\d{4})-(S1|S2)$/.exec(String(periodoSemestre));
    if (!m) return periodoSemestre;
    return m[2] === 'S1' ? `${m[1]} — 1.er semestre (ene–jun)` : `${m[1]} — 2.º semestre (jul–dic)`;
}

function getPeriodoSemestreRango(periodoSemestre) {
    const m = /^(\d{4})-(S1|S2)$/.exec(String(periodoSemestre || ''));
    if (!m) return { desde: '', hasta: '' };
    const y = m[1];
    if (m[2] === 'S1') return { desde: `${y}-01-01`, hasta: `${y}-06-30` };
    return { desde: `${y}-07-01`, hasta: `${y}-12-31` };
}

function calcularClasificacionDesempeno(tipo, puntajeTotal) {
    const n = Number(puntajeTotal);
    const row = EVALUACION_CLASIFICACION.find((r) => n >= r.min && n <= r.max);
    if (!row) return { categoria: '—', resultadoSugerido: '—' };
    return {
        categoria: row.categoria,
        resultadoSugerido: tipo === 'jefaturas' ? row.sugerenciaJefaturas : row.sugerenciaPersonal
    };
}

function calcularPuntajeEvaluacion(tipo, respuestas, observacionesSecciones = {}) {
    const plantilla = getPlantillaEvaluacion(tipo);
    if (!plantilla) return { puntajeTotal: 0, desgloseSecciones: {}, clasificacion: { categoria: '—', resultadoSugerido: '—' } };
    const resp = respuestas || {};
    const desgloseSecciones = {};
    let puntajeTotal = 0;
    plantilla.secciones.forEach((sec) => {
        let subtotal = 0;
        sec.criterios.forEach((c) => {
            const v = Number(resp[c.id]);
            if (!Number.isNaN(v) && v >= 0) subtotal += Math.min(v, c.max);
        });
        desgloseSecciones[sec.id] = {
            nombre: sec.nombre,
            subtotal,
            max: sec.maxSeccion,
            observaciones: String(observacionesSecciones[sec.id] || '').trim()
        };
        puntajeTotal += subtotal;
    });
    const clasificacion = calcularClasificacionDesempeno(tipo, puntajeTotal);
    return { puntajeTotal, desgloseSecciones, clasificacion };
}

function buildEvaluacionUniqueKey(tipo, periodoSemestre, evaluadorId, evaluadoId) {
    return `${tipo}_${periodoSemestre}_${evaluadorId}_${evaluadoId}`.replace(/[.#$\[\]]/g, '_');
}

/**
 * Jefaturas designadas por departamento para evaluaciones de desempeño (tipo jefaturas).
 * Además de usuarios con rol encargado, estas personas pueden ser evaluadas por el personal del área.
 */
const JEFATURAS_EVALUACION_DESEMPENO = {
    'TI-500': [
        {
            nombreCompleto: 'Aarón Moisés Torrez Moraga',
            puesto: 'Jefatura — Tecnologías de Información'
        }
    ]
};

/** No aparecen en evaluación de desempeño del personal (nombre completo). */
const EXCLUIDOS_EVAL_PERSONAL = [
    'Kharen Moreno'
];

function normalizeNombrePersona(nombre, apellido) {
    return `${nombre || ''} ${apellido || ''}`.trim().replace(/\s+/g, ' ').toLowerCase();
}

function usuarioCoincideNombreCompleto(user, nombreCompleto) {
    if (!user || !nombreCompleto) return false;
    const full = normalizeNombrePersona(user.nombre, user.apellido);
    const target = String(nombreCompleto).trim().replace(/\s+/g, ' ').toLowerCase();
    return full === target;
}

function usuarioExcluidoEvalPersonal(user) {
    if (!user) return true;
    return EXCLUIDOS_EVAL_PERSONAL.some((nombre) => usuarioCoincideNombreCompleto(user, nombre));
}

function usuarioCoincideJefaturaConfig(user, configEntry) {
    if (!user || !configEntry) return false;
    const full = normalizeNombrePersona(user.nombre, user.apellido);
    const target = String(configEntry.nombreCompleto || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!target) return false;
    return full === target;
}

function usuarioEsJefaturaDepartamento(user, codigoDepartamento) {
    if (!user || !codigoDepartamento || user.activo === false) return false;
    if (user.rol === 'encargado' && user.departamento === codigoDepartamento) return true;
    const lista = JEFATURAS_EVALUACION_DESEMPENO[codigoDepartamento] || [];
    return lista.some((j) => usuarioCoincideJefaturaConfig(user, j));
}

function usuarioEsJefaturaEvaluable(user) {
    if (!user || user.activo === false) return false;
    if (user.rol === 'encargado') return true;
    return Object.keys(JEFATURAS_EVALUACION_DESEMPENO).some((dep) =>
        usuarioEsJefaturaDepartamento(user, dep));
}

function getJefaturasEvaluablesEnDepartamento(codigoDepartamento, users, excludeUserId) {
    const map = new Map();
    (users || []).forEach((u) => {
        if (!u.activo || u.id === excludeUserId) return;
        if (usuarioEsJefaturaDepartamento(u, codigoDepartamento)) map.set(u.id, u);
    });
    return [...map.values()];
}

function getAllJefaturasEvaluables(users, excludeUserId) {
    const map = new Map();
    (users || []).forEach((u) => {
        if (!u.activo || u.id === excludeUserId) return;
        if (usuarioEsJefaturaEvaluable(u)) map.set(u.id, u);
    });
    return [...map.values()];
}

function getPuestoJefaturaConfig(user, codigoDepartamento) {
    const lista = JEFATURAS_EVALUACION_DESEMPENO[codigoDepartamento] || [];
    const hit = lista.find((j) => usuarioCoincideJefaturaConfig(user, j));
    return hit?.puesto || user?.puesto || '';
}

/** Puede recibir evaluación de desempeño del personal (empleados + jefaturas, salvo excluidos). */
function usuarioEvaluableDesempenoPersonal(user) {
    if (!user || user.activo === false || usuarioExcluidoEvalPersonal(user)) return false;
    if (user.rol === 'empleado') return true;
    return usuarioEsJefaturaEvaluable(user);
}

function usuarioEvaluablePersonalEnDepartamentos(user, codigosDepartamento) {
    if (!usuarioEvaluableDesempenoPersonal(user)) return false;
    const deps = codigosDepartamento || [];
    if (user.rol === 'empleado') return deps.includes(user.departamento);
    return deps.some((dep) => usuarioEsJefaturaDepartamento(user, dep));
}

function getEvaluadosPersonalEnDepartamentos(codigosDepartamento, users, excludeUserId) {
    const map = new Map();
    (users || []).forEach((u) => {
        if (!u.activo || u.id === excludeUserId) return;
        if (usuarioEvaluablePersonalEnDepartamentos(u, codigosDepartamento)) map.set(u.id, u);
    });
    return [...map.values()];
}

function getAllEvaluadosPersonal(users, excludeUserId) {
    return (users || []).filter((u) =>
        u.activo && u.id !== excludeUserId && usuarioEvaluableDesempenoPersonal(u));
}

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
