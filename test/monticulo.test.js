const assert = require('assert');
const { Monticulo } = require('../src/Monticulo');

// Comparador de prueba para ordenar películas de mayor a menor prioridad
// Criterio: 1) Calificación descendente, 2) Cantidad de votos descendente, 3) Año descendente, 4) Título A-Z
const porCalificacion = (a, b) => {
  if (b.calificacion !== a.calificacion) return b.calificacion - a.calificacion;
  if (b.votos !== a.votos) return b.votos - a.votos;
  if (b.anio !== a.anio) return b.anio - a.anio;
  return a.titulo.localeCompare(b.titulo);
};

console.log('Iniciando pruebas unitarias de la estructura Monticulo...\n');

// -------------------------------------------------------------------------
// PRUEBA 1: Operaciones básicas con comparador numérico por defecto (Min-Heap)
// -------------------------------------------------------------------------
{
  const heapNumerico = new Monticulo();
  assert.strictEqual(heapNumerico.estaVacio(), true, 'El montículo debe iniciar vacío');
  assert.strictEqual(heapNumerico.verCima(), null, 'La cima de un montículo vacío debe ser null');

  [42, 15, 8, 99, 23, 4].forEach((num) => heapNumerico.insertar(num));

  assert.strictEqual(heapNumerico.tamano, 6, 'El tamaño debe ser 6 tras insertar 6 elementos');
  assert.strictEqual(heapNumerico.verCima(), 4, 'La cima del Min-Heap debe ser el menor valor (4)');

  const extraidos = [];
  while (!heapNumerico.estaVacio()) {
    extraidos.push(heapNumerico.extraerCima());
  }

  assert.deepStrictEqual(
    extraidos,
    [4, 8, 15, 23, 42, 99],
    'Las extracciones deben salir en orden estrictamente ascendente'
  );
  console.log('✓ Prueba 1 aprobada: Inserción y extracción en Min-Heap numérico.');
}

// -------------------------------------------------------------------------
// PRUEBA 2: Ranking de películas con criterios de desempate (Max-Heap)
// -------------------------------------------------------------------------
{
  const catalogo = [
    { titulo: 'Titanic', calificacion: 4.5, votos: 1200, anio: 1997 },
    { titulo: 'Dune (1984)', calificacion: 4.8, votos: 800, anio: 1984 },
    { titulo: 'Inception', calificacion: 4.9, votos: 3000, anio: 2010 },
    { titulo: 'Dune (2021)', calificacion: 4.8, votos: 800, anio: 2021 },
    { titulo: 'Avatar', calificacion: 4.8, votos: 1500, anio: 2009 },
    { titulo: 'Matrix', calificacion: 3.9, votos: 2500, anio: 1999 },
  ];

  // Construcción en O(n) mediante el algoritmo de Floyd
  const ranking = Monticulo.desdeArreglo(catalogo, porCalificacion);

  // Verifica que el arreglo original no fue mutado
  assert.strictEqual(catalogo[0].titulo, 'Titanic', 'desdeArreglo no debe alterar el arreglo original');

  // Verifica que la cima sea Inception (4.9)
  assert.strictEqual(ranking.verCima().titulo, 'Inception', 'La película #1 debe ser Inception');

  // Extrae todo el ranking y verifica que respete calificación -> votos -> año
  const ordenEsperado = [
    'Inception',   // 4.9
    'Avatar',      // 4.8, 1500 votos
    'Dune (2021)', // 4.8, 800 votos, año 2021
    'Dune (1984)', // 4.8, 800 votos, año 1984
    'Titanic',     // 4.5
    'Matrix',      // 3.9
  ];

  const ordenObtenido = [];
  while (!ranking.estaVacio()) {
    ordenObtenido.push(ranking.extraerCima().titulo);
  }

  assert.deepStrictEqual(
    ordenObtenido,
    ordenEsperado,
    'El montículo debe respetar todos los niveles de desempate'
  );
  console.log('✓ Prueba 2 aprobada: Ranking de películas y desempates en Max-Heap.');
}

// -------------------------------------------------------------------------
// PRUEBA 3: Consulta no destructiva con obtenerTopK(k)
// -------------------------------------------------------------------------
{
  const peliculas = [
    { titulo: 'Peli A', calificacion: 3.0, votos: 10, anio: 2020 },
    { titulo: 'Peli B', calificacion: 5.0, votos: 50, anio: 2022 },
    { titulo: 'Peli C', calificacion: 4.2, votos: 30, anio: 2021 },
    { titulo: 'Peli D', calificacion: 4.7, votos: 40, anio: 2023 },
  ];

  const heap = Monticulo.desdeArreglo(peliculas, porCalificacion);
  const top2 = heap.obtenerTopK(2);

  assert.strictEqual(top2.length, 2, 'obtenerTopK(2) debe retornar exactamente 2 elementos');
  assert.strictEqual(top2[0].titulo, 'Peli B', 'El primer puesto del Top 2 debe ser Peli B');
  assert.strictEqual(top2[1].titulo, 'Peli D', 'El segundo puesto del Top 2 debe ser Peli D');
  assert.strictEqual(heap.tamano, 4, 'obtenerTopK no debe eliminar elementos del montículo original');

  // Caso en que k supera el tamaño disponible
  const top10 = heap.obtenerTopK(10);
  assert.strictEqual(top10.length, 4, 'Si k > tamaño, debe retornar todos los elementos disponibles');

  console.log('✓ Prueba 3 aprobada: Consulta no destructiva obtenerTopK.');
}

// -------------------------------------------------------------------------
// PRUEBA 4: Casos borde y validación de errores
// -------------------------------------------------------------------------
{
  const vacio = new Monticulo();
  assert.strictEqual(vacio.extraerCima(), null, 'Extraer de un montículo vacío debe retornar null');
  assert.deepStrictEqual(vacio.obtenerTopK(5), [], 'obtenerTopK en montículo vacío debe retornar []');

  // Montículo con un solo elemento
  vacio.insertar(100);
  assert.strictEqual(vacio.extraerCima(), 100, 'Debe extraer correctamente el único elemento');
  assert.strictEqual(vacio.estaVacio(), true, 'Debe quedar vacío tras extraer el único elemento');

  // Validación de constructor sin función comparadora
  assert.throws(() => {
    new Monticulo('no-es-funcion');
  }, /comparadora válida/, 'Debe lanzar error si el comparador no es una función');

  console.log('✓ Prueba 4 aprobada: Casos borde (vacío, 1 elemento, errores) manejados correctamente.');
}

console.log('\n Todas las pruebas del Montículo finalizaron con éxito.');