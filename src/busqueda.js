'use strict';
// Búsqueda secuencial: se revisan los elementos del arreglo uno por uno. Peor caso: O(n).
function busquedaSecuencial(arreglo, predicado) {
  for (let i = 0; i < arreglo.length; i++) if (predicado(arreglo[i])) return i;
  return -1;
}

// Minúsculas y sin tildes, para que "Amélie" y "amelie" coincidan.
function normalizar(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Películas cuyo título contiene el texto. Se detiene al juntar k resultados.
function buscarPorTitulo(peliculas, texto, k = 10) {
  const t = normalizar(texto), res = [];
  if (t === '' || k <= 0) return res;
  for (let i = 0; i < peliculas.length && res.length < k; i++) {
    if (normalizar(peliculas[i].titulo).includes(t)) res.push(peliculas[i]);
  }
  return res;
}

// Comparador ascendente por defecto (números o cadenas).
// Para objetos, pasar el mismo comparador que se utilizó al ordenar con MergeSort.
function compararAscendente(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

// Núcleo binario reusable para almacenamiento en RAM o accesos indexados.
// Se contabiliza UNA comparación de claves por posición central inspeccionada.
function busquedaBinariaConAcceso(longitud, leerPosicion, objetivo, comparador = compararAscendente) {
  if (!Number.isSafeInteger(longitud) || longitud < 0) {
    throw new RangeError('La longitud debe ser un entero no negativo');
  }
  if (typeof leerPosicion !== 'function' || typeof comparador !== 'function') {
    throw new TypeError('Se requieren funciones de acceso y comparación');
  }
  let izquierda = 0;
  let derecha = longitud - 1;
  let comparaciones = 0;

  while (izquierda <= derecha) {
    const medio = izquierda + Math.floor((derecha - izquierda) / 2);
    const orden = comparador(leerPosicion(medio), objetivo);
    if (typeof orden !== 'number' || Number.isNaN(orden)) {
      throw new TypeError('El comparador debe devolver un número válido');
    }
    comparaciones++;
    if (orden === 0) return { indice: medio, comparaciones };
    if (orden < 0) izquierda = medio + 1;
    else derecha = medio - 1;
  }
  return { indice: -1, comparaciones };
}


function busquedaBinaria(arreglo, objetivo, comparador = compararAscendente) {
  if (!Array.isArray(arreglo)) throw new TypeError('Se requiere un arreglo ordenado');
  return busquedaBinariaConAcceso(arreglo.length, indice => arreglo[indice], objetivo, comparador);
}

module.exports = {
  busquedaSecuencial,
  buscarPorTitulo,
  normalizar,
  busquedaBinaria,
  busquedaBinariaConAcceso,
};
