// ============================================================
// AUTH.JS - Firebase Authentication + User Profile Management
// Veterinaria San Martín de Porres
// ============================================================

class AuthManager {
    static currentUser = null;      // Firebase Auth user
    static currentProfile = null;   // Profile from Realtime DB
    static _profileListener = null;

    // Escucha cambios en el estado de autenticación
    static initAuthListener(callback) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                // Cargar perfil del usuario desde Realtime Database
                await this.loadProfile(user.uid);
                if (this.currentProfile) {
                    callback(true);
                } else {
                    callback(false);
                }
            } else {
                this.currentUser = null;
                this.currentProfile = null;
                callback(false);
            }
        });
    }

    // Cargar perfil de usuario desde RTDB
    static async loadProfile(uid) {
        try {
            const snapshot = await dbRef.users.child(uid).once('value');
            if (snapshot.exists()) {
                this.currentProfile = { id: uid, ...snapshot.val() };
            } else {
                this.currentProfile = null;
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
            this.currentProfile = null;
        }
    }

    // Escuchar cambios en tiempo real del perfil
    static listenProfile(uid) {
        if (this._profileListener) {
            dbRef.users.child(this._profileListener).off();
        }
        this._profileListener = uid;
        dbRef.users.child(uid).on('value', (snapshot) => {
            if (snapshot.exists()) {
                this.currentProfile = { id: uid, ...snapshot.val() };
            }
        });
    }

    static getDefaultLoginDomain() {
        // Dominio por defecto para login por usuario (se puede cambiar sin tocar lógica)
        return 'vetsanmartin.com';
    }

    static buildEmailFromUsername(username) {
        const cleanUser = String(username || '').trim().toLowerCase();
        const storedDomain = localStorage.getItem('loginEmailDomain');
        const defaultDomain = this.getDefaultLoginDomain();
        const domain = String(storedDomain || defaultDomain).trim().toLowerCase();
        return `${cleanUser}@${domain}`;
    }

    static async resolveLoginEmail(usernameOrEmail) {
        const rawValue = String(usernameOrEmail || '').trim().toLowerCase();
        if (!rawValue) {
            return { success: false, message: 'Ingrese su usuario' };
        }

        if (rawValue.includes('@')) {
            return { success: true, email: rawValue };
        }

        return { success: true, email: this.buildEmailFromUsername(rawValue) };
    }

    // Login con usuario (o correo) y password
    static async login(usernameOrEmail, password) {
        try {
            const emailResult = await this.resolveLoginEmail(usernameOrEmail);
            if (!emailResult.success) {
                return emailResult;
            }

            const email = emailResult.email;
            const result = await auth.signInWithEmailAndPassword(email, password);
            this.currentUser = result.user;
            await this.loadProfile(result.user.uid);

            if (!this.currentProfile) {
                return { success: false, message: 'Perfil de usuario no encontrado en la base de datos' };
            }
            if (!this.currentProfile.activo) {
                await auth.signOut();
                return { success: false, message: 'Su cuenta está desactivada. Contacte al administrador.' };
            }

            const profileEmail = String(this.currentProfile.email || '').toLowerCase();
            if (profileEmail.includes('@')) {
                const domain = profileEmail.split('@')[1];
                if (domain) localStorage.setItem('loginEmailDomain', domain);
            }

            this.listenProfile(result.user.uid);
            return { success: true, user: this.currentProfile };
        } catch (error) {
            console.error('Error login:', error);
            let msg = 'Error al iniciar sesión';
            switch (error.code) {
                case 'auth/user-not-found': msg = 'No existe una cuenta con ese usuario'; break;
                case 'auth/wrong-password': msg = 'Contraseña incorrecta'; break;
                case 'auth/invalid-email': msg = 'Usuario o correo inválido'; break;
                case 'auth/user-disabled': msg = 'Esta cuenta ha sido deshabilitada'; break;
                case 'auth/too-many-requests': msg = 'Demasiados intentos. Intente más tarde'; break;
                case 'auth/invalid-credential': msg = 'Credenciales incorrectas'; break;
            }
            return { success: false, message: msg };
        }
    }

    // Logout
    static async logout() {
        try {
            if (this._profileListener) {
                dbRef.users.child(this._profileListener).off();
                this._profileListener = null;
            }
            await auth.signOut();
            this.currentUser = null;
            this.currentProfile = null;
        } catch (error) {
            console.error('Error logout:', error);
        }
    }

    // Obtener usuario actual (perfil completo)
    static getUser() {
        return this.currentProfile;
    }

    // Verificar permisos
    static hasPermission(permission) {
        if (!this.currentProfile) return false;
        const role = ROLES[this.currentProfile.rol];
        if (!role) return false;
        return role.permisos.includes('todo') || role.permisos.includes(permission);
    }

    static isAdmin() {
        return this.currentProfile && this.currentProfile.rol === 'admin';
    }

    static isEncargado() {
        return this.currentProfile && (this.currentProfile.rol === 'encargado' || this.currentProfile.rol === 'admin');
    }

    static getUserDepartment() {
        return this.currentProfile ? this.currentProfile.departamento : null;
    }

    // ========================================================
    // CRUD de Usuarios (Admin)
    // ========================================================

    // Obtener todos los usuarios
    static async getAllUsers() {
        try {
            console.log('Obteniendo usuarios de Firebase...');
            const snapshot = await dbRef.users.once('value');
            console.log('Snapshot recibido:', snapshot.exists() ? 'existe' : 'no existe');
            
            if (!snapshot.exists()) {
                console.log('No hay usuarios en la base de datos');
                return [];
            }
            
            const users = snapshotToArray(snapshot);
            console.log(`Usuarios encontrados: ${users.length}`, users);
            return users;
        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            console.error('Detalles del error:', error.code, error.message);
            return [];
        }
    }

    // Obtener usuario por ID
    static async getUserById(uid) {
        try {
            const snapshot = await dbRef.users.child(uid).once('value');
            if (snapshot.exists()) {
                return { id: uid, ...snapshot.val() };
            }
            return null;
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            return null;
        }
    }

    // Crear usuario (Firebase Auth + perfil en RTDB)
    static async createUser(userData) {
        try {
            // Guardar el usuario actual antes de crear uno nuevo
            const currentUserAuth = auth.currentUser;
            const currentEmail = this.currentProfile.email;
            const currentPassword = userData._adminPassword; // necesitamos esto para re-autenticar

            // Crear usuario en Firebase Auth
            // Usamos la API REST de Firebase Auth para no desloguear al admin
            const response = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: userData.email,
                        password: userData.password,
                        returnSecureToken: false
                    })
                }
            );

            const result = await response.json();

            if (result.error) {
                let msg = 'Error al crear usuario';
                if (result.error.message === 'EMAIL_EXISTS') msg = 'Ya existe una cuenta con ese correo';
                if (result.error.message === 'WEAK_PASSWORD') msg = 'La contraseña debe tener al menos 6 caracteres';
                if (result.error.message === 'INVALID_EMAIL') msg = 'Correo electrónico inválido';
                return { success: false, message: msg };
            }

            const newUid = result.localId;

            // Crear perfil en Realtime Database
            const profile = {
                nombre: userData.nombre,
                apellido: userData.apellido,
                email: userData.email,
                rol: userData.rol,
                departamento: userData.departamento,
                activo: true,
                fechaCreacion: new Date().toISOString()
            };
            if (userData.cedula) profile.cedula = String(userData.cedula).trim();
            if (userData.puesto) profile.puesto = String(userData.puesto).trim();
            if (userData.fechaIngreso) profile.fechaIngreso = String(userData.fechaIngreso).trim();

            await dbRef.users.child(newUid).set(profile);

            return { success: true, user: { id: newUid, ...profile } };
        } catch (error) {
            console.error('Error creando usuario:', error);
            return { success: false, message: 'Error al crear usuario: ' + error.message };
        }
    }

    // Actualizar perfil de usuario en RTDB
    static async updateUser(uid, updates) {
        try {
            // No enviar campos undefined o internos
            const cleanUpdates = {};
            if (updates.nombre !== undefined) cleanUpdates.nombre = updates.nombre;
            if (updates.apellido !== undefined) cleanUpdates.apellido = updates.apellido;
            if (updates.email !== undefined) cleanUpdates.email = updates.email;
            if (updates.rol !== undefined) cleanUpdates.rol = updates.rol;
            if (updates.departamento !== undefined) cleanUpdates.departamento = updates.departamento;
            if (updates.activo !== undefined) cleanUpdates.activo = updates.activo;
            if (updates.cedula !== undefined) cleanUpdates.cedula = updates.cedula;
            if (updates.puesto !== undefined) cleanUpdates.puesto = updates.puesto;
            if (updates.fechaIngreso !== undefined) cleanUpdates.fechaIngreso = updates.fechaIngreso;

            await dbRef.users.child(uid).update(cleanUpdates);

            // Si es el usuario actual, recargar perfil
            if (this.currentUser && this.currentUser.uid === uid) {
                await this.loadProfile(uid);
            }

            return { success: true };
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            return { success: false, message: error.message };
        }
    }

    // Actualizar código personal de firma
    static async updateUserCode(uid, codigoPersonal) {
        try {
            await dbRef.users.child(uid).update({ codigoPersonal: codigoPersonal });

            // Si es el usuario actual, recargar perfil
            if (this.currentUser && this.currentUser.uid === uid) {
                await this.loadProfile(uid);
            }

            return { success: true };
        } catch (error) {
            console.error('Error actualizando código personal:', error);
            return { success: false, message: error.message };
        }
    }

    // Eliminar perfil de usuario en RTDB
    static async deleteUser(uid) {
        try {
            await dbRef.users.child(uid).remove();
            return { success: true };
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            return { success: false, message: error.message };
        }
    }

    // Obtener usuarios por departamento
    static async getUsersByDepartment(depId) {
        try {
            const snapshot = await dbRef.users.orderByChild('departamento').equalTo(depId).once('value');
            return snapshotToArray(snapshot).filter(u => u.activo);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    // Obtener encargados de departamento
    static async getEncargadosDepartamento(depId) {
        try {
            const users = await this.getAllUsers();
            return users.filter(u =>
                u.departamento === depId &&
                (u.rol === 'encargado' || u.rol === 'admin') &&
                u.activo
            );
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }
}
