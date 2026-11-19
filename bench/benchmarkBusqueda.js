'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');

const {
    indexarPosiciones,
    leerPorPosicion
} = require('../src/archivos');

// Configuración de las pruebas
const TAMANOS = [1000, 50000, 500000];
const REPETICIONES = 5;
const NUM_CONSULTAS = 20;

// Leer los datos originales del proyecto
const rutaDatos = path.join(__dirname, '../data/peliculas.json');
const peliculasOriginales = JSON.parse(
    fs.readFileSync(rutaDatos, 'utf8')
);

// Generar registros de prueba conservando la estructura original
function generarPeliculas(n) {
    return Array.from({ length: n }, (_, i) => {
        const original = peliculasOriginales[
            i % peliculasOriginales.length
        ];

        return {
            id: i + 1,
            titulo: original.titulo,
            anio: original.anio,
            generos: [...original.generos]
        };
    });
}

// Búsqueda secuencial con contador de comparaciones
function busquedaSecuencial(arr, objetivo) {
    let comparaciones = 0;

    for (let i = 0; i < arr.length; i++) {
        comparaciones++;

        if (arr[i].id === objetivo) {
            return { indice: i, comparaciones };
        }
    }

    return { indice: -1, comparaciones };
}

// Búsqueda binaria con contador de comparaciones
function busquedaBinaria(arr, objetivo) {
    let inicio = 0;
    let fin = arr.length - 1;
    let comparaciones = 0;

    while (inicio <= fin) {
        const medio = Math.floor((inicio + fin) / 2);

        comparaciones++;
        if (arr[medio].id === objetivo) {
            return { indice: medio, comparaciones };
        }

        comparaciones++;
        if (arr[medio].id < objetivo) {
            inicio = medio + 1;
        } else {
            fin = medio - 1;
        }
    }

    return { indice: -1, comparaciones };
}

// Búsqueda secuencial directamente en el archivo
function busquedaSecuencialArchivo(ruta, objetivo) {
    const contenido = fs.readFileSync(ruta, 'utf8');
    const lineas = contenido.split('\n');

    let comparaciones = 0;

    for (let i = 0; i < lineas.length; i++) {
        if (!lineas[i]) continue;

        const registro = JSON.parse(lineas[i]);

        comparaciones++;

        if (registro.id === objetivo) {
            return { indice: i, comparaciones };
        }
    }

    return { indice: -1, comparaciones };
}

// Búsqueda binaria utilizando el índice de posiciones
function busquedaBinariaArchivo(ruta, posiciones, objetivo) {
    let inicio = 0;
    let fin = posiciones.length - 1;
    let comparaciones = 0;

    while (inicio <= fin) {
        const medio = Math.floor((inicio + fin) / 2);

        const registro = leerPorPosicion(ruta, posiciones, medio);

        comparaciones++;
        if (registro.id === objetivo) {
            return { indice: medio, comparaciones };
        }

        comparaciones++;
        if (registro.id < objetivo) {
            inicio = medio + 1;
        } else {
            fin = medio - 1;
        }
    }

    return { indice: -1, comparaciones };
}

// Generar consultas distribuidas por el conjunto de datos
function generarConsultas(n) {
    return Array.from(
        { length: NUM_CONSULTAS },
        (_, i) => Math.floor((i + 1) * n / (NUM_CONSULTAS + 1)) + 1
    );
}

// Medir tiempo promedio, CPU y comparaciones
function medir(nombre, algoritmo, consultas, n, almacenamiento) {
    // Calentamiento
    algoritmo(consultas[0]);

    let tiempoTotal = 0;
    let comparacionesTotal = 0;

    const cpuInicio = process.cpuUsage();

    for (let r = 0; r < REPETICIONES; r++) {
        const inicio = performance.now();

        for (const objetivo of consultas) {
            const resultado = algoritmo(objetivo);

            if (resultado.indice === -1) {
                throw new Error(`No se encontró el ID ${objetivo}`);
            }

            comparacionesTotal += resultado.comparaciones;
        }

        tiempoTotal += performance.now() - inicio;
    }

    const cpu = process.cpuUsage(cpuInicio);

    const totalBusquedas = REPETICIONES * consultas.length;

    return {
        almacenamiento,
        algoritmo: nombre,
        registros: n,
        tiempoPromedioMs: tiempoTotal / totalBusquedas,
        comparacionesPromedio: comparacionesTotal / totalBusquedas,
        cpuMsPorBusqueda:
            (cpu.user + cpu.system) / 1000 / totalBusquedas
    };
}

// Guardar archivo JSONL por bloques
function guardarArchivo(ruta, registros) {
    const fd = fs.openSync(ruta, 'w');

    try {
        const BLOQUE = 5000;

        for (let i = 0; i < registros.length; i += BLOQUE) {
            const texto = registros
                .slice(i, i + BLOQUE)
                .map(registro => JSON.stringify(registro))
                .join('\n') + '\n';

            fs.writeSync(fd, texto);
        }
    } finally {
        fs.closeSync(fd);
    }
}

// Exportar resultados a CSV
const resultados = [];

for (const n of TAMANOS) {
    console.log(`\n===== ${n} REGISTROS =====`);

    // 1. Generar datos en memoria
    const peliculas = generarPeliculas(n);
    const consultas = generarConsultas(n);

    // 2. Preparar archivo
    const ruta = path.join(os.tmpdir(), `peliculas-bench-${process.pid}.jsonl`);

    guardarArchivo(ruta, peliculas);

    // 3. Crear índice antes de medir
    const posiciones = indexarPosiciones(ruta);

    // 4. Ejecutar las cuatro pruebas
    const pruebas = [
        medir(
            'Secuencial',
            id => busquedaSecuencial(peliculas, id),
            consultas, n, 'RAM'
        ),

        medir(
            'Binaria',
            id => busquedaBinaria(peliculas, id),
            consultas, n, 'RAM'
        ),

        medir(
            'Secuencial',
            id => busquedaSecuencialArchivo(ruta, id),
            consultas, n, 'Archivo JSONL'
        ),

        medir(
            'Binaria',
            id => busquedaBinariaArchivo(ruta, posiciones, id),
            consultas, n, 'Archivo indexado'
        )
    ];

    resultados.push(...pruebas);

    console.table(pruebas.map(p => ({
        Almacenamiento: p.almacenamiento,
        Algoritmo: p.algoritmo,
        Registros: p.registros,
        'Tiempo ms/búsqueda': p.tiempoPromedioMs.toFixed(6),
        'Comparaciones': p.comparacionesPromedio.toFixed(2),
        'CPU ms/búsqueda': p.cpuMsPorBusqueda.toFixed(6)
    })));

    fs.unlinkSync(ruta);
}

// Crear CSV con los resultados
const encabezado = [
    'Almacenamiento',
    'Algoritmo',
    'Registros',
    'TiempoPromedio_ms',
    'ComparacionesPromedio',
    'CPU_ms_por_busqueda'
].join(',');

const filas = resultados.map(r => [
    r.almacenamiento,
    r.algoritmo,
    r.registros,
    r.tiempoPromedioMs,
    r.comparacionesPromedio,
    r.cpuMsPorBusqueda
].join(','));

const rutaCSV = path.join(__dirname, 'resultadosBusqueda.csv');

fs.writeFileSync(
    rutaCSV,
    [encabezado, ...filas].join('\n'),
    'utf8'
);

console.log('\nBenchmark finalizado.');
console.log(`Resultados guardados en: ${rutaCSV}`);
