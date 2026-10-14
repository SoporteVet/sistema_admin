// ============================================================
// INVENTARIO.JS — Inventario de equipos (departamento de TI)
// Veterinaria San Martín de Porres
// ============================================================

class InventarioManager {
    static TIPOS = ['Computadora', 'Laptop', 'Impresora', 'Monitor', 'Equipo de red', 'Teléfono', 'Otro'];
    static ESTADOS = ['En uso', 'En bodega', 'En reparación', 'Dado de baja'];

    static _clip(value, max) {
        return String(value || '').trim().slice(0, max);
    }

    static _clean(data) {
        const nombre = this._clip(data.nombre, 120);
        if (!nombre) throw new Error('El nombre del equipo es obligatorio');
        const tipo = this.TIPOS.includes(data.tipo) ? data.tipo : 'Otro';
        const estado = this.ESTADOS.includes(data.estado) ? data.estado : 'En uso';
        return {
            nombre,
            tipo,
            marca: this._clip(data.marca, 80),
            modelo: this._clip(data.modelo, 80),
            serie: this._clip(data.serie, 80),
            ubicacion: this._clip(data.ubicacion, 120),
            asignadoA: this._clip(data.asignadoA, 120),
            estado,
            observaciones: this._clip(data.observaciones, 500)
        };
    }

    static _assertAccess() {
        const user = AuthManager.getUser();
        if (!user || typeof usuarioVeInventario !== 'function' || !usuarioVeInventario(user)) {
            throw new Error('No tiene permiso para el inventario');
        }
        return user;
    }

    static async getAll() {
        const snapshot = await dbRef.inventario.once('value');
        return snapshotToArray(snapshot).sort((a, b) =>
            String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' })
        );
    }

    static async create(data) {
        const user = this._assertAccess();
        const now = new Date().toISOString();
        const payload = {
            ...this._clean(data),
            creadoPor: user.id,
            creadoPorNombre: `${user.nombre || ''} ${user.apellido || ''}`.trim(),
            fechaCreacion: now,
            fechaActualizacion: now
        };
        const ref = dbRef.inventario.push();
        await ref.set(payload);
        return { id: ref.key, ...payload };
    }

    static async update(id, data) {
        this._assertAccess();
        if (!id) throw new Error('Equipo no especificado');
        const clean = this._clean(data);
        clean.fechaActualizacion = new Date().toISOString();
        await dbRef.inventario.child(id).update(clean);
    }

    static async remove(id) {
        this._assertAccess();
        if (!id) throw new Error('Equipo no especificado');
        await dbRef.inventario.child(id).remove();
    }
}
