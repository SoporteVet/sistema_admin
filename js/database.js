/**
 * Database Manager - IndexedDB Operations
 * Handles all database operations using IndexedDB API
 */

class Database {
    constructor() {
        this.db = null;
        this.dbName = 'SistemaAdministrativo';
        this.version = 2; // Increment version to add new store
        this.stores = ['usuarios', 'comunicados', 'solicitudes', 'firmas', 'departamentos', 'auditoria', 'comentarios_solicitudes'];
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Usuarios Store
                if (!db.objectStoreNames.contains('usuarios')) {
                    const usuariosStore = db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
                    usuariosStore.createIndex('email', 'email', { unique: true });
                    usuariosStore.createIndex('rol', 'rol', { unique: false });
                }

                // Comunicados Store
                if (!db.objectStoreNames.contains('comunicados')) {
                    const comunicadosStore = db.createObjectStore('comunicados', { keyPath: 'id', autoIncrement: true });
                    comunicadosStore.createIndex('departamento', 'departamento', { unique: false });
                    comunicadosStore.createIndex('tipo', 'tipo', { unique: false });
                    comunicadosStore.createIndex('fecha', 'fecha', { unique: false });
                    comunicadosStore.createIndex('codigo', 'codigo', { unique: true });
                }

                // Solicitudes Store
                if (!db.objectStoreNames.contains('solicitudes')) {
                    const solicitudesStore = db.createObjectStore('solicitudes', { keyPath: 'id', autoIncrement: true });
                    solicitudesStore.createIndex('usuarioId', 'usuarioId', { unique: false });
                    solicitudesStore.createIndex('estado', 'estado', { unique: false });
                    solicitudesStore.createIndex('tipo', 'tipo', { unique: false });
                    solicitudesStore.createIndex('departamento', 'departamento', { unique: false });
                    solicitudesStore.createIndex('fecha', 'fecha', { unique: false });
                }

                // Firmas Store
                if (!db.objectStoreNames.contains('firmas')) {
                    const firmasStore = db.createObjectStore('firmas', { keyPath: 'id', autoIncrement: true });
                    firmasStore.createIndex('solicitudId', 'solicitudId', { unique: false });
                    firmasStore.createIndex('usuarioId', 'usuarioId', { unique: false });
                }

                // Departamentos Store
                if (!db.objectStoreNames.contains('departamentos')) {
                    const departamentosStore = db.createObjectStore('departamentos', { keyPath: 'id', autoIncrement: true });
                    departamentosStore.createIndex('codigo', 'codigo', { unique: true });
                }

                // Auditoría Store
                if (!db.objectStoreNames.contains('auditoria')) {
                    const auditoriaStore = db.createObjectStore('auditoria', { keyPath: 'id', autoIncrement: true });
                    auditoriaStore.createIndex('usuarioId', 'usuarioId', { unique: false });
                    auditoriaStore.createIndex('accion', 'accion', { unique: false });
                    auditoriaStore.createIndex('fecha', 'fecha', { unique: false });
                }

                // Comentarios Solicitudes Store
                if (!db.objectStoreNames.contains('comentarios_solicitudes')) {
                    const comentariosStore = db.createObjectStore('comentarios_solicitudes', { keyPath: 'id', autoIncrement: true });
                    comentariosStore.createIndex('solicitudId', 'solicitudId', { unique: false });
                    comentariosStore.createIndex('usuarioId', 'usuarioId', { unique: false });
                    comentariosStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * Generic add method
     */
    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic get method
     */
    async get(storeName, key) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic getAll method
     */
    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic update method
     */
    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic delete method
     */
    async delete(storeName, key) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Query by index
     */
    async query(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Query range
     */
    async queryRange(storeName, indexName, range) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Specific methods for users
    async getUsuarioByEmail(email) {
        try {
            const usuarios = await this.query('usuarios', 'email', email);
            return usuarios.length > 0 ? usuarios[0] : null;
        } catch (error) {
            // Fallback: get all and filter
            console.warn('Index query failed, using fallback:', error);
            const allUsers = await this.getAll('usuarios');
            return allUsers.find(u => u.email === email) || null;
        }
    }

    async getUsuariosByRol(rol) {
        return await this.query('usuarios', 'rol', rol);
    }

    // Specific methods for comunicados
    async getComunicadosByDepartamento(departamento) {
        return await this.query('comunicados', 'departamento', departamento);
    }

    async getComunicadosByTipo(tipo) {
        return await this.query('comunicados', 'tipo', tipo);
    }

    async getComunicadoByCodigo(codigo) {
        const comunicados = await this.query('comunicados', 'codigo', codigo);
        return comunicados.length > 0 ? comunicados[0] : null;
    }

    // Specific methods for solicitudes
    async getSolicitudesByUsuario(usuarioId) {
        return await this.query('solicitudes', 'usuarioId', usuarioId);
    }

    async getSolicitudesByEstado(estado) {
        return await this.query('solicitudes', 'estado', estado);
    }

    async getSolicitudesByTipo(tipo) {
        return await this.query('solicitudes', 'tipo', tipo);
    }

    // Specific methods for firmas
    async getFirmaBySolicitud(solicitudId) {
        const firmas = await this.query('firmas', 'solicitudId', solicitudId);
        return firmas.length > 0 ? firmas[0] : null;
    }

    // Auditoría
    async addAuditoria(accion, detalles) {
        const usuarioId = JSON.parse(localStorage.getItem('user'))?.id;
        return await this.add('auditoria', {
            usuarioId: usuarioId || null,
            accion,
            detalles,
            fecha: new Date().toISOString(),
            timestamp: Date.now()
        });
    }
}

// Export singleton instance
const db = new Database();

// Track initialization promise to avoid multiple initializations
let initPromise = null;

/**
 * Get initialized database instance
 */
db.ensureInit = async function() {
    if (!this.db && !initPromise) {
        initPromise = this.init();
    }
    if (initPromise) {
        await initPromise;
    }
    if (!this.db) {
        await this.init();
    }
    return this.db;
};

export default db;

