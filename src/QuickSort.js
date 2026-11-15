// Ordena un arreglo in-place utilizando el algoritmo QuickSort (complejidad promedio O(n log n))
function ordenarQuickSort(arreglo, comparador = (a, b) => a - b, inicio = 0, fin = arreglo.length - 1) {
  // Caso base: si inicio >= fin, el subarreglo tiene 0 o 1 elemento y ya está ordenado
  if (inicio < fin) {
    // 1. Reorganiza los elementos alrededor de un pivote y obtiene su posición final exacta
    const indicePivote = particionar(arreglo, comparador, inicio, fin);

    // 2. Ordena recursivamente la sublista izquierda (elementos menores o iguales al pivote)
    ordenarQuickSort(arreglo, comparador, inicio, indicePivote - 1);

    // 3. Ordena recursivamente la sublista derecha (elementos mayores al pivote)
    ordenarQuickSort(arreglo, comparador, indicePivote + 1, fin);
  }

  return arreglo;
}

// Partición de Lomuto con pivote central: deja los menores/iguales a la izquierda y los mayores a la derecha
function particionar(arreglo, comparador, inicio, fin) {
  // Selecciona el elemento del centro para evitar el peor caso O(n^2) en listas ya ordenadas
  const indiceMedio = Math.floor((inicio + fin) / 2);

  // Mueve el elemento central al final para usarlo como pivote con el esquema estándar de Lomuto
  [arreglo[indiceMedio], arreglo[fin]] = [arreglo[fin], arreglo[indiceMedio]];

  // Valor de referencia contra el cual se compararán los demás elementos
  const pivote = arreglo[fin];

  // 'i' marca la frontera donde termina el grupo de elementos menores o iguales al pivote
  let i = inicio - 1;

  // 'j' recorre todo el subarreglo desde 'inicio' hasta antes del pivote ('fin - 1')
  for (let j = inicio; j < fin; j++) {
    // Si el elemento actual es menor o igual al pivote según el criterio dado
    if (comparador(arreglo[j], pivote) <= 0) {
      i = i + 1; // Avanza la frontera de los menores
      // Intercambia el elemento actual hacia la zona izquierda de menores
      [arreglo[i], arreglo[j]] = [arreglo[j], arreglo[i]];
    }
  }

  // Coloca el pivote justo después del último elemento menor (su posición ordenada definitiva)
  [arreglo[i + 1], arreglo[fin]] = [arreglo[fin], arreglo[i + 1]];

  // Retorna el índice donde quedó el pivote para dividir las siguientes llamadas recursivas
  return i + 1;
}

module.exports = { ordenarQuickSort, particionar };