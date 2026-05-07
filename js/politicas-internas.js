// ============================================================
// POLITICAS-INTERNAS.JS — Biblioteca de PDFs (políticas internas)
// Veterinaria San Martín de Porres
// PDF almacenado en Realtime Database (Base64, nodo separado);
// metadatos en politicasInternas/{id} para listar sin bajar el archivo.
// ============================================================

class PoliticaInternaManager {
    /** Tamaño máximo del PDF original (no requiere Firebase Storage / plan de pago). */
    static MAX_BYTES = 4 * 1024 * 1024;

    static fileToBase64Data(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => {
                const s = String(r.result || '');
                const i = s.indexOf(',');
                resolve(i >= 0 ? s.slice(i + 1) : s);
            };
            r.onerror = () => reject(r.error || new Error('No se pudo leer el archivo'));
            r.readAsDataURL(file);
        });
    }

    static base64ToBlob(base64, mimeType) {
        const bin = atob(base64);
        const len = bin.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            arr[i] = bin.charCodeAt(i);
        }
        return new Blob([arr], { type: mimeType || 'application/pdf' });
    }

    static formatBytes(bytes) {
        const n = Number(bytes) || 0;
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    }

    static async getAll() {
        try {
            const snapshot = await dbRef.politicasInternas.once('value');
            const arr = snapshotToArray(snapshot);
            return arr
                .filter((p) => p.estado === 'activo')
                .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        } catch (error) {
            console.error('Error obteniendo políticas internas:', error);
            return [];
        }
    }

    /**
     * Carga el PDF desde RTDB y devuelve un Blob listo para ver o descargar.
     */
    static async getPdfBlob(id) {
        const [metaSnap, fileSnap] = await Promise.all([
            dbRef.politicasInternas.child(id).once('value'),
            dbRef.politicasInternasFiles.child(id).once('value')
        ]);
        if (!metaSnap.exists()) throw new Error('Documento no encontrado');
        const meta = metaSnap.val();
        if (meta.estado !== 'activo') throw new Error('Documento no disponible');
        if (!fileSnap.exists()) throw new Error('Contenido del PDF no encontrado');
        const b64 = fileSnap.val().pdfBase64;
        if (!b64 || typeof b64 !== 'string') throw new Error('Archivo corrupto o incompleto');
        const blob = this.base64ToBlob(b64, meta.mimeType || 'application/pdf');
        return {
            blob,
            nombreArchivo: meta.nombreArchivo || 'documento.pdf'
        };
    }

    /**
     * Publica un PDF (solo admin en UI + reglas).
     */
    static async create({ titulo, descripcion, file }) {
        const user = AuthManager.getUser();
        if (!user || !AuthManager.isAdmin()) {
            throw new Error('No tiene permiso para publicar políticas');
        }
        if (!file) throw new Error('Seleccione un archivo PDF');
        const mime = file.type || '';
        const nameLower = String(file.name || '').toLowerCase();
        if (mime !== 'application/pdf' && !nameLower.endsWith('.pdf')) {
            throw new Error('Solo se permiten archivos PDF');
        }
        if (file.size > this.MAX_BYTES) {
            throw new Error(`El archivo supera el máximo de ${this.formatBytes(this.MAX_BYTES)}`);
        }

        const tituloLimpio = String(titulo || '').trim();
        if (!tituloLimpio) throw new Error('Indique un título');

        const pdfBase64 = await this.fileToBase64Data(file);

        const newRef = dbRef.politicasInternas.push();
        const id = newRef.key;

        const meta = {
            titulo: tituloLimpio,
            descripcion: String(descripcion || '').trim(),
            nombreArchivo: file.name,
            mimeType: 'application/pdf',
            tamañoBytes: file.size,
            creadoPor: user.id,
            creadoPorNombre: `${user.nombre} ${user.apellido}`.trim(),
            fechaCreacion: new Date().toISOString(),
            estado: 'activo'
        };

        await newRef.set(meta);
        try {
            await dbRef.politicasInternasFiles.child(id).set({ pdfBase64 });
        } catch (e) {
            try {
                await newRef.remove();
            } catch (_) { /* noop */ }
            throw e;
        }

        return { id, ...meta };
    }

    static async delete(id) {
        if (!AuthManager.isAdmin()) throw new Error('No tiene permiso para eliminar');
        const snap = await dbRef.politicasInternas.child(id).once('value');
        if (!snap.exists()) return;
        await dbRef.politicasInternasFiles.child(id).remove();
        await dbRef.politicasInternas.child(id).remove();
    }
}
