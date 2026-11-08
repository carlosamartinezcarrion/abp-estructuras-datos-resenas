'use strict';
// Cola circular de capacidad fija N: guarda solo las últimas N reseñas.
// Encolar: O(1). Leer el historial: O(N). Espacio: O(N).
class ColaCircular {
  constructor(capacidad) {
    if (!Number.isInteger(capacidad) || capacidad < 1) throw new RangeError('La capacidad debe ser un entero >= 1');
    this.datos = new Array(capacidad);
    this.inicio = 0;
    this.cantidad = 0;
  }
  encolar(elemento) {
    const n = this.datos.length;
    this.datos[(this.inicio + this.cantidad) % n] = elemento;
    if (this.cantidad < n) this.cantidad++;
    else this.inicio = (this.inicio + 1) % n; // llena: descarta la más antigua
  }
  // Devuelve del más antiguo al más reciente.
  aArreglo() {
    const n = this.datos.length, salida = [];
    for (let i = 0; i < this.cantidad; i++) salida.push(this.datos[(this.inicio + i) % n]);
    return salida;
  }
  get capacidad() { return this.datos.length; }
}
module.exports = { ColaCircular };
