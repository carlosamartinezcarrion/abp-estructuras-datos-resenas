'use strict';
// Lista doblemente enlazada con cursor (actual): permite navegar hacia adelante y hacia atrás.
// avanzar, retroceder, agregar al inicio o al final y eliminar el nodo actual: todo en O(1),
// porque cada nodo guarda sus referencias anterior y siguiente y el cursor señala el nodo de trabajo.
class Nodo { constructor(dato) { this.dato = dato; this.anterior = null; this.siguiente = null; } }

class ListaDoble {
  constructor() { this.cabeza = null; this.cola = null; this.actual = null; this.longitud = 0; }

  insertar(dato) { // al final
    const n = new Nodo(dato);
    if (this.cola) { this.cola.siguiente = n; n.anterior = this.cola; } else this.cabeza = n;
    this.cola = n;
    if (!this.actual) this.actual = n;
    this.longitud++;
  }
  insertarInicio(dato) {
    const n = new Nodo(dato);
    if (this.cabeza) { this.cabeza.anterior = n; n.siguiente = this.cabeza; } else this.cola = n;
    this.cabeza = n;
    if (!this.actual) this.actual = n;
    this.longitud++;
  }

  obtenerActual() { return this.actual ? this.actual.dato : null; }
  // Si no hay nodo siguiente (o anterior), el cursor no se mueve y devuelve null.
  avanzar() { if (this.actual && this.actual.siguiente) { this.actual = this.actual.siguiente; return this.actual.dato; } return null; }
  retroceder() { if (this.actual && this.actual.anterior) { this.actual = this.actual.anterior; return this.actual.dato; } return null; }
  irAlInicio() { this.actual = this.cabeza; return this.obtenerActual(); }
  irAlFinal() { this.actual = this.cola; return this.obtenerActual(); }

  // Elimina el nodo del cursor: reconecta a sus dos vecinos. El cursor pasa al siguiente (o al anterior si era la cola).
  eliminarActual() {
    const n = this.actual;
    if (!n) return false;
    if (n.anterior) n.anterior.siguiente = n.siguiente; else this.cabeza = n.siguiente;
    if (n.siguiente) n.siguiente.anterior = n.anterior; else this.cola = n.anterior;
    this.actual = n.siguiente || n.anterior;
    n.siguiente = n.anterior = null; // para que el recolector de basura libere el nodo
    this.longitud--;
    return true;
  }
}
module.exports = { ListaDoble };
