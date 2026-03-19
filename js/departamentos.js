// ============================================================
// DEPARTAMENTOS.JS - Gestión de Departamentos con Firebase RTDB
// Veterinaria San Martín de Porres
// ============================================================

class DepartamentoManager {
    // Obtener todos los departamentos
    static async getAll() {
        try {
            const snapshot = await dbRef.departamentos.once('value');
            const departamentos = snapshotToArray(snapshot);
            // Normalizar: asegurar que todos tengan codigo e id
            const normalized = departamentos.map(dep => ({
                ...dep,
                codigo: dep.codigo || dep.id,
                id: dep.id || dep.codigo
            }));
            
            // Si no hay departamentos en Firebase, usar los del data.js como base
            if (normalized.length === 0) {
                return Object.keys(DEPARTAMENTOS).map(key => ({
                    id: key,
                    codigo: key,
                    ...DEPARTAMENTOS[key]
                }));
            }
            return normalized;
        } catch (error) {
            console.error('Error obteniendo departamentos:', error);
            // Fallback a DEPARTAMENTOS de data.js
            return Object.keys(DEPARTAMENTOS).map(key => ({
                id: key,
                codigo: key,
                ...DEPARTAMENTOS[key]
            }));
        }
    }

    // Obtener departamento por ID
    static async getById(depId) {
        try {
            const snapshot = await dbRef.departamentos.child(depId).once('value');
            if (!snapshot.exists()) {
                // Fallback a DEPARTAMENTOS de data.js
                if (DEPARTAMENTOS[depId]) {
                    return { id: depId, ...DEPARTAMENTOS[depId] };
                }
                return null;
            }
            return { id: depId, ...snapshot.val() };
        } catch (error) {
            console.error('Error obteniendo departamento:', error);
            // Fallback a DEPARTAMENTOS de data.js
            if (DEPARTAMENTOS[depId]) {
                return { id: depId, ...DEPARTAMENTOS[depId] };
            }
            return null;
        }
    }

    // Crear nuevo departamento
    static async create(depData) {
        try {
            const depId = depData.codigo || `DEP-${Date.now()}`;
            
            // Validar que el código no exista
            const existing = await this.getById(depId);
            if (existing && existing.id) {
                return { success: false, message: 'Ya existe un departamento con ese código' };
            }

            const newDep = {
                codigo: depId,
                nombre: depData.nombre,
                color: depData.color || '#546e7a',
                icono: depData.icono || 'fas fa-building',
                categorias: depData.categorias || {},
                fechaCreacion: new Date().toISOString(),
                activo: true
            };

            await dbRef.departamentos.child(depId).set(newDep);
            return { success: true, id: depId, data: newDep };
        } catch (error) {
            console.error('Error creando departamento:', error);
            return { success: false, message: error.message || 'Error al crear departamento' };
        }
    }

    // Actualizar departamento
    static async update(depId, updates) {
        try {
            const existing = await this.getById(depId);
            if (!existing) {
                return { success: false, message: 'Departamento no encontrado' };
            }

            // Preparar datos actualizados
            const updatedData = {
                ...existing,
                ...updates,
                codigo: depId, // Mantener el código original
                fechaActualizacion: new Date().toISOString()
            };
            delete updatedData.id; // No guardar el id en Firebase

            await dbRef.departamentos.child(depId).set(updatedData);
            return { success: true, data: updatedData };
        } catch (error) {
            console.error('Error actualizando departamento:', error);
            return { success: false, message: error.message || 'Error al actualizar departamento' };
        }
    }

    // Eliminar departamento (marcar como inactivo)
    static async delete(depId) {
        try {
            // Verificar si hay usuarios en este departamento
            const users = await AuthManager.getUsersByDepartment(depId);
            if (users.length > 0) {
                return { 
                    success: false, 
                    message: `No se puede eliminar el departamento. Tiene ${users.length} usuario(s) asignado(s)` 
                };
            }

            // Verificar si hay documentos en este departamento
            const docs = await DocumentManager.getByDepartment(depId);
            if (docs.length > 0) {
                return { 
                    success: false, 
                    message: `No se puede eliminar el departamento. Tiene ${docs.length} documento(s) asociado(s)` 
                };
            }

            await dbRef.departamentos.child(depId).remove();
            return { success: true };
        } catch (error) {
            console.error('Error eliminando departamento:', error);
            return { success: false, message: error.message || 'Error al eliminar departamento' };
        }
    }

    // Sincronizar departamentos de data.js a Firebase (migración inicial)
    static async syncFromDataJs() {
        try {
            const existing = await this.getAll();
            const existingIds = existing.map(d => d.id || d.codigo);
            
            let synced = 0;
            for (const [key, dep] of Object.entries(DEPARTAMENTOS)) {
                if (!existingIds.includes(key)) {
                    await this.create({
                        codigo: key,
                        nombre: dep.nombre,
                        color: dep.color,
                        icono: dep.icono,
                        categorias: dep.categorias
                    });
                    synced++;
                }
            }
            return { success: true, synced };
        } catch (error) {
            console.error('Error sincronizando departamentos:', error);
            return { success: false, message: error.message };
        }
    }
}
