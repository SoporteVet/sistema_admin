// ============================================================
// DOCUMENTS.JS - Gestión de Documentos con Firebase RTDB
// Veterinaria San Martín de Porres
// ============================================================

class DocumentManager {
    // Obtener todos los documentos
    static async getAll() {
        try {
            const snapshot = await dbRef.documents.once('value');
            return snapshotToArray(snapshot);
        } catch (error) {
            console.error('Error obteniendo documentos:', error);
            return [];
        }
    }

    // Obtener documento por ID
    static async getById(docId) {
        try {
            const snapshot = await dbRef.documents.child(docId).once('value');
            if (snapshot.exists()) {
                return { id: docId, ...snapshot.val() };
            }
            return null;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }

    // Obtener documentos por departamento
    static async getByDepartment(depId) {
        try {
            const snapshot = await dbRef.documents.orderByChild('departamento').equalTo(depId).once('value');
            return snapshotToArray(snapshot);
        } catch (error) {
            console.error('Error:', error);
            return [];
        }
    }

    // Generar código de documento con transacción atómica
    static async generateDocCode(departamentoId, subcategoriaKey) {
        try {
            // Firebase Sanitization: los paths no pueden tener '.'
            const safeSubKey = subcategoriaKey.replace(/\./g, '_');
            const counterRef = dbRef.counters.child(departamentoId).child(safeSubKey);

            const result = await counterRef.transaction(currentVal => {
                return (currentVal || 0) + 1;
            });

            const num = String(result.snapshot.val()).padStart(3, '0');
            return `${departamentoId}-${subcategoriaKey}-${num}`;
        } catch (error) {
            console.error('Error generando código:', error);
            // Fallback
            const num = String(Date.now() % 1000).padStart(3, '0');
            return `${departamentoId}-${subcategoriaKey}-${num}`;
        }
    }

    // Crear documento
    static async create(docData) {
        try {
            const user = AuthManager.getUser();
            const codigo = await this.generateDocCode(docData.departamento, docData.subcategoria);

            const newDocRef = dbRef.documents.push();
            const newDoc = {
                codigo: codigo,
                departamento: docData.departamento,
                categoria: docData.categoria,
                subcategoria: docData.subcategoria,
                tipoNombre: docData.tipoNombre,
                titulo: docData.titulo,
                para: docData.para || '',
                de: docData.de || '',
                asunto: docData.asunto || '',
                contenido: docData.contenido,
                creadoPor: user.id,
                creadoPorNombre: user.nombre + ' ' + user.apellido,
                fechaCreacion: new Date().toISOString(),
                estado: 'activo',
                firmas: {},
                firmasRequeridas: docData.firmasRequeridas || [],
                verificacionCode: generateVerificationCode()
            };

            await newDocRef.set(newDoc);

            const docId = newDocRef.key;

            // Crear notificaciones para firmantes requeridos
            if (docData.firmasRequeridas && docData.firmasRequeridas.length > 0) {
                const notifPromises = docData.firmasRequeridas.map(userId =>
                    NotificationManager.create({
                        tipo: 'firma_requerida',
                        titulo: 'Firma requerida',
                        mensaje: `Se requiere su firma en el documento ${codigo}: ${docData.titulo}`,
                        destinatario: userId,
                        referencia: docId,
                        referenciaType: 'document'
                    })
                );
                await Promise.all(notifPromises);
            }

            return { id: docId, ...newDoc };
        } catch (error) {
            console.error('Error creando documento:', error);
            throw error;
        }
    }

    // Actualizar documento
    static async update(docId, updates) {
        try {
            await dbRef.documents.child(docId).update(updates);
            return true;
        } catch (error) {
            console.error('Error actualizando documento:', error);
            return false;
        }
    }

    // Eliminar documento (soft delete)
    static async delete(docId) {
        try {
            await dbRef.documents.child(docId).update({ estado: 'eliminado' });
            return true;
        } catch (error) {
            console.error('Error eliminando documento:', error);
            return false;
        }
    }

    // Firmar documento
    // verificationCode: código de verificación del documento
    // personalCode: código personal del empleado (ingresado antes de firmar)
    // signatureImage: imagen de la firma dibujada en canvas (dataURL)
    static async signDocument(docId, userId, verificationCode, personalCode, signatureImage) {
        try {
            const doc = await this.getById(docId);
            if (!doc) return { success: false, message: 'Documento no encontrado' };

            const user = await AuthManager.getUserById(userId);
            if (!user) return { success: false, message: 'Usuario no encontrado' };

            // Verificar que no haya firmado ya
            const firmas = doc.firmas || {};
            const firmasArray = Object.values(firmas);
            if (firmasArray.some(f => f.userId === userId)) {
                return { success: false, message: 'Ya ha firmado este documento' };
            }

            // Verificar código
            if (verificationCode !== doc.verificacionCode) {
                return { success: false, message: 'Código de verificación incorrecto' };
            }

            const firma = {
                userId: userId,
                nombre: user.nombre + ' ' + user.apellido,
                rol: user.rol,
                departamento: user.departamento,
                fecha: new Date().toISOString(),
                codigoVerificacion: generateVerificationCode(),
                // Datos adicionales para la firma manuscrita
                codigoPersonal: personalCode || null,
                firmaDibujo: signatureImage || null
            };

            // Agregar firma al documento
            const firmaRef = dbRef.documents.child(docId).child('firmas').push();
            await firmaRef.set(firma);

            // Notificar al creador
            await NotificationManager.create({
                tipo: 'documento_firmado',
                titulo: 'Documento firmado',
                mensaje: `${firma.nombre} ha firmado el documento ${doc.codigo}`,
                destinatario: doc.creadoPor,
                referencia: docId,
                referenciaType: 'document'
            });

            return { success: true, firma };
        } catch (error) {
            console.error('Error firmando documento:', error);
            return { success: false, message: 'Error al firmar: ' + error.message };
        }
    }

    // Buscar documentos
    static async search(query) {
        const docs = await this.getAll();
        const activeDocs = docs.filter(d => d.estado === 'activo');
        const q = query.toLowerCase();
        return activeDocs.filter(d =>
            d.titulo.toLowerCase().includes(q) ||
            d.codigo.toLowerCase().includes(q) ||
            d.tipoNombre.toLowerCase().includes(q) ||
            d.creadoPorNombre.toLowerCase().includes(q)
        );
    }

    // Estadísticas
    static async getStats() {
        const docs = (await this.getAll()).filter(d => d.estado === 'activo');
        const byDep = {};
        Object.keys(DEPARTAMENTOS).forEach(key => {
            byDep[key] = docs.filter(d => d.departamento === key).length;
        });
        return {
            total: docs.length,
            porDepartamento: byDep,
            recientes: docs.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).slice(0, 5)
        };
    }
}
