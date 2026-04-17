// ============================================================
// DEPARTAMENTOS.JS - Gestión de Departamentos con Firebase RTDB
// Veterinaria San Martín de Porres
// ============================================================
//
// Firebase RTDB prohíbe "." en claves de objetos.
// Las categorías usan claves como "3.1", "6.1.2", etc.
// Solución: guardar categorias como JSON string en Firebase.
// Al leer, se parsea de vuelta a objeto.
// ============================================================

console.log('✅ departamentos.js v20260416f cargado');

class DepartamentoManager {

    // Serializa categorias a string para guardar en Firebase
    static _catsToStr(cats) {
        if (!cats || typeof cats !== 'object') return '{}';
        return JSON.stringify(cats);
    }

    // Deserializa string de Firebase a objeto categorias
    static _strToCats(val) {
        if (!val) return {};
        if (typeof val === 'object') {
            // Ya es objeto (dept guardado antes del cambio): devolverlo tal cual
            return val;
        }
        try { return JSON.parse(val); }
        catch (e) { return {}; }
    }

    // Fusiona datos de Firebase con data.js para rellenar campos faltantes/genéricos
    static _merge(depId, firebaseData) {
        const base = DEPARTAMENTOS[depId] || {};

        const ICONO_DEFAULT = 'fas fa-building';
        const COLOR_DEFAULT = '#546e7a';

        const fbIcono = firebaseData.icono;
        const fbColor = firebaseData.color;
        const fbCats  = this._strToCats(firebaseData.categorias);

        const icono = (fbIcono && fbIcono !== ICONO_DEFAULT)
            ? fbIcono
            : (base.icono || ICONO_DEFAULT);

        const color = (fbColor && fbColor !== COLOR_DEFAULT)
            ? fbColor
            : (base.color || COLOR_DEFAULT);

        const hasFbCats = fbCats && Object.keys(fbCats).length > 0;
        const categorias = hasFbCats ? fbCats : (base.categorias || {});

        return {
            ...base,
            ...firebaseData,
            icono,
            color,
            categorias,
            codigo: firebaseData.codigo || depId,
            id:     depId
        };
    }

    // ── Obtener todos los departamentos ──────────────────────
    static async getAll() {
        try {
            const snapshot = await dbRef.departamentos.once('value');

            const firebaseMap = {};
            if (snapshot.exists()) {
                snapshot.forEach(child => {
                    firebaseMap[child.key] = { id: child.key, ...child.val() };
                });
            }

            // data.js como lista base siempre visible
            const result = Object.keys(DEPARTAMENTOS).map(key => {
                const fb = firebaseMap[key];
                return fb ? this._merge(key, fb) : { id: key, codigo: key, ...DEPARTAMENTOS[key] };
            });

            // Departamentos solo en Firebase (creados manualmente)
            Object.keys(firebaseMap).forEach(key => {
                if (!DEPARTAMENTOS[key]) result.push(this._merge(key, firebaseMap[key]));
            });

            return result;
        } catch (error) {
            console.error('Error obteniendo departamentos:', error);
            return Object.keys(DEPARTAMENTOS).map(key => ({ id: key, codigo: key, ...DEPARTAMENTOS[key] }));
        }
    }

    // ── Obtener departamento por ID ──────────────────────────
    static async getById(depId) {
        try {
            const snapshot = await dbRef.departamentos.child(depId).once('value');
            if (!snapshot.exists()) {
                return DEPARTAMENTOS[depId] ? { id: depId, ...DEPARTAMENTOS[depId] } : null;
            }
            return this._merge(depId, { id: depId, ...snapshot.val() });
        } catch (error) {
            console.error('Error obteniendo departamento:', error);
            return DEPARTAMENTOS[depId] ? { id: depId, ...DEPARTAMENTOS[depId] } : null;
        }
    }

    // ── Crear nuevo departamento ─────────────────────────────
    static async create(depData) {
        try {
            const depId = depData.codigo || `DEP-${Date.now()}`;

            // Firebase no permite ".", "#", "$", "/", "[", "]" en paths
            if (/[.#$\/\[\]]/.test(depId)) {
                return { success: false, message: `Código inválido "${depId}". Use solo letras, números y guiones (ej: CE-700).` };
            }

            const snap = await dbRef.departamentos.child(depId).once('value');
            if (snap.exists()) {
                return { success: false, message: 'Ya existe un departamento con ese código' };
            }

            const newDep = {
                codigo:        depId,
                nombre:        depData.nombre,
                color:         depData.color  || '#546e7a',
                icono:         depData.icono  || 'fas fa-building',
                categorias:    this._catsToStr(depData.categorias || {}),
                fechaCreacion: new Date().toISOString(),
                activo:        true
            };

            await dbRef.departamentos.child(depId).set(newDep);
            return { success: true, id: depId, data: newDep };
        } catch (error) {
            console.error('Error creando departamento:', error);
            return { success: false, message: error.message || 'Error al crear departamento' };
        }
    }

    // ── Actualizar departamento ──────────────────────────────
    static async update(depId, updates) {
        try {
            const snap    = await dbRef.departamentos.child(depId).once('value');
            const fbData  = snap.exists() ? snap.val() : null;
            const base    = fbData || DEPARTAMENTOS[depId] || {};

            const safeUpdates = { ...updates };
            if ('categorias' in safeUpdates) {
                // Convertir a string para evitar claves inválidas en Firebase
                safeUpdates.categorias = this._catsToStr(safeUpdates.categorias);
            }

            const updatedData = {
                ...base,
                ...safeUpdates,
                codigo:             depId,
                fechaCreacion:      base.fechaCreacion || new Date().toISOString(),
                activo:             base.activo !== false,
                fechaActualizacion: new Date().toISOString()
            };
            delete updatedData.id;

            await dbRef.departamentos.child(depId).set(updatedData);
            return { success: true, data: updatedData };
        } catch (error) {
            console.error('Error actualizando departamento:', error);
            return { success: false, message: error.message || 'Error al actualizar departamento' };
        }
    }

    // ── Eliminar departamento ────────────────────────────────
    static async delete(depId) {
        try {
            const users = await AuthManager.getUsersByDepartment(depId);
            if (users.length > 0) {
                return { success: false, message: `No se puede eliminar el departamento. Tiene ${users.length} usuario(s) asignado(s)` };
            }
            const docs = await DocumentManager.getByDepartment(depId);
            if (docs.length > 0) {
                return { success: false, message: `No se puede eliminar el departamento. Tiene ${docs.length} documento(s) asociado(s)` };
            }
            await dbRef.departamentos.child(depId).remove();
            return { success: true };
        } catch (error) {
            console.error('Error eliminando departamento:', error);
            return { success: false, message: error.message || 'Error al eliminar departamento' };
        }
    }

    // ── Sincronizar data.js → Firebase ───────────────────────
    static async syncFromDataJs() {
        try {
            const snapshot = await dbRef.departamentos.once('value');
            const firebaseRaw = {};
            if (snapshot.exists()) {
                snapshot.forEach(child => { firebaseRaw[child.key] = child.val(); });
            }

            let created = 0;
            let updated = 0;

            for (const [key, dep] of Object.entries(DEPARTAMENTOS)) {
                const fb = firebaseRaw[key];

                if (!fb) {
                    const result = await this.create({
                        codigo:     key,
                        nombre:     dep.nombre,
                        color:      dep.color,
                        icono:      dep.icono,
                        categorias: dep.categorias
                    });
                    if (result.success) created++;
                } else {
                    const sinEditar  = !fb.fechaActualizacion;
                    const iconoWrong = !fb.icono || fb.icono === 'fas fa-building';
                    const colorWrong = !fb.color || fb.color === '#546e7a';
                    const fbCats     = this._strToCats(fb.categorias);
                    const sinCats    = !fbCats || Object.keys(fbCats).length === 0;

                    if (sinEditar && (iconoWrong || colorWrong || sinCats)) {
                        await this.update(key, {
                            icono:      dep.icono,
                            color:      dep.color,
                            categorias: dep.categorias
                        });
                        updated++;
                    }
                }
            }

            return { success: true, created, updated, synced: created + updated };
        } catch (error) {
            console.error('Error sincronizando departamentos:', error);
            return { success: false, message: error.message };
        }
    }
}
