'use strict';
// Demostración para el video: node demo.js
// Las calificaciones son SIMULADAS; TMDB no entrega las de una plataforma propia.
const path = require('path'), os = require('os'), fs = require('fs');
const { Plataforma } = require('./src/plataforma');

const titulo = (t) => console.log(`\n=== ${t} ===`);
const archivo = path.join(os.tmpdir(), 'resenas-demo.jsonl'); try { fs.unlinkSync(archivo); } catch (e) { /* no existía */ }
const p = new Plataforma({ capacidadResenas: 5, archivoResenas: archivo });

titulo('1. Archivo + arreglo: carga del catálogo');
console.log(p.cargarPeliculas(path.join(__dirname, 'data', 'peliculas.json')));

titulo('2. Registrar reseñas (se guardan también en un archivo)');
const usuarios = ['ana', 'luis', 'sofia', 'diego', 'maria', 'pedro'];
for (let id = 1; id <= 12; id++) {
  for (let j = 0; j < 8; j++) p.registrarResena({ peliculaId: id, usuario: usuarios[j % usuarios.length], calificacion: 1 + ((id * 3 + j * 5) % 9) / 2, comentario: `Reseña ${j + 1}`, fecha: `2026-11-0${1 + (j % 5)}` });
}
console.log('Reseña con calificación 7 →', p.registrarResena({ peliculaId: 1, usuario: 'ana', calificacion: 7, fecha: '2026-11-01' }));
console.log('Reseña de película inexistente →', p.registrarResena({ peliculaId: 999, usuario: 'ana', calificacion: 4, fecha: '2026-11-01' }));

titulo('3. Búsqueda secuencial por título ("god")');
console.log(p.buscar('god').map((x) => x.titulo));

titulo('4. Pila: historial de películas consultadas');
p.consultar(1); p.consultar(6); const actual = p.consultar(11);
console.log('Última consultada:', actual.titulo, '| promedio', actual.promedio);
console.log('Volver atrás →', p.volverAtras().titulo);
console.log('Volver atrás →', p.volverAtras().titulo);

titulo('5. Cola circular + lista doble: últimas 5 reseñas de The Matrix');
const lista = p.navegarResenas(11);
console.log('Reseñas guardadas (de 8 recibidas):', lista.longitud);
console.log('Primera  :', lista.irAlInicio().comentario);
console.log('Siguiente:', lista.avanzar().comentario);
console.log('Anterior :', lista.retroceder().comentario);
console.log('Última   :', lista.irAlFinal().comentario);

titulo('6. Archivo: las reseñas se pueden volver a cargar');
const otra = new Plataforma({ capacidadResenas: 5 });
otra.cargarPeliculas(path.join(__dirname, 'data', 'peliculas.json'));
const r = otra.cargarResenas(archivo);
console.log(r.aceptadas, 'reseñas leídas de', r.bytes, 'bytes. Promedio de The Matrix:', otra.consultar(11).promedio, '(antes:', p.consultar(11).promedio + ')');
console.log('Archivo inexistente →', p.cargarPeliculas('no-existe.json').error);
fs.unlinkSync(archivo);
