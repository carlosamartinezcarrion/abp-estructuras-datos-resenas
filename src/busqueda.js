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
module.exports = { busquedaSecuencial, buscarPorTitulo, normalizar };
