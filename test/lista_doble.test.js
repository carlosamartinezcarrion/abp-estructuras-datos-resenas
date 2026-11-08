'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ListaDoble } = require('../src/listaDoble');

function listaDe(...ids) {
  const l = new ListaDoble();
  ids.forEach((id) => l.insertar({ id }));
  return l;
}

test('Al insertar, el cursor queda en el primer nodo y la longitud es correcta', () => {
  const l = listaDe(1, 2, 3);
  assert.equal(l.obtenerActual().id, 1);
  assert.equal(l.longitud, 3);
});

test('avanzar recorre la lista y al llegar a la cola devuelve null', () => {
  const l = listaDe(1, 2, 3);
  assert.equal(l.avanzar().id, 2);
  assert.equal(l.avanzar().id, 3);
  assert.equal(l.avanzar(), null);
  assert.equal(l.obtenerActual().id, 3);          // el cursor no se movió
});

test('retroceder vuelve atrás y en la cabeza devuelve null', () => {
  const l = listaDe(1, 2, 3);
  l.avanzar(); l.avanzar();
  assert.equal(l.retroceder().id, 2);
  assert.equal(l.retroceder().id, 1);
  assert.equal(l.retroceder(), null);
  assert.equal(l.obtenerActual().id, 1);
});

test('eliminarActual en un nodo intermedio reconecta a sus vecinos', () => {
  const l = listaDe(1, 2, 3);
  l.avanzar();                                    // cursor en 2
  assert.equal(l.eliminarActual(), true);
  assert.equal(l.longitud, 2);
  assert.equal(l.obtenerActual().id, 3);          // el cursor pasa al siguiente
  assert.equal(l.retroceder().id, 1);             // 1 y 3 quedaron enlazados
  assert.equal(l.avanzar().id, 3);
});

test('eliminarActual en la cabeza, en la cola y en el único nodo actualiza los punteros', () => {
  const l = listaDe(1, 2, 3);
  assert.equal(l.eliminarActual(), true);         // cabeza
  assert.equal(l.cabeza.dato.id, 2); assert.equal(l.cabeza.anterior, null);
  l.irAlFinal();
  assert.equal(l.eliminarActual(), true);         // cola: el cursor pasa al anterior
  assert.equal(l.cola.dato.id, 2); assert.equal(l.cola.siguiente, null);
  assert.equal(l.obtenerActual().id, 2);
  assert.equal(l.eliminarActual(), true);         // único nodo
  assert.equal(l.cabeza, null); assert.equal(l.cola, null); assert.equal(l.actual, null);
  assert.equal(l.longitud, 0);
});

test('Lista vacía: todo devuelve null o false sin lanzar errores', () => {
  const l = new ListaDoble();
  assert.equal(l.obtenerActual(), null);
  assert.equal(l.avanzar(), null);
  assert.equal(l.retroceder(), null);
  assert.equal(l.irAlInicio(), null);
  assert.equal(l.irAlFinal(), null);
  assert.equal(l.eliminarActual(), false);
  assert.equal(l.longitud, 0);
});

test('irAlInicio e irAlFinal mueven el cursor a los extremos', () => {
  const l = listaDe(1, 2, 3);
  assert.equal(l.irAlFinal().id, 3);
  assert.equal(l.irAlInicio().id, 1);
});

test('insertarInicio deja el último dato como cabeza', () => {
  const l = new ListaDoble();
  for (let i = 0; i < 5; i++) l.insertarInicio({ id: i });
  const ids = []; for (let n = l.cabeza; n; n = n.siguiente) ids.push(n.dato.id);
  assert.deepEqual(ids, [4, 3, 2, 1, 0]);
  assert.equal(l.cola.dato.id, 0);
  assert.equal(l.longitud, 5);
});

test('insertarInicio en lista vacía y mezclado con insertar al final', () => {
  const l = new ListaDoble();
  l.insertarInicio('b'); l.insertarInicio('a'); l.insertar('c');
  const v = []; for (let n = l.cabeza; n; n = n.siguiente) v.push(n.dato);
  assert.deepEqual(v, ['a', 'b', 'c']);
  assert.equal(l.obtenerActual(), 'b');
});

test('Los enlaces anterior y siguiente quedan cruzados en ambos sentidos', () => {
  const l = listaDe('a', 'b', 'c', 'd');
  const adelante = [], atras = [];
  for (let n = l.cabeza; n; n = n.siguiente) adelante.push(n.dato.id);
  for (let n = l.cola; n; n = n.anterior) atras.push(n.dato.id);
  assert.deepEqual(adelante, ['a', 'b', 'c', 'd']);
  assert.deepEqual(atras, ['d', 'c', 'b', 'a']);
  assert.equal(l.cabeza.anterior, null); assert.equal(l.cola.siguiente, null);
});
