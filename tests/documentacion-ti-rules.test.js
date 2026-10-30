/**
 * Pruebas de reglas RTDB contra el emulador (no producción).
 * Uso: firebase emulators:exec --only database "node tests/documentacion-ti-rules.test.js"
 */
const http = require('http');

const PORT = 9000;
const NS = 'sistema-administrativo-36a03-default-rtdb';

function fakeJwt(uid) {
    const h = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const c = Buffer.from(JSON.stringify({
        uid, sub: uid, user_id: uid,
        iat: 1700000000, exp: 1900000000, auth_time: 1700000000,
        aud: 'sistema-administrativo-36a03',
        iss: 'https://securetoken.google.com/sistema-administrativo-36a03'
    })).toString('base64url');
    return `${h}.${c}.`;
}

function call(method, p, body, { owner, uid } = {}) {
    const params = new URLSearchParams({ ns: NS });
    if (uid) params.set('auth', fakeJwt(uid));
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json' };
    if (owner) headers.Authorization = 'Bearer owner';
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    return new Promise((resolve, reject) => {
        const r = http.request({
            hostname: '127.0.0.1',
            port: PORT,
            path: `/${p}.json?${params.toString()}`,
            method,
            headers
        }, (res) => {
            let d = '';
            res.on('data', (c) => { d += c; });
            res.on('end', () => resolve({ status: res.statusCode, body: d }));
        });
        r.on('error', reject);
        if (payload) r.write(payload);
        r.end();
    });
}

async function main() {
    const ping = await call('GET', '.info/connected', undefined, { owner: true }).catch((e) => ({ error: e }));
    if (ping.error) {
        console.log('OMITIDO: emulador no responde en 127.0.0.1:9000.');
        process.exit(2);
    }

    const users = {
        admin1: { nombre: 'A', apellido: 'A', email: 'a@x.com', rol: 'admin', departamento: 'DG-100', activo: true, fechaCreacion: '2026-01-01' },
        tiEmp: { nombre: 'T', apellido: 'E', email: 't@x.com', rol: 'empleado', departamento: 'TI-500', activo: true, fechaCreacion: '2026-01-01' },
        rhEnc: { nombre: 'R', apellido: 'H', email: 'r@x.com', rol: 'encargado', departamento: 'RH-300', activo: true, fechaCreacion: '2026-01-01', departamentosEncargado: { 'RH-300': true } },
        tiEncOtro: { nombre: 'X', apellido: 'T', email: 'x@x.com', rol: 'encargado', departamento: 'RH-300', activo: true, fechaCreacion: '2026-01-01', departamentosEncargado: { 'TI-500': true } },
        inact: { nombre: 'I', apellido: 'N', email: 'i@x.com', rol: 'empleado', departamento: 'TI-500', activo: false, fechaCreacion: '2026-01-01' }
    };
    const seed = await call('PUT', '', {
        users,
        provisionamiento: { inicialCompletado: true },
        documentacionTi: { config: { schemaVersion: 1, habilitado: true } }
    }, { owner: true });
    if (seed.status !== 200) {
        console.error('No se pudo sembrar el emulador', seed);
        process.exit(1);
    }

    const check = async (name, resP, expectOk) => {
        const res = await resP;
        const ok = res.status >= 200 && res.status < 300;
        const pass = expectOk ? ok : !ok;
        console.log(pass ? 'ok ' : 'FAIL', name, res.status, res.body.slice(0, 80).replace(/\s+/g, ' '));
        if (!pass) process.exitCode = 1;
    };

    await check('sin perfil no lee documentacionTi', call('GET', 'documentacionTi', undefined, { uid: 'ghost' }), false);
    await check('encargado ajeno no lee', call('GET', 'documentacionTi', undefined, { uid: 'rhEnc' }), false);
    await check('inactivo no lee', call('GET', 'documentacionTi', undefined, { uid: 'inact' }), false);
    await check('empleado TI lee', call('GET', 'documentacionTi', undefined, { uid: 'tiEmp' }), true);
    await check('encargado que supervisa TI lee', call('GET', 'documentacionTi', undefined, { uid: 'tiEncOtro' }), true);
    await check('admin lee', call('GET', 'documentacionTi', undefined, { uid: 'admin1' }), true);

    const act = {
        schemaVersion: 1, titulo: 'Prueba', tipo: 'soporte', estado: 'pendiente',
        creadoPor: 'tiEmp', revision: 1, fechaEjecucion: '2026-10-17', responsableId: 'tiEmp'
    };
    await check('empleado TI crea actividad', call('PUT', 'documentacionTi/actividadesMeta/a1', act, { uid: 'tiEmp' }), true);
    await check('encargado ajeno no crea actividad', call('PUT', 'documentacionTi/actividadesMeta/a2', { ...act, creadoPor: 'rhEnc' }, { uid: 'rhEnc' }), false);
    await check('ajeno no lee metadato creado', call('GET', 'documentacionTi/actividadesMeta/a1', undefined, { uid: 'rhEnc' }), false);
    await check('ajeno no lee archivo', call('GET', 'documentacionTi/actividadesAdjuntosFiles/a1/f1', undefined, { uid: 'rhEnc' }), false);

    await check('empleado no crea versión histórica', call('PUT', 'documentacionTi/articulosVersiones/d1/v1', {
        markdown: 'contenido de prueba', autorId: 'tiEmp', numero: 1
    }, { uid: 'tiEmp' }), false);

    await check('empleado no se asigna admin', call('PUT', 'users/tiEmp', {
        ...users.tiEmp, rol: 'admin'
    }, { uid: 'tiEmp' }), false);

    await check('bootstrap cerrado no crea admin propio', call('PUT', 'users/nuevo', {
        nombre: 'N', apellido: 'N', email: 'n@x.com', rol: 'admin', departamento: 'DG-100', activo: true, fechaCreacion: '2026-01-01'
    }, { uid: 'nuevo' }), false);

    await check('admin crea perfil empleado', call('PUT', 'users/nuevoEmp', {
        nombre: 'N', apellido: 'E', email: 'ne@x.com', rol: 'empleado', departamento: 'RC-400', activo: true, fechaCreacion: '2026-01-01'
    }, { uid: 'admin1' }), true);

    const htmlFile = {
        dataBase64: 'PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+',
        mimeType: 'image/png'
    };
    await check('rechaza adjunto sin magic PNG', call('PUT', 'documentacionTi/actividadesAdjuntosFiles/a1/bad', htmlFile, { uid: 'tiEmp' }), false);

    if (process.exitCode) console.error('Fallaron reglas del emulador');
    else console.log('Reglas del emulador: casos previstos pasaron');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
