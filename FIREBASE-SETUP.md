# 🔥 Guía de Configuración de Firebase

## 📋 Pasos para Configurar Firebase Realtime Database

### 1. **Activar Realtime Database**

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto: `sistema-administrativo-36a03`
3. En el menú lateral, ve a **Realtime Database**
4. Haz clic en **Crear base de datos**
5. Selecciona una ubicación (recomendado: `us-central1` o la más cercana)
6. **IMPORTANTE**: Inicia en modo **"Modo de prueba"** (Test Mode) temporalmente para poder configurar las reglas

### 2. **Aplicar Reglas de Seguridad**

1. En Realtime Database, ve a la pestaña **"Reglas"** (Rules)
2. Copia el contenido completo del archivo `firebase-rules.json`
3. Pega las reglas en el editor de reglas de Firebase
4. Haz clic en **"Publicar"** (Publish)

### 3. **Configurar Authentication**

1. En Firebase Console, ve a **Authentication**
2. Haz clic en **"Comenzar"** (Get Started)
3. Ve a la pestaña **"Sign-in method"**
4. Habilita **"Correo electrónico/Contraseña"** (Email/Password)
5. Activa el método y guarda

### 4. **Estructura de Datos en Realtime Database**

El sistema creará automáticamente esta estructura:

```
sistema-administrativo-36a03-default-rtdb/
├── users/
│   └── {uid}/
│       ├── nombre: string
│       ├── apellido: string
│       ├── email: string
│       ├── rol: "admin" | "encargado" | "empleado"
│       ├── departamento: string (ej: "DG-100")
│       ├── activo: boolean
│       └── fechaCreacion: string (ISO)
│
├── documents/
│   └── {docId}/
│       ├── codigo: string (ej: "RH-300-1.1-001")
│       ├── departamento: string
│       ├── categoria: string
│       ├── subcategoria: string
│       ├── tipoNombre: string
│       ├── titulo: string
│       ├── contenido: string (HTML)
│       ├── creadoPor: string (uid)
│       ├── creadoPorNombre: string
│       ├── fechaCreacion: string
│       ├── estado: "activo" | "eliminado"
│       ├── verificacionCode: string
│       ├── firmasRequeridas: array
│       └── firmas/
│           └── {firmaId}/
│               ├── userId: string
│               ├── nombre: string
│               ├── rol: string
│               ├── departamento: string
│               ├── fecha: string
│               └── codigoVerificacion: string
│
├── requests/
│   └── {reqId}/
│       ├── tipo: string
│       ├── tipoNombre: string
│       ├── solicitante: string (uid)
│       ├── solicitanteNombre: string
│       ├── departamento: string
│       ├── estado: "pendiente" | "aprobada" | "rechazada"
│       ├── fechaSolicitud: string
│       ├── datos: object
│       ├── observaciones: string
│       ├── respondidoPor: string (uid) | null
│       ├── respondidoPorNombre: string | null
│       ├── fechaRespuesta: string | null
│       └── justificacion: string
│
├── notifications/
│   └── {notifId}/
│       ├── tipo: string
│       ├── titulo: string
│       ├── mensaje: string
│       ├── destinatario: string (uid)
│       ├── referencia: string | null
│       ├── referenciaType: "document" | "request" | null
│       ├── fecha: string
│       └── leida: boolean
│
└── counters/
    └── {departamento}/
        └── {subcategoria}/
            └── number (contador incremental)
```

### 5. **Índices Recomendados (Opcional pero Recomendado)**

Para mejorar el rendimiento, crea estos índices en Realtime Database:

1. Ve a **Realtime Database** > **Índices**
2. Agrega estos índices:

```
requests:
  - departamento (ascending)
  - estado (ascending)
  - solicitante (ascending)

notifications:
  - destinatario (ascending)
  - leida (ascending)

users:
  - departamento (ascending)
  - rol (ascending)
```

### 6. **Reglas de Seguridad Explicadas**

#### **users/**
- ✅ **Lectura**: Usuarios pueden leer su propio perfil. Admins pueden leer todos.
- ✅ **Escritura**: Solo admins pueden crear/editar usuarios. Usuarios pueden editar su perfil (sin cambiar rol/departamento).

#### **documents/**
- ✅ **Lectura**: Usuarios pueden leer documentos de su departamento, documentos donde son firmantes requeridos, o documentos que crearon.
- ✅ **Escritura**: Solo admins y encargados pueden crear documentos. Solo el creador o admin puede actualizar.
- ✅ **Firmas**: Cualquier usuario autenticado puede agregar su propia firma (una vez por documento).

#### **requests/**
- ✅ **Lectura**: Usuarios pueden leer sus propias solicitudes. Encargados/admins pueden leer solicitudes de su departamento.
- ✅ **Escritura**: Cualquier usuario puede crear solicitudes. Solo encargados/admins pueden aprobar/rechazar.

#### **notifications/**
- ✅ **Lectura**: Usuarios solo pueden leer sus propias notificaciones.
- ✅ **Escritura**: Solo admins pueden crear notificaciones. Usuarios pueden marcar como leída.

#### **counters/**
- ✅ **Lectura/Escritura**: Solo admins y encargados pueden acceder a los contadores.

### 7. **Probar las Reglas**

Después de aplicar las reglas, puedes probarlas usando el **Simulador de Reglas** en Firebase Console:

1. Ve a **Realtime Database** > **Reglas**
2. Haz clic en **"Simulador de reglas"** (Rules Simulator)
3. Prueba diferentes escenarios:
   - Usuario autenticado leyendo su perfil
   - Admin creando un documento
   - Empleado creando una solicitud
   - Encargado aprobando una solicitud

### 8. **Modo de Producción**

Una vez que todo funcione correctamente:

1. En **Realtime Database** > **Reglas**, asegúrate de que las reglas estén aplicadas
2. **NO uses "Modo de prueba"** en producción - siempre usa reglas personalizadas
3. Considera habilitar **"Bloquear todas las escrituras"** temporalmente si necesitas hacer mantenimiento

### ⚠️ **Importante**

- **NUNCA** dejes la base de datos en modo de prueba en producción
- Las reglas aquí proporcionadas son seguras y permiten el funcionamiento completo del sistema
- Revisa periódicamente los logs de Firebase para detectar accesos no autorizados
- Considera habilitar **Firebase App Check** para mayor seguridad en producción

### 🔒 **Seguridad Adicional Recomendada**

1. **Firebase App Check**: Protege tu app contra abuso
2. **Firebase Security Rules Testing**: Prueba tus reglas antes de publicar
3. **Monitoreo**: Revisa los logs de uso en Firebase Console
4. **Backup**: Configura backups automáticos de Realtime Database

---

## 📞 Soporte

Si tienes problemas con la configuración:
1. Verifica que Authentication esté activado
2. Verifica que Realtime Database esté creada
3. Revisa la consola del navegador para errores
4. Asegúrate de que las reglas estén publicadas correctamente
