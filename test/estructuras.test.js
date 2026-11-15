'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ColaCircular } = require('../src/colaCircular');
const { busquedaSecuencial, buscarPorTitulo, normalizar } = require('../src/busqueda');

test('ColaCircular: conserva solo las últimas N, de la más antigua a la más reciente', () => {
  const c = new ColaCircular(3);
  c.encolar(1); c.encolar(2);
  assert.deepEqual(c.aArreglo(), [1, 2]);
  c.encolar(3); c.encolar(4); c.encolar(5);
  assert.deepEqual(c.aArreglo(), [3, 4, 5]);
  assert.equal(c.capacidad, 3); assert.equal(c.cantidad, 3);
});
test('ColaCircular rechaza una capacidad inválida', () => {
  assert.throws(() => new ColaCircular(0), RangeError);
  assert.throws(() => new ColaCircular(2.5), RangeError);
});

test('busquedaSecuencial devuelve la posición o -1', () => {
  const a = [5, 8, 2];
  assert.equal(busquedaSecuencial(a, (x) => x === 8), 1);
  assert.equal(busquedaSecuencial(a, (x) => x === 9), -1);
  assert.equal(busquedaSecuencial([], () => true), -1);
});
test('normalizar quita tildes y mayúsculas', () => {
  assert.equal(normalizar(' Amélie '), 'amelie');
});
test('buscarPorTitulo: coincidencia parcial, sin tildes y con límite k', () => {
  const pelis = [{ titulo: 'The Godfather' }, { titulo: 'The Godfather Part II' }, { titulo: 'Amélie' }, { titulo: 'Inception' }];
  assert.deepEqual(buscarPorTitulo(pelis, 'godf').map((p) => p.titulo), ['The Godfather', 'The Godfather Part II']);
  assert.deepEqual(buscarPorTitulo(pelis, 'amelie').map((p) => p.titulo), ['Amélie']);
  assert.equal(buscarPorTitulo(pelis, 'the', 1).length, 1);
  assert.deepEqual(buscarPorTitulo(pelis, ''), []);
  assert.deepEqual(buscarPorTitulo(pelis, 'the', 0), []);
  assert.deepEqual(buscarPorTitulo(pelis, 'zzz'), []);
});
