'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Pila } = require('../src/pila');

test('Pila vacía: pop y cima devuelven undefined', () => {
  const p = new Pila();
  assert.equal(p.vacia(), true);
  assert.equal(p.pop(), undefined);
  assert.equal(p.cima(), undefined);
});

test('Pila: el último en entrar es el primero en salir', () => {
  const p = new Pila();
  ['a', 'b', 'c'].forEach((x) => p.push(x));
  assert.equal(p.tamano, 3); assert.equal(p.cima(), 'c');
  assert.equal(p.pop(), 'c'); assert.equal(p.pop(), 'b');
  assert.equal(p.cima(), 'a'); assert.equal(p.vacia(), false);
  assert.equal(p.pop(), 'a'); assert.equal(p.vacia(), true);
});

test('Pila con 100 000 elementos: devuelve todo en orden inverso', () => {
  const p = new Pila(), N = 100000;
  for (let i = 0; i < N; i++) p.push({ id: i });
  assert.equal(p.tamano, N);
  for (let i = N - 1; i >= 0; i--) assert.equal(p.pop().id, i);
  assert.equal(p.tamano, 0);
});
