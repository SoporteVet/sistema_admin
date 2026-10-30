# Prompt para implementar Documentación TI

Copia desde la siguiente línea hasta el final del archivo en el agente que vaya a desarrollar el módulo.

---

Actúa como desarrollador senior y diseñador de herramientas internas de TI. Implementa un módulo funcional llamado **Documentación TI** en el sistema administrativo de la Veterinaria San Martín de Porres, ubicado en `C:\Users\TI\Documents\sistema_admin-main`.

El objetivo es que el departamento pueda escribir documentación de su trabajo: registrar actividades de soporte, mantenimiento y programación; conservar procedimientos y soluciones; documentar sistemas y cambios; y permitir que otra persona retome el trabajo sin depender de la memoria del autor.

Entrega la implementación local completa y verificable. No te limites a un diseño, una maqueta o una lista de recomendaciones. No despliegues, no escribas en Firebase de producción y no actives servicios de pago. No envíes correos reales durante las pruebas.

## 1. Inspecciona antes de modificar

Lee las instrucciones aplicables y revisa el estado actual de los archivos. Conserva cualquier cambio previo del usuario. Esta copia no tenía un repositorio Git reconocible durante el análisis: comprueba su estado actual, no asumas disponibilidad de ramas, commits o reversión mediante Git.

Lee también `ANALISIS_DOCUMENTACION_TI.md`. Sus hallazgos son una fotografía del código local, no prueba de la configuración desplegada. Verifica antes de apoyarte en ellos.

Revisa especialmente:

- `index.html`: scripts y sección TI, actualmente con Inventario.
- `js/app.js`: navegación, títulos, menú, editor de comunicados y notificaciones.
- `js/data.js`: `TI-500`, roles y `usuarioVeInventario`.
- `js/auth.js`: sesión, perfiles y encargados de varias áreas.
- `js/firebase-config.js`: referencias de Realtime Database.
- `js/documents.js`: modelo de comunicados y firmas, que debe seguir funcionando.
- `js/inventario.js`: equipos y consultas existentes.
- `js/politicas-internas.js`: almacenamiento separado de metadatos y archivos.
- `js/notifications.js`, `js/pdf-generator.js`, `css/styles.css` y `firebase-rules.json`.
- `functions/` y `firebase.json`, solo cuando sean necesarios para la solución.

Presenta brevemente los puntos de integración y continúa con la implementación. Resuelve decisiones rutinarias con criterio y documenta las suposiciones.

## 2. Respeta la arquitectura

El proyecto usa HTML, CSS y JavaScript sin framework, clases globales, Firebase Authentication y Firebase Realtime Database. El departamento TI es `TI-500`. Los roles existentes son `admin`, `encargado` y `empleado`; un encargado puede supervisar TI mediante `departamentosEncargado` aunque su departamento principal sea otro.

- Reutiliza sesión, componentes visuales, mensajes y convenciones existentes.
- Implementa gestores y vistas en archivos dedicados, por ejemplo `js/documentacion-ti.js` y `js/documentacion-ti-ui.js`; usa nombres ajustados al proyecto.
- Mantén en `App` solo los puntos necesarios de integración. Evita agregar otro bloque enorme a `app.js`.
- Añade el acceso Documentación en la sección TI, junto a Inventario. Conserva Inventario y su navegación.
- Crea nodos independientes para este módulo. No mezcles su información con `documents`, solicitudes de personal o seguimiento de sanciones.
- No exijas destinatarios, firmas manuscritas ni códigos personales para documentar una actividad o procedimiento.
- No migres a React, Next.js, Firestore ni otro stack. No incorpores herramientas externas de documentación como dependencia.

## 3. Primera versión: cuatro pestañas

### A. Resumen

Muestra actividades pendientes o en progreso, actividades completadas en el período, documentos en revisión y documentos cuya próxima revisión haya vencido. Incluye accesos a Nueva actividad, Nuevo documento y Nuevo sistema; cambios recientes y filtros de fechas.

Calcula con datos reales autorizados. Si un indicador solo abarca una página de resultados, indícalo; no lo presentes como total global. Distingue error de carga, ausencia de datos y falta de permisos.

### B. Bitácora de actividades

Permite crear, consultar, editar y cerrar actividades. Incluye:

- Título, tipo, descripción del problema o trabajo, responsable y fecha de ejecución.
- Tipos: soporte, mantenimiento, desarrollo, cambio de configuración, respaldo/restauración, instalación y otro.
- Departamento atendido, sistema y equipos relacionados, cuando correspondan.
- Pasos realizados, resultado, tiempo invertido en minutos y seguimiento pendiente, opcionales hasta que sean necesarios.
- Estados: pendiente, en progreso, completada y cancelada. Exige resultado para completar y motivo para cancelar. No confundir la fecha de ejecución con la fecha automática de creación.
- Evidencias opcionales, autor y fechas automáticas de creación y modificación.

Filtra por fecha, tipo, responsable, estado, sistema y equipo. Permite agregar entradas de seguimiento fechadas sin reemplazar silenciosamente las anteriores. Conserva historial de cambios de estado y reasignaciones.

Añade **Crear guía desde esta actividad**: crea un nuevo borrador relacionado y copia solo la información útil, para que el usuario la adapte. Conserva la actividad original. No publiques automáticamente ni conviertas información sensible del caso en conocimiento compartido.

### C. Biblioteca técnica

Permite escribir y mantener documentos directamente dentro del sistema. Cada documento incluye título, resumen, tipo, categoría, etiquetas, responsable de mantenimiento, sistema/equipos relacionados, contenido y próxima fecha de revisión opcional.

Ofrece plantillas editables:

1. **Solución de soporte:** síntomas, entorno, diagnóstico, causa conocida, solución, comprobación y escalamiento.
2. **Procedimiento operativo:** objetivo, requisitos, pasos, resultado esperado, validación y reversión cuando aplique.
3. **Documentación de sistema:** finalidad, componentes, arquitectura, dependencias, ambientes, operación, respaldos y recuperación.
4. **Programación:** repositorio como enlace, preparación local, configuración con nombres de variables sin sus valores secretos, estructura, API, pruebas y despliegue/reversión documentados.
5. **Cambio o mantenimiento:** motivo, alcance, impacto, preparación, ejecución, pruebas, resultado y reversión.
6. **Revisión de incidente:** cronología, impacto, causas, resolución, lecciones y acciones pendientes.
7. **Nota libre:** para conocimiento que no encaje en las anteriores.

No obligues a completar todas las secciones de todas las plantillas. Solo exige título, tipo y contenido útil al enviar a revisión; permite borradores incompletos con un título identificable.

Editor: prioriza Markdown con barra de acciones y vista previa segura, con títulos, listas, listas de comprobación, tablas sencillas, enlaces y bloques de código con lenguaje y botón de copiar. Una persona de soporte debe poder usarlo sin conocer la sintaxis. No insertes el contenido como HTML confiable ni ejecutes comandos, scripts o diagramas aportados por usuarios.

Estados editoriales: borrador, en revisión, publicado y archivado. El autor envía a revisión; administración o el encargado de TI publica o devuelve con comentario. Archivar retira el documento de la consulta habitual y conserva su historia. Restaurar una versión genera una versión nueva, nunca borra las posteriores.

Conserva versiones con autor, fecha y resumen del cambio. No crees versiones por cada pulsación. Al editar un artículo publicado, mantén la edición publicada mientras se prepara y revisa el nuevo borrador; etiqueta claramente qué versión se está mostrando. Las versiones históricas y adjuntos deben tener el mismo control de acceso que el documento.

Permite buscar por título, resumen, etiquetas y código, ignorando mayúsculas y tildes, además de filtrar por tipo, categoría, estado, sistema y responsable. Presenta el alcance real de la búsqueda y de la paginación. No anuncies búsqueda de texto completo si no está implementada sobre todo el conjunto autorizado.

### D. Sistemas

Implementa un catálogo sencillo de aplicaciones, servicios y componentes mantenidos por TI: nombre, descripción, responsable, estado activo/retirado, ambientes y enlaces útiles opcionales. Usa IDs estables y no nombres como claves.

Cada ficha reúne sus documentos y actividades relacionados. Permite enlaces a repositorios o documentación externa con validación de URL, sin integraciones automáticas. Archiva sistemas en uso en lugar de eliminar referencias. Esto debe ser un catálogo pequeño, no una CMDB completa.

## 4. Permisos y confianza de identidad

Implementa la misma política en interfaz, gestores y reglas de Firebase:

| Perfil activo | Lectura | Escritura y gestión |
| --- | --- | --- |
| Administración | Todo el módulo | Gestionar, publicar, archivar y restaurar. |
| Encargado de TI, incluyendo quien supervisa TI desde otra área | Todo el módulo | Gestionar actividades, catálogo y documentos; revisar, publicar y archivar. |
| Empleado de TI | Todo el módulo interno | Crear actividades y documentos; editar actividades propias o asignadas y borradores propios; enviar a revisión. No publicar ni modificar versiones históricas. |
| Persona de otra área, inactiva o sin perfil válido | Sin acceso | Sin acceso. |

En esta versión todos los miembros activos de TI pueden leer los borradores del equipo. No ofrezcas borradores privados sin implementar sus permisos. El uso del módulo no debe conferir permisos sobre otros módulos.

Antes de dar por segura esta política, verifica dos hallazgos locales:

- `documents` concede lectura en el padre a cualquier autenticado. No guardes aquí el nuevo módulo ni copies esa concesión. En RTDB una regla hija no revoca un permiso concedido por el padre, y las reglas no filtran automáticamente una colección.
- Las reglas de creación del perfil propio permiten crear un perfil inexistente con rol admin o departamento TI. Reproduce el caso en el emulador. Si se confirma, corrige de forma acotada el aprovisionamiento y la protección de `rol`, `departamento`, `departamentosEncargado` y `activo`, preservando el alta legítima realizada por administración. No dejes un bootstrap que se pueda reabrir desde el cliente. Documenta cómo se realiza el primer aprovisionamiento de confianza.

No confíes en campos enviados por el navegador para decidir autoría, permisos, publicación o acceso. Las reglas o un backend autorizado deben validar la identidad efectiva, las transiciones permitidas y los campos inmutables. Revalida permisos tras cambios de perfil; no dependas únicamente del menú o del perfil cacheado.

## 5. Datos, concurrencia y archivos

Propón un esquema sencillo con separación de listados/metadatos, contenido, versiones, seguimientos y archivos. Declara límites de campos, tipos, estados y claves permitidas; registra `schemaVersion` para evolución futura. Usa IDs de Firebase y un código legible solo si aporta valor; no copies el fallback de contador basado en el reloj para garantizar unicidad.

- Listados paginados, por ejemplo 25 resultados, con orden estable e índices `.indexOn` compatibles con las consultas reales. No descargues cuerpos, todas las versiones o adjuntos para pintar tarjetas.
- No uses el nodo raíz de todo el módulo como ámbito de transacciones ni descargues todos los equipos y sus PDF para ofrecer un selector. Carga metadatos mínimos.
- Detecta guardados concurrentes mediante una revisión esperada y una comprobación atómica real. Rechaza el guardado obsoleto con opciones para recargar y recuperar el texto. Una lectura seguida de escritura sin condición atómica no es suficiente.
- Guarda de forma coherente contenido, versión y estado; justifica la estrategia escogida para RTDB. Los índices derivados no deben poder otorgar acceso ni falsificar una publicación. Evita operaciones que dejen una publicación sin versión o un historial editable.
- Muestra cambios sin guardar y confirma al abandonar. Un fallo de red conserva el contenido en pantalla y permite reintentar. No muestres éxito antes de confirmar persistencia ni guardes contenido interno indefinidamente en almacenamiento local.
- Los horarios de trabajo se muestran para `America/Costa_Rica`; diferencia fecha de actividad de marcas temporales de auditoría. Las marcas automáticas deben proceder del servidor o validarse con las reglas correspondientes.

Adjuntos de primera versión: PDF, PNG y JPEG, hasta 1 MiB original por archivo, máximo cinco y 5 MiB originales por registro. Valida límites y tipos también en el límite de confianza; verifica el contenido hasta donde permita la arquitectura y no confíes solo en extensión o MIME declarado. Rechaza HTML, SVG y ejecutables. Las imágenes no deben admitir contenido activo.

No asumas que Storage está operativo por existir `storageBucket`. Verifica la configuración sin producción. Si mantienes el patrón RTDB/Base64, separa los archivos de los metadatos y contempla el crecimiento de Base64 en las reglas; exige autorización en cada descarga y evita descargar los archivos durante búsquedas. Documenta los límites y el coste potencial de transferencia. No actives almacenamiento ni planes de pago automáticamente.

Evita enlaces públicos permanentes a archivos internos. Cambiar el estado o archivar un registro no debe dejar archivos accesibles por rutas alternativas. Usa datos ficticios para pruebas, nunca contraseñas, tokens, llaves privadas ni datos personales reales. La documentación debe referenciar el mecanismo autorizado de obtención de credenciales, no almacenar las credenciales.

## 6. Experiencia e integraciones

Usa español natural y la apariencia actual: tipografía, colores, botones, tarjetas y mensajes. Los formularios de documentación deben tener espacio de trabajo suficiente, no un modal estrecho con demasiados campos. Ofrece pestañas de escritura y vista previa, acciones visibles y navegación de vuelta que conserve filtros.

Soporta móvil, etiquetas de formulario, teclado y estados de carga. Muestra mensajes útiles para permiso denegado, fallo de red, validación y conflicto; no presentes fallos como listas vacías.

- Relaciona equipos por ID y ofrece consultar sus intervenciones y documentos desde el detalle del inventario, manteniendo sus funciones actuales.
- Implementa exportación del artículo publicado a Markdown e impresión preparada para PDF. No incluyas borradores, revisiones o adjuntos sin una selección explícita y autorizada. Conserva títulos, código legible y cortes de página razonables.
- Exporta la bitácora filtrada a CSV con fechas, responsable, tipo, sistema, estado y tiempo. Respeta permisos, indica su alcance y neutraliza fórmulas de hoja de cálculo.
- Usa notificaciones internas para asignaciones y solicitud/resolución de revisión, con destinatarios autorizados y navegación al registro correcto. No reutilices `referenciaType: document` para estos registros. Un fallo de notificación no debe duplicar ni invalidar un documento ya guardado.
- No agregues correos, inteligencia artificial, edición simultánea, conexión automática a GitHub, SLA, portal de autoservicio o una mesa de ayuda completa en esta versión.

## 7. Verificación obligatoria

Prueba comportamientos y permisos, usando el emulador para lecturas/escrituras directas, no solo botones ocultos:

1. Un empleado de TI registra una intervención, la completa con resultado y la encuentra por fecha, sistema y equipo.
2. Una actividad genera un borrador de guía sin alterar el registro original.
3. El autor escribe código y tablas, guarda, envía a revisión y un encargado de TI publica.
4. Un encargado que supervisa TI desde otro departamento tiene los permisos previstos; un encargado ajeno a TI no los tiene.
5. Una revisión posterior no reemplaza la edición publicada hasta aprobarla; restaurar conserva las versiones anteriores.
6. Dos editores guardan desde la misma revisión y el segundo recibe un conflicto sin perder su texto.
7. Una cuenta externa a TI, una inactiva y una sin perfil no pueden leer metadatos, contenido, versiones ni archivos mediante acceso directo, consultas o índices.
8. Un empleado no puede publicar, cambiar autoría, alterar el historial, reasignarse privilegios ni crear su perfil como administrador. Comprueba además el alta administrativa legítima.
9. HTML malicioso, URLs con protocolos activos y código aportado se muestran sin ejecutarse, también en vista previa y exportación.
10. Se rechazan adjuntos fuera de tipo, tamaño y cantidad. Un fallo a mitad de guardado deja un estado consistente y recuperable.
11. La búsqueda y las exportaciones corresponden a lo anunciado; los listados no descargan archivos o historiales completos.
12. El menú, inventario, documentos con firmas, solicitudes y notificaciones existentes siguen funcionando.

Usa datos de demostración solo bajo una acción explícita y en el entorno local/emulado; no los cargues automáticamente sobre datos reales. Si no puedes ejecutar una comprobación, declara el límite y deja pasos reproducibles; no la marques como aprobada.

## 8. Entrega

Entrega código y reglas locales, pruebas pertinentes y una guía `DOCUMENTACION_TI.md` con esquema, matriz de permisos, instrucciones de uso, ejecución de pruebas y pasos de despliegue para una aprobación posterior. Enumera dependencias nuevas y sus motivos, sin cambiar el stack.

Incluye un plan de reversión compatible con esta carpeta: copia de los archivos y reglas afectados antes de cambiarlos; posibilidad de ocultar/deshabilitar el módulo sin borrar su documentación; conservación de IDs y referencias. No prometas rollback mediante Git si no existe repositorio ni elimines datos para revertir la interfaz.

Al terminar explica qué funciona, qué archivos cambiaste, qué verificaste y qué queda pendiente de configuración o despliegue. Separa fallos confirmados de riesgos no comprobados. No declares que el módulo ya está publicado ni seguro en producción por haber preparado reglas locales.

Referencias de diseño, sin copiar sus productos completos:

- GLPI: https://help.glpi-project.org/documentation/modules/tools/knowledgebase
- BookStack: https://www.bookstackapp.com/docs/user/organising-content/
- BookStack, permisos: https://www.bookstackapp.com/docs/user/roles-and-permissions/
- Confluence, runbooks: https://www.atlassian.com/software/confluence/templates/devops-runbook
- Confluence, incidentes: https://www.atlassian.com/software/confluence/templates/itsm-post-incident-review
- Firebase, reglas y herencia: https://firebase.google.com/docs/database/security/core-syntax
