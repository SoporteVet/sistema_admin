# Sistema Administrativo

Sistema administrativo completo construido con HTML5, CSS3 y JavaScript vanilla (ES6+), con almacenamiento local mediante IndexedDB para grandes volúmenes de datos y localStorage para configuraciones.

## Características Principales

### 🔐 Sistema de Autenticación
- Autenticación basada en tokens JWT almacenados en localStorage
- Sesiones que expiran automáticamente (8 horas)
- Encriptación de contraseñas usando Web Crypto API
- Roles: Usuario Regular y Administrador

### 📢 Módulo de Comunicados Digitales
- Generación automática de códigos únicos por departamento (ej: "IT-2025-001")
- Plantillas digitales personalizables
- Clasificación entre comunicados internos y externos
- Sistema de búsqueda y filtrado por departamento, fecha y tipo
- Exportación a PDF (preparado para implementación)

### 📝 Sistema de Solicitudes Digitales
- **Permisos sin goce de salario**: Formulario con campos de fecha inicio/fin, motivo, departamento
- **Vacaciones**: Selector de fechas con calendario, días solicitados, observaciones
- **Otras solicitudes**: Plantilla flexible personalizable
- Validación en tiempo real con JavaScript moderno
- Previsualización antes de enviar

### ⚙️ Panel Administrativo
- Dashboard con estadísticas en tiempo real
- Lista de solicitudes con estados: Pendiente (amarillo), Aprobada (verde), Rechazada (rojo)
- Filtros por departamento, tipo de solicitud, rango de fechas y empleado
- Vista detallada de cada solicitud con historial de cambios
- Sistema de aprobación con firma digital obligatoria
- Campo obligatorio para justificación cuando se rechaza una solicitud
- Registro de auditoría completo

### ✍️ Firma Digital
- Implementación usando Canvas API nativo de JavaScript
- Soporte para dispositivos móviles (touch events)
- Almacenamiento como imagen base64 en IndexedDB
- Timestamp y ID del usuario que firmó

### 📱 Diseño Responsive
- Enfoque Mobile-First
- CSS Grid y Flexbox para layouts adaptativos
- Desktop (>1024px): Sidebar fija, tabla completa
- Tablet (768-1024px): Sidebar colapsable, tarjetas en grid de 2 columnas
- Móvil (<768px): Menú hamburguesa, tarjetas apiladas verticalmente

## Estructura del Proyecto

```
sistema-administrativo/
├── index.html              # Archivo principal HTML
├── css/
│   ├── main.css           # Estilos principales y layout
│   ├── forms.css          # Estilos para formularios y modales
│   ├── dashboard.css      # Estilos para dashboard y tarjetas
│   └── responsive.css     # Media queries y diseño responsive
├── js/
│   ├── app.js             # Controlador principal de la aplicación
│   ├── auth.js            # Gestión de autenticación
│   ├── database.js        # Operaciones con IndexedDB
│   ├── forms.js           # Gestión de formularios
│   ├── signature.js       # Sistema de firma digital
│   └── notifications.js   # Sistema de notificaciones
├── modules/
│   ├── comunicados/       # Módulos específicos (preparado para expansión)
│   ├── solicitudes/
│   └── admin-panel/
└── assets/
    ├── logo.png           # Logo de la empresa (opcional)
    └── fonts/             # Fuentes personalizadas (opcional)
```

## Inicio Rápido

1. **Abrir el sistema**: Simplemente abra `index.html` en un navegador moderno que soporte ES6+ y IndexedDB.

2. **Credenciales por defecto**:
   - Email: `admin@sistema.com`
   - Contraseña: `admin123`

3. **Primera ejecución**: El sistema creará automáticamente:
   - Usuario administrador por defecto
   - Departamentos iniciales (IT, RH, FI, MK, OP)
   - Estructura de base de datos IndexedDB

## Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Grid, Flexbox, Variables CSS, Animaciones
- **JavaScript ES6+**: 
  - Async/await
  - Destructuring
  - Template literals
  - Optional chaining (?.)
  - Nullish coalescing (??)
  - Módulos ES6
- **IndexedDB**: Almacenamiento de grandes volúmenes de datos
- **localStorage**: Configuraciones y tokens de sesión
- **Web Crypto API**: Encriptación de contraseñas
- **Canvas API**: Firma digital

## Seguridad

- Encriptación de contraseñas usando SHA-256
- Tokens JWT con expiración automática
- Validación de datos en cliente
- Sanitización de inputs para prevenir XSS
- Registro de auditoría de todas las acciones administrativas

## Funcionalidades por Rol

### Usuario Regular
- ✅ Crear comunicados
- ✅ Enviar solicitudes de permisos y vacaciones
- ✅ Ver estado de sus peticiones
- ✅ Ver comunicados de su departamento y externos

### Administrador
- ✅ Todas las funciones de usuario regular
- ✅ Acceder al panel administrativo
- ✅ Revisar y aprobar/rechazar solicitudes
- ✅ Ver estadísticas y métricas
- ✅ Gestionar departamentos
- ✅ Ver registro de auditoría

## Flujo de Trabajo Típico

1. Usuario inicia sesión → sistema verifica credenciales y carga perfil
2. Usuario completa formulario de vacaciones → sistema valida y envía
3. Notificación aparece en panel administrativo
4. Administrador revisa solicitud → puede aprobar/rechazar con firma digital
5. Sistema actualiza estado y notifica al usuario
6. Usuario puede ver decisión y justificación en su panel

## Características Modernas JavaScript 2025

- ✅ Async/await para operaciones de base de datos
- ✅ Destructuring para extraer datos de objetos
- ✅ Template literals para generar HTML dinámico
- ✅ Optional chaining (?.) para acceso seguro a propiedades
- ✅ Nullish coalescing (??) para valores por defecto
- ✅ Módulos ES6 para organización del código

## Compatibilidad

El sistema funciona en navegadores modernos que soporten:
- ES6+ (ES2015 y posteriores)
- IndexedDB API
- Web Crypto API
- Canvas API
- CSS Grid y Flexbox

## Notas de Desarrollo

- El sistema está diseñado para funcionar completamente offline
- Los datos se almacenan localmente en el navegador
- Para un entorno de producción, se recomienda implementar un backend para sincronización y respaldo
- La exportación PDF requiere implementación adicional (se recomienda jsPDF)

## Licencia

Este proyecto está disponible para uso interno.

