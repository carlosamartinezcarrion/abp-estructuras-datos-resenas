const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { busquedaBinariaArchivo, crearArchivoOrdenado, compararClaves } = require('../src/BusquedaBinariaArchivo');
const { guardarJSONL, indexarPosiciones, cargarJSONL } = require('../src/archivos');
const { busquedaSecuencial } = require('../src/busqueda');

const tmp = (nombre) => path.join(os.tmpdir(), `abp-u2-${process.pid}-${nombre}`);
// Registros con ids 2, 4, 6, ... (así hay huecos para buscar ids que no existen)
const pares = (n) => Array.from({ length: n }, (_, i) => ({ id: (i + 1) * 2, titulo: `Pelicula ${i}` }));

test('encuentra el primero, el del medio y el último registro', () => {
  const ruta = tmp('a.jsonl');
  const datos = pares(1000);
  const { posiciones } = crearArchivoOrdenado(ruta, datos);
  for (const i of [0, 499, 999]) {
    const r = busquedaBinariaArchivo(ruta, posiciones, datos[i].id);
    assert.equal(r.posicion, i);
    assert.deepEqual(r.registro, datos[i]);
  }
  fs.unlinkSync(ruta);
});

test('devuelve -1 si el id no existe (menor, mayor o entre dos ids)', () => {
  const ruta = tmp('b.jsonl');
  const { posiciones } = crearArchivoOrdenado(ruta, pares(100));
  for (const valor of [1, 7, 201, 5000, -3]) {
    const r = busquedaBinariaArchivo(ruta, posiciones, valor);
    assert.equal(r.posicion, -1);
    assert.equal(r.registro, undefined);
    assert.equal(r.error, undefined);
  }
  fs.unlinkSync(ruta);
});

test('hace como máximo log2(n)+1 comparaciones: con 1 000 registros, nunca más de 10', () => {
  const ruta = tmp('c.jsonl');
  const datos = pares(1000);
  const { posiciones } = crearArchivoOrdenado(ruta, datos);
  let total = 0;
  for (const d of datos) {
    const r = busquedaBinariaArchivo(ruta, posiciones, d.id);
    assert.ok(r.comparaciones <= 10, `id ${d.id}: ${r.comparaciones} comparaciones`);
    total += r.comparaciones;
  }
  assert.ok(total / datos.length < 10); // el promedio es muy inferior a n/2 = 500 del acceso secuencial
  fs.unlinkSync(ruta);
});

test('archivo vacío y archivo de un solo registro', () => {
  const vacio = tmp('d.jsonl');
  const v = crearArchivoOrdenado(vacio, []);
  assert.deepEqual(v.posiciones, []);
  assert.deepEqual(busquedaBinariaArchivo(vacio, v.posiciones, 5), { posicion: -1, registro: undefined, comparaciones: 0 });
  fs.unlinkSync(vacio);

  const uno = tmp('e.jsonl');
  const u = crearArchivoOrdenado(uno, [{ id: 8 }]);
  assert.equal(busquedaBinariaArchivo(uno, u.posiciones, 8).posicion, 0);
  assert.equal(busquedaBinariaArchivo(uno, u.posiciones, 9).posicion, -1);
  fs.unlinkSync(uno);
});

test('crearArchivoOrdenado ordena el archivo, devuelve el índice y no modifica el arreglo recibido', () => {
  const ruta = tmp('f.jsonl');
  const desordenado = [{ id: 30 }, { id: 5 }, { id: 18 }, { id: 1 }];
  const copia = JSON.parse(JSON.stringify(desordenado));
  const r = crearArchivoOrdenado(ruta, desordenado);
  assert.deepEqual(desordenado, copia);
  assert.deepEqual(cargarJSONL(ruta).registros.map((x) => x.id), [1, 5, 18, 30]);
  assert.equal(r.registros, 4);
  assert.equal(r.posiciones.length, 4);
  fs.unlinkSync(ruta);
});

test('ids de texto: se ordena y se busca con el mismo criterio ("10" va antes que "9")', () => {
  const ruta = tmp('g.jsonl');
  const datos = ['9', '10', '2', '100', '33'].map((id) => ({ id }));
  const { posiciones } = crearArchivoOrdenado(ruta, datos);
  assert.deepEqual(cargarJSONL(ruta).registros.map((x) => x.id), ['10', '100', '2', '33', '9']);
  for (const d of datos) {
    assert.equal(busquedaBinariaArchivo(ruta, posiciones, d.id).registro.id, d.id);
  }
  fs.unlinkSync(ruta);
});

test('se puede buscar por otro campo y con otro comparador', () => {
  const ruta = tmp('h.jsonl');
  const datos = [{ clave: 'Zeta' }, { clave: 'alfa' }, { clave: 'Beta' }];
  const sinMayusculas = { campo: 'clave', comparar: (a, b) => compararClaves(a.toLowerCase(), b.toLowerCase()) };
  const { posiciones } = crearArchivoOrdenado(ruta, datos, sinMayusculas);
  assert.deepEqual(cargarJSONL(ruta).registros.map((x) => x.clave), ['alfa', 'Beta', 'Zeta']);
  assert.equal(busquedaBinariaArchivo(ruta, posiciones, 'beta', sinMayusculas).posicion, 1);
  fs.unlinkSync(ruta);
});

test('da el mismo resultado que la búsqueda secuencial (existentes y no existentes)', () => {
  const ruta = tmp('i.jsonl');
  const { posiciones } = crearArchivoOrdenado(ruta, pares(300));
  const enMemoria = cargarJSONL(ruta).registros;
  for (let valor = -2; valor <= 610; valor += 3) {
    const secuencial = busquedaSecuencial(enMemoria, (p) => p.id === valor);
    assert.equal(busquedaBinariaArchivo(ruta, posiciones, valor).posicion, secuencial, `valor ${valor}`);
  }
  fs.unlinkSync(ruta);
});

test('errores: archivo inexistente o registro sin el campo se informan sin lanzar excepción', () => {
  const ruta = tmp('j.jsonl');
  const { posiciones } = crearArchivoOrdenado(ruta, pares(10));
  fs.unlinkSync(ruta); // el índice queda apuntando a un archivo que ya no existe
  const r = busquedaBinariaArchivo(ruta, posiciones, 6);
  assert.equal(r.posicion, -1);
  assert.match(r.error, /abp-u2-.*j\.jsonl/);

  const sinCampo = tmp('k.jsonl');
  guardarJSONL(sinCampo, [{ otro: 1 }, { otro: 2 }]);
  const s = busquedaBinariaArchivo(sinCampo, indexarPosiciones(sinCampo), 1);
  assert.match(s.error, /campo "id"/);
  fs.unlinkSync(sinCampo);
});

test('argumentos inválidos lanzan error de programación', () => {
  assert.throws(() => busquedaBinariaArchivo('x.jsonl', 'no es arreglo', 1), TypeError);
  assert.throws(() => busquedaBinariaArchivo('x.jsonl', [], 1, { campo: '' }), RangeError);
  assert.throws(() => busquedaBinariaArchivo('x.jsonl', [], 1, { comparar: 5 }), TypeError);
  assert.throws(() => crearArchivoOrdenado(tmp('l.jsonl'), 'no es arreglo'), TypeError);
});

test('crearArchivoOrdenado informa si no puede escribir el archivo', () => {
  const r = crearArchivoOrdenado(path.join(os.tmpdir(), 'no', 'existe', 'x.jsonl'), [{ id: 1 }]);
  assert.match(r.error, /x\.jsonl/);
});