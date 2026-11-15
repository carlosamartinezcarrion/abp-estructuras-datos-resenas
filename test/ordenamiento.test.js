const test = require('node:test');
const assert = require('node:assert/strict');
const { ordenarMergeSort } = require('../src/MergeSort');
const { ordenarQuickSort } = require('../src/QuickSort');
const { porCalificacion, porAnio, porTitulo, crearComparador } = require('../src/Comparadores');
const peliculasCatalogo = require('../data/peliculas.json');

const algoritmos = [
  ['MergeSort', ordenarMergeSort],
  ['QuickSort', ordenarQuickSort],
];

for (const [nombre, ordenar] of algoritmos) {
  test(`${nombre}: maneja arreglos vacíos y de un solo elemento`, () => {
    assert.deepEqual(ordenar([]), []);
    assert.deepEqual(ordenar([42]), [42]);
  });

  test(`${nombre}: ordena números positivos, negativos y duplicados`, () => {
    assert.deepEqual(ordenar([5, -2, 5, 0, -10, 3, 0]), [-10, -2, 0, 0, 3, 5, 5]);
  });

  test(`${nombre}: ordena arreglos ya ordenados y en orden inverso`, () => {
    assert.deepEqual(ordenar([1, 2, 3, 4, 5, 6]), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(ordenar([6, 5, 4, 3, 2, 1]), [1, 2, 3, 4, 5, 6]);
  });

  test(`${nombre}: ordena correctamente un lote grande de 500 registros aleatorios`, () => {
    const pelis = Array.from({ length: 500 }, (_, i) => ({
      id: String(i),
      titulo: `Pelicula ${500 - i}`,
      anio: 1980 + (i % 45),
      promedio: Number(((i * 7) % 50) / 10),
      cantidad: (i * 13) % 100,
    }));

    const resultado = ordenar([...pelis], porCalificacion);
    assert.equal(resultado.length, 500);
    for (let i = 1; i < resultado.length; i++) {
      assert.ok(porCalificacion(resultado[i - 1], resultado[i]) <= 0);
    }
  });

  test(`${nombre}: aplica correctamente los tres comparadores (calificación, año y título)`, () => {
    const datos = [
      { id: '1', titulo: 'Matrix', anio: 1999, promedio: 4.8, cantidad: 50 },
      { id: '2', titulo: 'Avatar', anio: 2009, promedio: 4.2, cantidad: 80 },
      { id: '3', titulo: 'Inception', anio: 2010, promedio: 4.8, cantidad: 90 },
    ];

    assert.deepEqual(ordenar([...datos], porCalificacion).map((p) => p.id), ['3', '1', '2']);
    assert.deepEqual(ordenar([...datos], porAnio).map((p) => p.id), ['3', '2', '1']);
    assert.deepEqual(ordenar([...datos], porTitulo).map((p) => p.id), ['2', '3', '1']);
  });
}

test('inmutabilidad: MergeSort devuelve arreglo nuevo y QuickSort ordena in-place', () => {
  const original = [4, 2, 7, 1];
  const resMerge = ordenarMergeSort(original);
  assert.deepEqual(original, [4, 2, 7, 1]);
  assert.deepEqual(resMerge, [1, 2, 4, 7]);

  const copia = [4, 2, 7, 1];
  const resQuick = ordenarQuickSort(copia);
  assert.equal(resQuick, copia);
  assert.deepEqual(copia, [1, 2, 4, 7]);
});

test('estabilidad: MergeSort conserva el orden relativo ante empates totales', () => {
  const empates = [
    { id: 'A', titulo: 'Igual', anio: 2020, promedio: 4, cantidad: 10 },
    { id: 'B', titulo: 'Igual', anio: 2020, promedio: 4, cantidad: 10 },
    { id: 'C', titulo: 'Igual', anio: 2020, promedio: 4, cantidad: 10 },
  ];
  const criterio = crearComparador([{ campo: 'promedio', orden: 'desc' }]);
  assert.deepEqual(ordenarMergeSort(empates, criterio).map((p) => p.id), ['A', 'B', 'C']);
});

test('catálogo real (peliculas.json): MergeSort y QuickSort ordenan exactamente igual por año, título y calificación', () => {
  // 1. Por año (más reciente primero: Parasite 2019 -> The Godfather 1972)
  const mergeAnio = ordenarMergeSort([...peliculasCatalogo], porAnio);
  const quickAnio = ordenarQuickSort([...peliculasCatalogo], porAnio);
  assert.equal(mergeAnio[0].titulo, 'Parasite');
  assert.equal(mergeAnio[mergeAnio.length - 1].titulo, 'The Godfather');
  assert.deepEqual(mergeAnio.map((p) => p.id), quickAnio.map((p) => p.id));

  // 2. Por título alfabético (Avatar -> Titanic)
  const mergeTitulo = ordenarMergeSort([...peliculasCatalogo], porTitulo);
  const quickTitulo = ordenarQuickSort([...peliculasCatalogo], porTitulo);
  assert.equal(mergeTitulo[0].titulo, 'Avatar');
  assert.equal(mergeTitulo[mergeTitulo.length - 1].titulo, 'Titanic');
  assert.deepEqual(mergeTitulo.map((p) => p.id), quickTitulo.map((p) => p.id));

  // 3. Por calificación simulada en memoria sobre clones del catálogo real
  const conNotas = peliculasCatalogo.map((p) => ({ ...p }));
  conNotas[0].promedio = 4.9; // The Godfather
  conNotas[0].cantidad = 100;
  conNotas[5].promedio = 4.9; // Inception (empata en nota, gana por más cantidad)
  conNotas[5].cantidad = 250;
  conNotas[11].promedio = 4.5; // Parasite

  const mergeCalif = ordenarMergeSort([...conNotas], porCalificacion);
  const quickCalif = ordenarQuickSort([...conNotas], porCalificacion);
  assert.deepEqual(mergeCalif.slice(0, 3).map((p) => p.titulo), ['Inception', 'The Godfather', 'Parasite']);
  assert.deepEqual(mergeCalif.map((p) => p.id), quickCalif.map((p) => p.id));
});