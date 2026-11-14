// Comparadores para ordenar películas por varios criterios (Unidad 2, Avance 1).
// Un comparador recibe dos películas y devuelve un número negativo si la primera va antes,
// positivo si va después y 0 si empatan. Se pasa como parámetro a ordenarMergeSort y ordenarQuickSort.
// Este módulo no ordena nada: solo decide cuál de dos elementos va primero.
const { normalizar } = require('./busqueda');

// Campos que se comparan como número y campos que se comparan como texto
const CAMPOS_NUMERICOS = new Set(['promedio', 'cantidad', 'anio']);
const CAMPOS_TEXTO = new Set(['titulo']);

// Guarda el título ya normalizado de cada película (minúsculas, sin tildes).
// Así no se repite la normalización en cada comparación y, al ser un WeakMap,
// no se retiene memoria de películas que ya no existen.
const titulosNormalizados = new WeakMap();

function claveTitulo(pelicula) {
  // Un valor que no es objeto no se puede guardar en el WeakMap: se trata como título vacío
  if (typeof pelicula !== 'object') {
    return '';
  }
  let clave = titulosNormalizados.get(pelicula);
  if (clave === undefined) {
    clave = normalizar(typeof pelicula.titulo === 'string' ? pelicula.titulo : '');
    titulosNormalizados.set(pelicula, clave);
  }
  return clave;
}

// Devuelve el valor numérico del campo, o null si no tiene dato (null, undefined, NaN, texto)
function numeroOnulo(pelicula, campo) {
  const valor = pelicula[campo];
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

// Compara un solo campo de dos películas. Lo que no tiene dato va siempre al final,
// sin importar si el orden es ascendente o descendente.
function compararCampo(a, b, regla) {
  if (regla.texto) {
    const textoA = claveTitulo(a);
    const textoB = claveTitulo(b);
    return textoA === textoB ? 0 : (textoA < textoB ? -1 : 1) * regla.factor;
  }
  const valorA = numeroOnulo(a, regla.campo);
  const valorB = numeroOnulo(b, regla.campo);
  if (valorA === null && valorB === null) return 0;
  if (valorA === null) return 1;
  if (valorB === null) return -1;
  return valorA === valorB ? 0 : (valorA < valorB ? -1 : 1) * regla.factor;
}

// Combina varios criterios en un solo comparador. El siguiente criterio se usa solo si todos
// los anteriores empatan. Cada criterio es { campo, orden }, con campo en
// 'promedio' | 'cantidad' | 'anio' | 'titulo' y orden 'asc' (por defecto) o 'desc'.
// Costo de una comparación: O(c), con c = cantidad de criterios.
function crearComparador(criterios) {
  if (!Array.isArray(criterios) || criterios.length === 0) {
    throw new RangeError('Debe indicar al menos un criterio de ordenamiento');
  }

  // Valida cada criterio una sola vez y lo deja listo para no repetir trabajo al comparar
  const reglas = criterios.map((criterio) => {
    const campo = criterio && criterio.campo;
    const orden = criterio && criterio.orden !== undefined ? criterio.orden : 'asc';
    if (!CAMPOS_NUMERICOS.has(campo) && !CAMPOS_TEXTO.has(campo)) {
      throw new RangeError(`Campo de ordenamiento no válido: "${campo}"`);
    }
    if (orden !== 'asc' && orden !== 'desc') {
      throw new RangeError(`Orden no válido para "${campo}": "${orden}" (use "asc" o "desc")`);
    }
    return { campo, texto: CAMPOS_TEXTO.has(campo), factor: orden === 'desc' ? -1 : 1 };
  });

  return function comparar(a, b) {
    // Los elementos nulos o indefinidos van al final
    if (a == null || b == null) {
      return (a == null ? 1 : 0) - (b == null ? 1 : 0);
    }
    // Recorre los criterios en orden hasta encontrar uno que desempate
    for (let i = 0; i < reglas.length; i++) {
      const resultado = compararCampo(a, b, reglas[i]);
      if (resultado !== 0) {
        return resultado;
      }
    }
    // Empate en todos los criterios
    return 0;
  };
}

// Comparadores listos para usar: mejor calificadas primero, más recientes primero y orden alfabético
const porCalificacion = crearComparador([
  { campo: 'promedio', orden: 'desc' },
  { campo: 'cantidad', orden: 'desc' },
  { campo: 'anio', orden: 'desc' },
  { campo: 'titulo' },
]);
const porAnio = crearComparador([
  { campo: 'anio', orden: 'desc' },
  { campo: 'promedio', orden: 'desc' },
  { campo: 'titulo' },
]);
const porTitulo = crearComparador([
  { campo: 'titulo' },
  { campo: 'anio', orden: 'desc' },
]);

// Los mismos comparadores por nombre, para usarlos desde el benchmark o la demo
const COMPARADORES = { calificacion: porCalificacion, anio: porAnio, titulo: porTitulo };

module.exports = { crearComparador, porCalificacion, porAnio, porTitulo, COMPARADORES };
