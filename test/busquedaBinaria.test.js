'use strict';
// Issue #32 (Emily): pruebas unitarias de búsqueda binaria y acceso indexado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { busquedaBinaria, busquedaBinariaConAcceso } = require('../src/busqueda');
const { ordenarMergeSort } = require('../src/MergeSort');
const { indexarPosiciones, leerPorPosicion } = require('../src/archivos');

test('arreglo: búsqueda en el primer elemento', () => {
  assert.deepEqual(busquedaBinaria([1, 2, 3, 4, 5], 1), { indice: 0, comparaciones: 2 });
});

test('arreglo: búsqueda en el último elemento', () => {
  assert.deepEqual(busquedaBinaria([1, 2, 3, 4, 5], 5), { indice: 4, comparaciones: 3 });
});

test('arreglo: un elemento encontrado y otro ausente', () => {
  assert.deepEqual(busquedaBinaria([42], 42), { indice: 0, comparaciones: 1 });
  assert.deepEqual(busquedaBinaria([42], 9), { indice: -1, comparaciones: 1 });
});

test('arreglo: vacío y valores que no existen', () => {
  assert.deepEqual(busquedaBinaria([], 3), { indice: -1, comparaciones: 0 });
  assert.equal(busquedaBinaria([2, 4, 6, 8], 7).indice, -1);
  assert.equal(busquedaBinaria([2, 4, 6, 8], 1).indice, -1);
  assert.equal(busquedaBinaria([2, 4, 6, 8], 99).indice, -1);
});

test('arreglo: funciona con películas ordenadas previamente mediante MergeSort', () => {
  const registros = [{ id: 9 }, { id: 1 }, { id: 5 }, { id: 7 }];
  const compararPorId = (a, b) => a.id - b.id;
  const ordenadas = ordenarMergeSort(registros, compararPorId);
  assert.deepEqual(ordenadas.map(x => x.id), [1, 5, 7, 9]);
  const obtenido = busquedaBinaria(ordenadas, { id: 7 }, compararPorId);
  assert.deepEqual(obtenido, { indice: 2, comparaciones: 2 });
  assert.equal(busquedaBinaria(ordenadas, { id: 4 }, compararPorId).indice, -1);
});

test('arreglo: duplicados devuelven una posición válida del objetivo', () => {
  const datos = [1, 2, 2, 2, 3];
  const respuesta = busquedaBinaria(datos, 2);
  assert.equal(datos[respuesta.indice], 2);
});

test('arreglo: en 100.000 elementos usa un número logarítmico de accesos', () => {
  const datos = Array.from({ length: 100_000 }, (_, i) => i + 1);
  for (const objetivo of [1, 50_000, 100_000, 200_000]) {
    const r = busquedaBinaria(datos, objetivo);
    assert.ok(r.comparaciones <= Math.ceil(Math.log2(datos.length + 1)));
    assert.equal(r.indice === -1, objetivo > 100_000);
  }
});

test('arreglo: parámetros inválidos producen un error legible', () => {
  assert.throws(() => busquedaBinaria(null, 3), TypeError);
  assert.throws(() => busquedaBinariaConAcceso(-1, () => 1, 3), RangeError);
  assert.throws(() => busquedaBinaria([1], 1, () => NaN), TypeError);
});

function conArchivo(registros, ejecutar) {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'test-binaria-'));
  const ruta = path.join(carpeta, 'peliculas.jsonl');
  try {
    fs.writeFileSync(ruta, registros.map(x => JSON.stringify(x)).join('\n') + (registros.length ? '\n' : ''), 'utf8');
    const posiciones = indexarPosiciones(ruta);
    const buscar = id => busquedaBinariaConAcceso(posiciones.length,
      i => leerPorPosicion(ruta, posiciones, i), id, (registro, clave) => registro.id - clave);
    ejecutar(buscar, posiciones);
  } finally { fs.rmSync(carpeta, { force: true, recursive: true }); }
}

test('archivo indexado: primer y último registro', () => {
  conArchivo([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }], buscar => {
    assert.equal(buscar(1).indice, 0);
    assert.equal(buscar(5).indice, 4);
  });
});

test('archivo indexado: caso vacío y registro inexistente', () => {
  conArchivo([], buscar => assert.deepEqual(buscar(4), { indice: -1, comparaciones: 0 }));
  conArchivo([{ id: 2 }, { id: 4 }, { id: 6 }], buscar => assert.equal(buscar(3).indice, -1));
});

test('archivo indexado: un registro encontrado', () => {
  conArchivo([{ id: 22 }], buscar => assert.deepEqual(buscar(22), { indice: 0, comparaciones: 1 }));
});
