'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { leerJSON, guardarJSONL, agregarJSONL, cargarJSONL, indexarPosiciones, leerPorPosicion } = require('../src/archivos');

const tmp = (nombre) => path.join(os.tmpdir(), `abp-u1-${process.pid}-${nombre}`);

test('guardarJSONL y cargarJSONL (acceso secuencial) devuelven los mismos registros', () => {
  const ruta = tmp('a.jsonl'), datos = [{ a: 1 }, { b: 'dos' }, { c: [3] }];
  const g = guardarJSONL(ruta, datos);
  assert.equal(g.registros, 3); assert.ok(g.bytes > 0);
  const c = cargarJSONL(ruta);
  assert.deepEqual(c.registros, datos); assert.equal(c.errores, 0); assert.equal(c.bytes, g.bytes);
  fs.unlinkSync(ruta);
});
test('cargarJSONL cuenta y omite las líneas inválidas', () => {
  const ruta = tmp('b.jsonl'); fs.writeFileSync(ruta, '{"a":1}\nno-es-json\n\n{"b":2}');
  const c = cargarJSONL(ruta);
  assert.deepEqual(c.registros, [{ a: 1 }, { b: 2 }]); assert.equal(c.errores, 1);
  fs.unlinkSync(ruta);
});
test('agregarJSONL añade registros al final', () => {
  const ruta = tmp('c.jsonl'); guardarJSONL(ruta, [{ n: 1 }]);
  assert.equal(agregarJSONL(ruta, { n: 2 }), true);
  assert.deepEqual(cargarJSONL(ruta).registros, [{ n: 1 }, { n: 2 }]);
  fs.unlinkSync(ruta);
  assert.equal(agregarJSONL(path.join(os.tmpdir(), 'no', 'existe', 'x.jsonl'), { n: 1 }), false);
});
test('Acceso aleatorio: leerPorPosicion lee un registro sin cargar todo el archivo', () => {
  const ruta = tmp('d.jsonl'); const datos = Array.from({ length: 50 }, (_, i) => ({ i, texto: 'x'.repeat(i) }));
  guardarJSONL(ruta, datos);
  const pos = indexarPosiciones(ruta);
  assert.equal(pos.length, 50);
  assert.deepEqual(leerPorPosicion(ruta, pos, 0), datos[0]);
  assert.deepEqual(leerPorPosicion(ruta, pos, 37), datos[37]);
  assert.deepEqual(leerPorPosicion(ruta, pos, 49), datos[49]);
  assert.equal(leerPorPosicion(ruta, pos, 50), undefined);
  fs.unlinkSync(ruta);
});
test('Archivos con errores: el mensaje identifica el archivo y no se lanza excepción', () => {
  assert.match(leerJSON('no-existe.json').error, /no-existe\.json/);
  assert.match(cargarJSONL('no-existe.jsonl').error, /no-existe\.jsonl/);
  const ruta = tmp('roto.json'); fs.writeFileSync(ruta, '[{ "id": 1, ');
  assert.match(leerJSON(ruta).error, /roto\.json/);
  fs.unlinkSync(ruta);
  assert.match(guardarJSONL(path.join(os.tmpdir(), 'no', 'existe', 'x.jsonl'), [{}]).error, /x\.jsonl/);
  fs.writeFileSync(ruta, '{"ok": true}'); assert.deepEqual(leerJSON(ruta).datos, { ok: true }); fs.unlinkSync(ruta);
});

test('Lectura por stream (chunks) cuenta los mismos registros que la lectura síncrona', async () => {
  const ruta = tmp('stream.csv');
  guardarJSONL(ruta, Array.from({ length: 5000 }, (_, i) => ({ id: i, lat: i * 0.1 })));
  const sincrona = fs.readFileSync(ruta, 'utf8').split('\n').length - 1;
  let porStream = 0;
  await new Promise((ok, fallo) => {
    fs.createReadStream(ruta, { encoding: 'utf8', highWaterMark: 1024 })   // chunks pequeños: varios fragmentos
      .on('data', (chunk) => { porStream += (chunk.match(/\n/g) || []).length; })
      .on('end', ok).on('error', fallo);
  });
  assert.equal(porStream, 5000);
  assert.equal(porStream, sincrona);
  fs.unlinkSync(ruta);
});
