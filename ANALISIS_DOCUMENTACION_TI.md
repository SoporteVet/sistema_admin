# Análisis: documentación y actividades del departamento de TI

Fecha: 17 de octubre de 2026.

## Alcance y límites

Revisión estática de los archivos locales para diseñar un módulo integrado. Se consultaron referencias oficiales de herramientas comparables. No se inició sesión, no se consultaron datos de usuarios, no se probaron accesos contra Firebase y no se modificó la aplicación. Los únicos archivos nuevos son este análisis y el prompt de implementación. Esta carpeta no contiene un repositorio Git reconocible; no se dispone de un historial de cambios para comparar.

## Lo que existe y cómo condiciona la propuesta

| Hallazgo confirmado en el código local | Evidencia | Consecuencia para el módulo |
| --- | --- | --- |
| Aplicación de HTML, CSS y JavaScript con clases globales; navegación central en `App`. | `index.html:299`, `js/app.js:187`, `js/app.js:200` | Integrar una nueva vista sin migrar a otro framework. |
| Firebase Authentication y Realtime Database. | `js/firebase-config.js:21`, `js/firebase-config.js:25` | Reutilizar sesión y perfiles; diseñar reglas e índices para RTDB. |
| TI tiene el código `TI-500`; sus categorías iniciales solo incluyen comunicaciones oficiales internas y externas. | `js/data.js:33` | La clasificación actual no cubre procedimientos, mantenimiento ni desarrollo. |
| El menú TI contiene Inventario y se muestra con un control de acceso específico. | `index.html:176`, `js/app.js:307`, `js/data.js:953` | Colocar Documentación TI en esa sección; definir su política propia. |
| Los roles son `admin`, `encargado` y `empleado`, con encargados que pueden supervisar varias áreas. | `js/data.js:286`, `js/auth.js:174` | No crear cuentas ni roles paralelos; contemplar encargados de TI con otro departamento principal. |
| El editor de documentos guarda HTML y el formulario exige al menos un firmante. | `js/app.js:644`, `js/app.js:784`, `js/app.js:800` | No reutilizar directamente el flujo de comunicados para una nota de soporte. |
| Los documentos guardan remitente, destinatario, firmas y código de verificación; sus estados son activo y eliminado. | `js/documents.js:71`, `firebase-rules.json:79` | Crear entidades de conocimiento con borrador, revisión, publicación y versiones. |
| El inventario permite identificar equipos y consultar su información. | `js/inventario.js:6`, `js/inventario.js:46` | Relacionar intervenciones y guías con equipos existentes mediante sus IDs. |
| La biblioteca de políticas separa metadatos y PDF Base64 en RTDB. | `js/politicas-internas.js:1`, `js/firebase-config.js:47` | Hay un precedente para adjuntos pequeños; no copiarlo sin límites de tamaño y descarga. |
| La página carga los SDK de Auth y RTDB; no carga el de Storage. `firebase.json` no define Storage. | `index.html:286`, `firebase.json:1` | `storageBucket` en la configuración no demuestra que exista una integración de archivos operativa. |
| Existen notificaciones con tipo de referencia, pero su navegación reconoce documentos y solicitudes. | `js/notifications.js:38`, `js/app.js:5866` | Añadir destinos propios si se notifican revisiones o asignaciones. |
| Las funciones existentes exportan un disparador de correos para solicitudes. | `functions/index.js:21` | No asumir una API genérica de documentación ya implementada. |

No identifiqué un módulo dedicado de documentación técnica o una mesa de ayuda general en las rutas y gestores revisados. Los registros llamados tickets en seguimiento de sanciones corresponden a casos de personal: no son incidentes técnicos que deban reciclarse para este propósito.

## Dos problemas de permisos relevantes

1. **La lectura de documentos está concedida a cualquier sesión autenticada en el nodo padre.** `firebase-rules.json:48` establece `.read: auth != null`. Las condiciones más estrictas de los documentos hijos no revocan esa concesión. Por tanto, guardar allí documentación técnica interna no ofrecería aislamiento por TI con las reglas locales actuales. Firebase explica esta herencia en su [documentación de reglas](https://firebase.google.com/docs/database/security/core-syntax).
2. **La creación del perfil propio permite elegir atributos de privilegio en las reglas locales.** `firebase-rules.json:10` permite crear `users/{auth.uid}` si aún no existe; `firebase-rules.json:24` acepta los tres roles, incluido admin, y `firebase-rules.json:27` admite cualquier departamento no vacío. Esto deja una vía de autoasignación de privilegios para una cuenta autenticada sin perfil. Debe reproducirse en el emulador y corregirse el límite de confianza antes de considerar seguro un módulo que dependa de esos atributos. No se intentó explotarlo y no se verificaron las reglas desplegadas ni la disponibilidad del registro de cuentas en producción.

## Diseño recomendado

Crear **Documentación TI**, con cuatro pestañas dentro del mismo módulo:

- **Resumen:** actividad reciente, pendientes, documentos en revisión y revisiones vencidas.
- **Bitácora:** qué se hizo, quién lo hizo, cuándo, en qué sistema o equipo y con qué resultado.
- **Biblioteca técnica:** cómo resolver problemas y operar o mantener sistemas, con contenido reutilizable y control de versiones.
- **Sistemas:** fichas sencillas para agrupar documentación e historial por aplicación o servicio.

Ejemplo de uso: registrar una falla de impresión, vincular la impresora del inventario y describir la solución. Desde esa actividad se crea un borrador de guía titulado “Recuperar la impresión de recepción”. La actividad conserva la intervención concreta y la guía contiene los pasos que otra persona puede reutilizar.

### Contenido que debería poder documentarse

| Área | Ejemplos |
| --- | --- |
| Soporte | Síntomas, diagnóstico, solución, comprobación y escalamiento. |
| Mantenimiento | Limpieza, actualizaciones, respaldos, restauraciones y verificaciones. |
| Programación | Arquitectura, instalación local, dependencias, API, pruebas y decisiones técnicas. |
| Cambios | Motivo, impacto, pasos, pruebas, resultado y reversión. |
| Sistemas e infraestructura | Responsables, ambientes, componentes, dependencias y manuales operativos. |
| Conocimiento del departamento | Entrega de funciones, procedimientos recurrentes y lecciones aprendidas. |

La primera versión debe funcionar para TI y administración. Compartir artículos con otras áreas puede añadirse después, con permisos y contenidos aptos para esas audiencias. No hace falta implantar de entrada un sistema completo de tickets, una CMDB, edición simultánea o integraciones de pago.

## Referencias utilizadas

- [GLPI: base de conocimientos](https://help.glpi-project.org/documentation/modules/tools/knowledgebase). Referencia para categorías, búsqueda, adjuntos y separación de conocimiento técnico y ayuda a usuarios.
- [BookStack: organización del contenido](https://www.bookstackapp.com/docs/user/organising-content/) y [roles y permisos](https://www.bookstackapp.com/docs/user/roles-and-permissions/). Referencia para navegación de documentación y control de acciones. Se propone una jerarquía más sencilla para este sistema.
- [Confluence: guía operativa DevOps](https://www.atlassian.com/software/confluence/templates/devops-runbook). Referencia para arquitectura, responsables y procedimientos de operación y diagnóstico.
- [Confluence: revisión posterior a incidentes](https://www.atlassian.com/software/confluence/templates/itsm-post-incident-review). Referencia para registrar impacto, causas y acciones de prevención.
- [Firebase: sintaxis y herencia de reglas](https://firebase.google.com/docs/database/security/core-syntax). Referencia para aislamiento de datos y consultas compatibles con permisos.

Estas referencias inspiran el diseño; no son dependencias ni propuestas de contratar esos productos.
