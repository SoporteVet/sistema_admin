/**
 * Pruebas locales sin red del módulo Documentación TI.
 * Ejecutar: node tests/documentacion-ti.spec.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'documentacion-ti.js'), 'utf8');
const context = {
    console,
    module: { exports: {} },
    exports: {},
    firebase: { database: { ServerValue: { TIMESTAMP: 0 } } },
    AuthManager: {},
    dbRef: {}
};
vm.createContext(context);
vm.runInContext(src, context);

const {
    DocumentacionTiMarkdown,
    DocumentacionTiPermiso,
    DocumentacionTiAdjuntos,
    DocumentacionTiManager
} = context.module.exports;

function test(name, fn) {
    try {
        fn();
        console.log('ok ', name);
    } catch (e) {
        console.error('FAIL', name, e.message);
        process.exitCode = 1;
    }
}

test('markdown no ejecuta HTML ni javascript:', () => {
    const html = DocumentacionTiMarkdown.render('<img src=x onerror=alert(1)>\n[x](javascript:alert(1))\n```js\nalert(1)\n```');
    assert(!html.includes('<img src=x'));
    assert(html.includes('&lt;img'));
    assert(!html.includes('href="javascript:'));
    assert(html.includes('alert(1)'));
    assert(html.includes('doc-ti-copy'));
});

test('markdown permite https y tablas', () => {
    const html = DocumentacionTiMarkdown.render('| A | B |\n| --- | --- |\n| 1 | 2 |\n\n[ok](https://example.com)');
    assert(html.includes('<table'));
    assert(html.includes('href="https://example.com"'));
});

test('permisos: empleado TI lee; encargado ajeno no; encargado que supervisa TI sí', () => {
    const empTi = { id: 'e1', rol: 'empleado', departamento: 'TI-500', activo: true };
    const encRh = { id: 'r1', rol: 'encargado', departamento: 'RH-300', activo: true, departamentosEncargado: { 'RH-300': true } };
    const encTi = { id: 't1', rol: 'encargado', departamento: 'RH-300', activo: true, departamentosEncargado: { 'TI-500': true } };
    const inact = { id: 'x', rol: 'empleado', departamento: 'TI-500', activo: false };
    const admin = { id: 'a', rol: 'admin', departamento: 'DG-100', activo: true };
    assert.strictEqual(DocumentacionTiPermiso.puedeLeer(empTi), true);
    assert.strictEqual(DocumentacionTiPermiso.puedeLeer(encRh), false);
    assert.strictEqual(DocumentacionTiPermiso.puedeLeer(encTi), true);
    assert.strictEqual(DocumentacionTiPermiso.puedeLeer(inact), false);
    assert.strictEqual(DocumentacionTiPermiso.puedePublicar(empTi), false);
    assert.strictEqual(DocumentacionTiPermiso.puedePublicar(encTi), true);
    assert.strictEqual(DocumentacionTiPermiso.puedePublicar(admin), true);
    assert.strictEqual(DocumentacionTiPermiso.puedeEditarArticulo(empTi, { creadoPor: 'e1', estado: 'borrador' }), true);
    assert.strictEqual(DocumentacionTiPermiso.puedeEditarArticulo(empTi, { creadoPor: 'otro', estado: 'borrador' }), false);
});

test('magic bytes y CSV', () => {
    assert.strictEqual(DocumentacionTiAdjuntos.magicOk(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), 'application/pdf'), true);
    assert.strictEqual(DocumentacionTiAdjuntos.magicOk(Uint8Array.from([0x3c, 0x73, 0x76, 0x67]), 'image/png'), false);
    assert.strictEqual(DocumentacionTiAdjuntos.mimePermitido('image/svg+xml', 'x.svg'), false);
    assert.strictEqual(DocumentacionTiAdjuntos.mimePermitido('application/pdf', 'a.pdf'), true);
    const csv = DocumentacionTiManager.csvCell('=CMD|calc');
    assert.strictEqual(csv.charAt(0), "'");
});

test('URL http(s) solamente', () => {
    assert.strictEqual(DocumentacionTiMarkdown.safeUrl('javascript:alert(1)'), null);
    assert.ok(DocumentacionTiMarkdown.safeUrl('https://example.com/x'));
    let threw = false;
    try { DocumentacionTiManager.validarHttpUrl('javascript:alert(1)'); } catch (_) { threw = true; }
    assert.strictEqual(threw, true);
});

if (process.exitCode) {
    console.error('Hay pruebas fallidas');
} else {
    console.log('Todas las pruebas locales pasaron');
}
