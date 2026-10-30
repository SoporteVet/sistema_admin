# Documentación TI — guía del módulo

Veterinaria San Martín de Porres. Primera versión local, octubre 2026.

Este módulo no se publica solo por existir en esta carpeta. Las reglas de `firebase-rules.json` hay que desplegarlas en una aprobación posterior. Hasta entonces, la base remota sigue con las reglas que tenga el proyecto en Firebase Console.

## Qué hace

Permite al departamento de Tecnologías de Información (`TI-500`) y a administración:

- Registrar actividades de soporte, mantenimiento, desarrollo y cambios.
- Escribir procedimientos y soluciones en una biblioteca con borrador, revisión, publicación y versiones.
- Mantener un catálogo pequeño de sistemas y relacionarlos con actividades, documentos y equipos del inventario.

No es una mesa de ayuda, no envía correo, no usa Storage ni planes de pago, no conecta GitHub y no incluye inteligencia artificial.

## Puntos de integración

| Superficie | Cambio |
| --- | --- |
| Menú TI | Ítem **Documentación** junto a Inventario. Inventario se conserva. |
| `App` | Navegación, título, notificaciones `doc_ti_*` y aviso de cambios sin guardar. |
| Inventario | Botón para ver intervenciones y documentos del equipo. |
| Perfil | Si cambia rol, departamento o `activo`, se actualiza el menú y se sale del módulo si pierde acceso. |
| RTDB | Nodo nuevo `documentacionTi`. No se mezcla con `documents`, solicitudes ni sanciones. |

## Esquema (`schemaVersion: 1`)

Nodo raíz: `documentacionTi`. Lectura solo para administración, personal activo de TI y encargados que supervisan `TI-500`.

| Ruta | Contenido | Notas |
| --- | --- | --- |
| `config` | `schemaVersion`, `habilitado` | `habilitado: false` oculta el módulo sin borrar datos. |
| `actividadesMeta/{id}` | Título, tipo, estado, fechas, responsable, sistema/equipo, `revision`, `resultadoResumen` | Listados. Sin cuerpo ni archivos. |
| `actividadesCuerpo/{id}` | Descripción, pasos, resultado, seguimiento pendiente | Se carga al abrir. |
| `actividadesSeguimiento/{id}/{eid}` | Entradas fechadas | No reemplazan las anteriores. |
| `actividadesHistorial/{id}/{eid}` | Cambios de estado y reasignaciones | Solo alta, no se edita. |
| `actividadesAdjuntosMeta/{id}/{fid}` | Nombre, MIME, tamaño | Listado de evidencias. |
| `actividadesAdjuntosFiles/{id}/{fid}` | Base64 | Solo al descargar. |
| `articulosMeta/{id}` | Título, resumen, tipo, etiquetas, estado editorial, `publishedVersionId`, `revision` | Listados y búsqueda anunciada. |
| `articulosCuerpo/{id}` | Markdown de trabajo | Borrador actual. |
| `articulosVersiones/{id}/{vid}` | Instantáneas inmutables | Restaurar copia a un borrador nuevo. |
| `articulosAdjuntosMeta` / `Files` | Igual que actividades | Mismo control de acceso que el artículo. |
| `sistemas/{id}` | Nombre, descripción, responsable, estado, ambientes, enlaces | IDs de Firebase, no el nombre como clave. |

Límites: título 200, resumen 500, markdown 50 000, descripción 20 000, resultado 8 000, 20 etiquetas, 10 enlaces. Estados de actividad: `pendiente`, `en_progreso`, `completada`, `cancelada`. Estados de artículo: `borrador`, `en_revision`, `publicado`, `archivado`. Tipos de actividad y plantillas de artículo están en `js/documentacion-ti.js`.

**Concurrencia:** cada guardado de actividad o artículo usa una transacción sobre `revision`. Un segundo guardado con la revisión anterior se rechaza; el texto permanece en pantalla.

**Fechas:** la fecha de ejecución es un día (`YYYY-MM-DD`) en sentido de trabajo. Creación y modificación usan `ServerValue.TIMESTAMP`. La interfaz muestra zona `America/Costa_Rica`.

**Búsqueda y paginación:** 25 filas por página sobre hasta 200 metadatos recientes. No se descargan cuerpos, versiones completas ni adjuntos para pintar tarjetas. La búsqueda ignora mayúsculas y tildes en título, resumen, etiquetas y código de esos metadatos. No es búsqueda de texto completo sobre toda la base.

**Índices `.indexOn`:** `actividadesMeta` (`fechaEjecucionMs`, `estado`, `tipo`, `responsableId`, `sistemaId`, `equipoId`, `actualizadoMs`); `articulosMeta` (`estado`, `tipo`, `categoria`, `responsableId`, `sistemaId`, `actualizadoMs`); `sistemas` (`estado`, `nombre`).

### Adjuntos

PDF, PNG y JPEG. 1 MiB original por archivo, máximo 5 y 5 MiB por registro. Se valida extensión, MIME declarado y cabecera (magic bytes / prefijo Base64). Se rechazan HTML, SVG y ejecutables. Las imágenes se sirven como blob, no como HTML.

`firebase.json` no define Storage. Esta versión guarda Base64 en RTDB, separado de los metadatos. Base64 aumenta el tamaño (~33 %). Un PDF de 1 MiB puede acercarse a 1,4 MB transferidos por descarga. No hay enlaces públicos permanentes: hace falta sesión autorizada.

### Estrategia RTDB para publicar

1. Se escribe una **versión nueva** (alta solamente; las reglas impiden modificar o borrar versiones).
2. Se actualiza el metadato con `publishedVersionId` y `estado: publicado`.
3. El cuerpo de trabajo puede seguir editándose. La edición publicada no se reemplaza hasta una publicación posterior.

Un fallo entre 1 y 2 puede dejar una versión huérfana no publicada. El historial no se reescribe. Un fallo al guardar un adjunto borra su metadato y deja el registro anterior.

Los índices no conceden acceso: cuelgan del mismo padre restringido.

## Matriz de permisos

| Perfil activo | Lectura | Escritura |
| --- | --- | --- |
| Administración | Todo el módulo | Gestionar, publicar, archivar, restaurar, catálogo. |
| Encargado de TI, o encargado de otra área con `departamentosEncargado.TI-500 = true` | Todo el módulo | Igual: actividades, catálogo, revisión, publicación y archivo. |
| Empleado de TI | Todo el módulo interno, incluidos borradores del equipo | Crear actividades y documentos; editar actividades propias o asignadas y borradores propios; enviar a revisión. No publica, no altera versiones históricas, no cambia autoría. |
| Otra área, inactiva o sin perfil | Nada | Nada. |

El uso de este módulo no otorga permisos sobre comunicados, solicitudes, sanciones ni inventario más allá de los que la persona ya tenga.

## Primer aprovisionamiento de confianza

Hallazgo local confirmado en reglas anteriores: un autenticado podía crear `users/{uid}` inexistente con `rol: admin` o departamento TI.

Corrección acotada:

- Solo administración activa crea o cambia `rol`, `departamento`, `departamentosEncargado` y `activo`.
- La persona puede actualizar su perfil sin tocar esos campos.
- El alta por `setup.html` solo aplica si **no hay usuarios** y `provisionamiento/inicialCompletado` no es verdadero; el perfil inicial debe ser `admin` y acto seguido se escribe `provisionamiento/inicialCompletado: true`. Ese flag no vuelve a `false` desde el cliente.

Cómo dar de alta después del primero: pantalla **Usuarios** (administración). Eso usa la sesión admin y `AuthManager.createUser`.

Si el proyecto ya tenía usuarios en producción, hay que desplegar estas reglas y, si el flag no existe, escribir `provisionamiento/inicialCompletado: true` desde la consola de Firebase (como administrador del proyecto), no desde una cuenta de empleado.

## Uso

1. Entre con una cuenta de TI o administración.
2. En el menú **TI → Documentación**.
3. **Resumen:** pendientes, completadas del período, documentos en revisión y revisiones vencidas. Los números indican el alcance de metadatos cargados.
4. **Bitácora:** nueva actividad, filtros, CSV de la página filtrada, seguimiento fechado, crear guía (copia útil a un borrador; no publica).
5. **Biblioteca:** plantillas, Markdown con barra y vista previa, enviar a revisión; el encargado o admin publica o devuelve. Exportar Markdown e imprimir solo la edición publicada.
6. **Sistemas:** ficha con documentos y actividades relacionados. Enlaces `http`/`https` validados, sin integración automática. Archivar como `retirado`.

Datos de demostración: botón visible solo en `localhost` / `127.0.0.1`, acción explícita. No use contraseñas, tokens ni datos personales reales.

## Pruebas locales

```bat
node tests/documentacion-ti.spec.js
```

Cubre Markdown seguro, permisos de perfil, magic bytes, CSV y URLs.

Reglas en emulador (no producción):

```bat
firebase emulators:exec --only database "node tests/documentacion-ti-rules.test.js"
```

El segundo script se omite si el emulador no está en el puerto 9000. Comprueba lecturas denegadas a encargado ajeno e inactivo, lectura de TI, creación de actividad, denegación de versiones al empleado, denegación de auto-ascenso a admin, cierre del bootstrap y alta administrativa.

Comprobaciones de interfaz (con emulador o reglas ya publicadas en un entorno de prueba, nunca escribiendo a producción desde esta tarea):

1. Empleado TI registra, completa con resultado y filtra por fecha, sistema y equipo.
2. Crear guía no altera la actividad.
3. Autor escribe código y tablas, guarda, envía a revisión; encargado publica.
4. Encargado que supervisa TI desde otra área entra; encargado ajeno no.
5. Editar lo publicado no sustituye la edición viva hasta aprobar; restaurar conserva versiones.
6. Dos guardados de la misma revisión: el segundo ve conflicto y no pierde el texto.
7. Cuenta externa, inactiva y sin perfil no leen metadatos, cuerpos, versiones ni archivos.
8. Empleado no publica, no cambia autoría, no edita historial, no se hace admin. El alta admin sí crea un empleado.
9. HTML, `javascript:` y código se muestran sin ejecutarse (vista previa y exportación).
10. Adjuntos fuera de tipo/tamaño/cantidad se rechazan; un fallo de archivo no borra el registro.
11. Búsqueda y CSV declaran su alcance; el listado no baja archivos.
12. Inventario, comunicados con firmas, solicitudes y notificaciones existentes siguen en el menú.

## Ocultar o revertir la interfaz

1. Copias anteriores: `backups/documentacion-ti-20261017/`.
2. Ocultar sin borrar datos: `DOCUMENTACION_TI_UI_HABILITADA = false` en `js/data.js`, o `documentacionTi/config/habilitado = false`.
3. Quitar el ítem de menú en `index.html` y el `case` en `app.js` si hace falta.
4. No hay repositorio Git en esta carpeta: no use `git` para revertir. Restaure los archivos del directorio `backups`.
5. No elimine `documentacionTi` para “apagar” el módulo: se perderían IDs y referencias.

## Despliegue (aprobación posterior)

1. Revisar `firebase-rules.json` y esta guía.
2. `firebase deploy --only database` cuando administración lo autorice. **No se ejecutó en esta implementación.**
3. Publicar los JS/HTML/CSS en el hosting que ya use el sistema.
4. Confirmar en consola que Storage sigue sin activarse si no hay un proyecto de archivos aparte.
5. Crear `documentacionTi/config` con `{ "schemaVersion": 1, "habilitado": true }`.

## Dependencias nuevas

Ninguna en la aplicación. Sigue HTML, CSS, JavaScript, Firebase Auth y Realtime Database. El Markdown se interpreta en el cliente sin librerías. Las pruebas usan Node ya presente.

## Límites de esta entrega

- Las reglas locales no demuestran las reglas desplegadas.
- El selector de equipos reutiliza el inventario existente; ese nodo aún puede incluir PDFs de cartas en la misma ruta, limitación previa.
- Las notificaciones de este módulo las puede crear personal de TI hacia destinatarios de TI o admin; el fallo de notificación no deshace el guardado.
- `NotificationManager` de comunicados oficiales no se reutilizó con `referenciaType: document`.
