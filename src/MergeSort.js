// Ordena un arreglo utilizando el algoritmo MergeSort (complejidad O(n log n) garantizada y estable)
function ordenarMergeSort(arreglo, comparador = (a, b) => a - b) {
  // Caso base: si el arreglo tiene 0 o 1 elemento, ya se encuentra ordenado
  if (arreglo.length <= 1) {
    return arreglo;
  }

  // 1. Divide el arreglo en dos mitades aproximadamente iguales
  const mitad = Math.floor(arreglo.length / 2);
  const izquierda = ordenarMergeSort(arreglo.slice(0, mitad), comparador);
  const derecha = ordenarMergeSort(arreglo.slice(mitad), comparador);

  // 2. Combina ambas mitades ya ordenadas en un solo arreglo resultante
  return mezclar(izquierda, derecha, comparador);
}

// Fusiona dos subarreglos previamente ordenados respetando el criterio de comparación
function mezclar(izquierda, derecha, comparador) {
  const resultado = [];
  // Punteros 'i' y 'j' para recorrer los subarreglos izquierdo y derecho sin modificarlos
  let i = 0;
  let j = 0;

  // Compara elemento por elemento de ambos subarreglos mientras queden pendientes en los dos
  while (i < izquierda.length && j < derecha.length) {
    // Usa '<= 0' para mantener el orden original en caso de empate (estabilidad del algoritmo)
    if (comparador(izquierda[i], derecha[j]) <= 0) {
      resultado.push(izquierda[i]);
      i++; // Avanza el puntero del subarreglo izquierdo
    } else {
      resultado.push(derecha[j]);
      j++; // Avanza el puntero del subarreglo derecho
    }
  }

  // Si sobraron elementos en la mitad izquierda, los agrega directamente al final
  while (i < izquierda.length) {
    resultado.push(izquierda[i]);
    i++;
  }

  // Si sobraron elementos en la mitad derecha, los agrega directamente al final
  while (j < derecha.length) {
    resultado.push(derecha[j]);
    j++;
  }

  // Retorna el nuevo arreglo completamente fusionado y ordenado
  return resultado;
}

module.exports = { ordenarMergeSort, mezclar };