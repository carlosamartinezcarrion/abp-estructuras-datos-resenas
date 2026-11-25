// Implementa un Montículo Binario (Heap) para gestión eficiente de prioridades
// Mantiene en la cima (índice 0) el elemento más prioritario según el comparador (O(1) consulta, O(log n) actualización)
class Monticulo {
  constructor(comparador = (a, b) => a - b) {
    if (typeof comparador !== 'function') {
      throw new Error('Se requiere una función comparadora válida.');
    }
    this.datos = []; // Arreglo interno que representa el árbol binario completo por niveles
    this.comparador = comparador;
  }

  // Retorna la cantidad actual de elementos almacenados en el montículo
  get tamano() {
    return this.datos.length;
  }

  // Verifica si el montículo no contiene elementos
  estaVacio() {
    return this.datos.length === 0;
  }

  // Consulta el elemento de mayor prioridad sin extraerlo (complejidad O(1))
  verCima() {
    return this.datos.length > 0 ? this.datos[0] : null;
  }

  // --- Métodos auxiliares para navegar el árbol dentro del arreglo ---

  // Calcula el índice del nodo padre a partir de un hijo
  _indicePadre(i) {
    return Math.floor((i - 1) / 2);
  }

  // Calcula el índice del hijo izquierdo
  _indiceIzquierdo(i) {
    return 2 * i + 1;
  }

  // Calcula el índice del hijo derecho
  _indiceDerecho(i) {
    return 2 * i + 2;
  }

  // Intercambia dos elementos de posición dentro del arreglo interno
  _intercambiar(i, j) {
    const temp = this.datos[i];
    this.datos[i] = this.datos[j];
    this.datos[j] = temp;
  }

  // --- Operaciones principales del montículo ---

  // Inserta un nuevo elemento y restaura la propiedad del montículo (complejidad O(log n))
  insertar(elemento) {
    // 1. Agrega el elemento al final del arreglo para mantener el árbol completo
    this.datos.push(elemento);
    // 2. Lo hace flotar hacia arriba hasta encontrar su posición válida
    this._flotar(this.datos.length - 1);
  }

  // Reordena hacia arriba (Heapify Up) intercambiando el nodo con su padre mientras tenga mayor prioridad
  _flotar(indice) {
    let actual = indice;

    while (actual > 0) {
      const padre = this._indicePadre(actual);

      // Si comparador < 0, el hijo tiene mayor prioridad que su padre y debe subir
      if (this.comparador(this.datos[actual], this.datos[padre]) < 0) {
        this._intercambiar(actual, padre);
        actual = padre; // Continúa evaluando desde la nueva posición del padre
      } else {
        break; // Ya cumple la propiedad de orden del montículo
      }
    }
  }

  // Extrae y retorna el elemento de mayor prioridad de la cima (complejidad O(log n))
  extraerCima() {
    // Caso base: si está vacío o tiene un solo elemento, resuelve directamente
    if (this.estaVacio()) return null;
    if (this.datos.length === 1) return this.datos.pop();

    // 1. Guarda la raíz (elemento #1) para retornarla al final
    const cima = this.datos[0];
    // 2. Mueve el último elemento a la raíz para no dejar huecos en el árbol
    this.datos[0] = this.datos.pop();
    // 3. Hunde la nueva raíz hacia abajo hasta restaurar el orden
    this._hundir(0);

    return cima;
  }

  // Reordena hacia abajo (Heapify Down) intercambiando el nodo con su hijo más prioritario
  _hundir(indice) {
    let actual = indice;
    const n = this.datos.length;

    while (true) {
      const izq = this._indiceIzquierdo(actual);
      const der = this._indiceDerecho(actual);
      let prioritario = actual;

      // Verifica si el hijo izquierdo existe y tiene mayor prioridad que el nodo actual
      if (izq < n && this.comparador(this.datos[izq], this.datos[prioritario]) < 0) {
        prioritario = izq;
      }

      // Verifica si el hijo derecho existe y supera en prioridad al ganador anterior
      if (der < n && this.comparador(this.datos[der], this.datos[prioritario]) < 0) {
        prioritario = der;
      }

      // Si alguno de los hijos tiene mayor prioridad, intercambia y sigue bajando
      if (prioritario !== actual) {
        this._intercambiar(actual, prioritario);
        actual = prioritario;
      } else {
        break; // El nodo actual ya es más prioritario que ambos hijos
      }
    }
  }

  // Construye un montículo directamente desde un arreglo existente en tiempo lineal O(n) (Algoritmo de Floyd)
  static desdeArreglo(arreglo, comparador = (a, b) => a - b) {
    const monticulo = new Monticulo(comparador);
    // Clona el arreglo para evitar mutar la colección original (inmutabilidad)
    monticulo.datos = [...arreglo];

    // Empieza desde el último nodo padre (mitad del arreglo) hacia la raíz hundiendo cada subárbol
    for (let i = Math.floor(monticulo.datos.length / 2) - 1; i >= 0; i--) {
      monticulo._hundir(i);
    }

    return monticulo;
  }

  // Obtiene las 'k' mejores películas sin destruir los datos almacenados en el montículo original
  obtenerTopK(k) {
    // Crea una copia temporal del montículo para realizar las extracciones de forma segura
    const copia = new Monticulo(this.comparador);
    copia.datos = [...this.datos];

    const limite = Math.min(k, copia.tamano);
    const ranking = [];

    // Extrae secuencialmente los 'k' elementos más prioritarios en O(k log n)
    for (let i = 0; i < limite; i++) {
      ranking.push(copia.extraerCima());
    }

    return ranking;
  }
}

module.exports = { Monticulo };