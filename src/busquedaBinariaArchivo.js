// Búsqueda binaria en un archivo JSON Lines ordenado (Unidad 2, Avance 2).
// En vez de leer todo el archivo, usa el índice de posiciones de archivos.js y lee solo los registros
// que necesita: cada comparación es una lectura. Peor caso: O(log n) lecturas, frente a O(n) del acceso secuencial.
// El archivo debe estar ordenado con el MISMO criterio con el que se busca (por eso existe crearArchivoOrdenado).
const { guardarJSONL, indexarPosiciones, leerPorPosicion } = require('./archivos');
const { ordenarMergeSort } = require('./MergeSort');

// Compara dos claves: los números como números y todo lo demás como texto.
// Ojo: como texto, "10" va antes que "9". Si los ids son texto, el archivo se ordena con este mismo criterio.
function compararClaves(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  const textoA = String(a);
  const textoB = String(b);
  return textoA === textoB ? 0 : (textoA < textoB ? -1 : 1);
}

// Lee las opciones: el campo por el que se busca (por defecto "id") y la función que compara claves
function leerOpciones(opciones) {
  const campo = opciones.campo === undefined ? 'id' : opciones.campo;
  const comparar = opciones.comparar === undefined ? compararClaves : opciones.comparar;
  if (typeof campo !== 'string' || campo === '') {
    throw new RangeError('El campo de búsqueda debe ser un texto no vacío');
  }
  if (typeof comparar !== 'function') {
    throw new TypeError('La opción "comparar" debe ser una función');
  }
  return { campo, comparar };
}

// Ordena una copia de los registros con MergeSort, los guarda en el archivo (uno por línea)
// y devuelve el índice de posiciones. No modifica el arreglo recibido.
// Devuelve { posiciones, registros, bytes } o { error } si no se pudo escribir el archivo.
function crearArchivoOrdenado(ruta, registros, opciones = {}) {
  if (!Array.isArray(registros)) {
    throw new TypeError('Los registros deben ser un arreglo');
  }
  const { campo, comparar } = leerOpciones(opciones);
  const ordenados = ordenarMergeSort(registros, (a, b) => comparar(a[campo], b[campo]));
  const guardado = guardarJSONL(ruta, ordenados);
  if (guardado.error) {
    return { error: guardado.error };
  }
  return { posiciones: indexarPosiciones(ruta), registros: guardado.registros, bytes: guardado.bytes };
}

// Busca el registro cuyo campo vale "valor". Devuelve { posicion, registro, comparaciones }:
// la posición en el archivo (o -1 si no existe) y cuántas comparaciones (lecturas) hizo.
// Si el archivo no se puede leer o un registro es inválido, devuelve además { error } sin lanzar excepción.
function busquedaBinariaArchivo(ruta, posiciones, valor, opciones = {}) {
  if (!Array.isArray(posiciones)) {
    throw new TypeError('Las posiciones deben ser el arreglo que devuelve indexarPosiciones');
  }
  const { campo, comparar } = leerOpciones(opciones);

  let bajo = 0;
  let alto = posiciones.length - 1;
  let comparaciones = 0;
  while (bajo <= alto) {
    // Se lee el registro del medio del rango que queda
    const medio = Math.floor((bajo + alto) / 2);
    let registro;
    try {
      registro = leerPorPosicion(ruta, posiciones, medio);
    } catch (e) {
      return { posicion: -1, registro: undefined, comparaciones, error: `No se pudo leer el registro ${medio} del archivo "${ruta}" (${e.code || e.message}).` };
    }
    if (registro === null || typeof registro !== 'object' || !(campo in registro)) {
      return { posicion: -1, registro: undefined, comparaciones, error: `El registro ${medio} del archivo "${ruta}" no tiene el campo "${campo}".` };
    }
    comparaciones++;
    const resultado = comparar(registro[campo], valor);
    if (resultado === 0) {
      return { posicion: medio, registro, comparaciones };
    }
    // Si la clave leída es menor, el valor está en la mitad de la derecha; si es mayor, en la de la izquierda
    if (resultado < 0) {
      bajo = medio + 1;
    } else {
      alto = medio - 1;
    }
  }
  return { posicion: -1, registro: undefined, comparaciones };
}

module.exports = { busquedaBinariaArchivo, crearArchivoOrdenado, compararClaves };