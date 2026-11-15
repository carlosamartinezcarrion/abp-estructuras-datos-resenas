'use strict';
// Pila (LIFO) con nodos enlazados: el último en entrar es el primero en salir. Todas las operaciones: O(1).
class NodoPila { constructor(valor, debajo) { this.valor = valor; this.debajo = debajo; } }
class Pila {
  constructor() { this.tope = null; this.tamano = 0; }
  push(valor) { this.tope = new NodoPila(valor, this.tope); this.tamano++; }
  pop() { if (!this.tope) return undefined; const v = this.tope.valor; this.tope = this.tope.debajo; this.tamano--; return v; }
  cima() { return this.tope ? this.tope.valor : undefined; }
  vacia() { return this.tope === null; }
}
module.exports = { Pila };
