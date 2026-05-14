// ============================================================
// EXPEDIENTE-EMPLEADO.JS — Expediente digital (solo admin)
// Veterinaria San Martín de Porres
// Currículum PDF en nodo aparte (Base64); registros HR en RTDB
// ============================================================

class ExpedienteEmpleadoManager {
    static TIPOS_REGISTRO = ['aviso', 'amonestacion', 'nota', 'otro'];

    static _assertAdmin() {
        const user = AuthManager.getUser();
        if (!user || !AuthManager.isAdmin()) {
            throw new Error('No tiene permiso para gestionar expedientes');
        }
        return user;
    }

    static async getResumenParaUsuario(uid) {
        if (!uid) return { curriculum: null, registros: [] };
        try {
            const snap = await dbRef.expedientesEmpleado.child(uid).once('value');
            if (!snap.exists()) return { curriculum: null, registros: [] };
            const v = snap.val();
            const curriculum = v.curriculum && typeof v.curriculum === 'object' ? v.curriculum : null;
            let registros = [];
            if (v.registros && typeof v.registros === 'object') {
                registros = Object.keys(v.registros).map((id) => ({ id, ...v.registros[id] }));
            }
            registros.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
            return { curriculum, registros };
        } catch (e) {
            console.error('ExpedienteEmpleadoManager.getResumenParaUsuario:', e);
            return { curriculum: null, registros: [] };
        }
    }

    static async getPdfBlob(uid) {
        const [metaSnap, fileSnap] = await Promise.all([
            dbRef.expedientesEmpleado.child(uid).child('curriculum').once('value'),
            dbRef.expedientesEmpleadoFiles.child(uid).once('value')
        ]);
        if (!metaSnap.exists()) throw new Error('No hay currículum registrado');
        const meta = metaSnap.val();
        if (!fileSnap.exists()) throw new Error('Archivo del currículum no encontrado');
        const b64 = fileSnap.val().pdfBase64;
        if (!b64 || typeof b64 !== 'string') throw new Error('Archivo corrupto o incompleto');
        const blob = PoliticaInternaManager.base64ToBlob(b64, meta.mimeType || 'application/pdf');
        return {
            blob,
            nombreArchivo: meta.nombreArchivo || 'curriculum.pdf'
        };
    }

    static async subirCurriculum(uid, file) {
        const user = this._assertAdmin();
        if (!uid) throw new Error('Usuario inválido');
        if (!file) throw new Error('Seleccione un archivo PDF');
        const mime = file.type || '';
        const nameLower = String(file.name || '').toLowerCase();
        if (mime !== 'application/pdf' && !nameLower.endsWith('.pdf')) {
            throw new Error('Solo se permiten archivos PDF');
        }
        if (file.size > PoliticaInternaManager.MAX_BYTES) {
            throw new Error(`El archivo supera el máximo de ${PoliticaInternaManager.formatBytes(PoliticaInternaManager.MAX_BYTES)}`);
        }

        const pdfBase64 = await PoliticaInternaManager.fileToBase64Data(file);
        const now = new Date().toISOString();
        const tituloLimpio = 'Currículum vitae';
        const meta = {
            titulo: tituloLimpio,
            nombreArchivo: file.name,
            mimeType: 'application/pdf',
            tamañoBytes: file.size,
            fechaActualizacion: now,
            actualizadoPor: user.id
        };

        await dbRef.expedientesEmpleado.child(uid).child('curriculum').set(meta);
        try {
            await dbRef.expedientesEmpleadoFiles.child(uid).set({ pdfBase64 });
        } catch (e) {
            try {
                await dbRef.expedientesEmpleado.child(uid).child('curriculum').remove();
            } catch (_) { /* noop */ }
            throw e;
        }
        return meta;
    }

    static async eliminarCurriculum(uid) {
        this._assertAdmin();
        if (!uid) throw new Error('Usuario inválido');
        await dbRef.expedientesEmpleadoFiles.child(uid).remove();
        await dbRef.expedientesEmpleado.child(uid).child('curriculum').remove();
    }

    static async agregarRegistro(uid, { tipo, titulo, detalle }) {
        const user = this._assertAdmin();
        if (!uid) throw new Error('Usuario inválido');
        const t = String(tipo || '').trim();
        if (!this.TIPOS_REGISTRO.includes(t)) throw new Error('Tipo de registro no válido');
        const tituloLimpio = String(titulo || '').trim();
        if (!tituloLimpio) throw new Error('Indique un título');
        const detalleLimpio = String(detalle || '').trim();
        if (!detalleLimpio) throw new Error('Indique el detalle');

        const now = new Date().toISOString();
        const reg = {
            tipo: t,
            titulo: tituloLimpio,
            detalle: detalleLimpio,
            fecha: now,
            creadoPor: user.id,
            creadoPorNombre: `${user.nombre} ${user.apellido}`.trim()
        };
        const newRef = dbRef.expedientesEmpleado.child(uid).child('registros').push();
        await newRef.set(reg);
        return { id: newRef.key, ...reg };
    }

    static async eliminarRegistro(uid, registroId) {
        this._assertAdmin();
        if (!uid || !registroId) throw new Error('Datos inválidos');
        await dbRef.expedientesEmpleado.child(uid).child('registros').child(registroId).remove();
    }
}
