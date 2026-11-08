'use strict';
const { Pila } = require('./pila');
const { ColaCircular } = require('./colaCircular');
const { ListaDoble } = require('./listaDoble');
const { busquedaSecuencial, buscarPorTitulo } = require('./busqueda');
const { leerJSON, agregarJSONL, cargarJSONL } = require('./archivos');

const CALIFICACION_MIN = 0.5, CALIFICACION_MAX = 5.0;

// Plataforma de reseñas de películas. Estructuras de la Unidad 1:
//  - arreglo de registros: catálogo de películas (búsqueda secuencial)
//  - cola circular (arreglo de tamaño fijo): últimas N reseñas de cada película
//  - lista doblemente enlazada: navegar esas reseñas hacia adelante y hacia atrás
//  - pila: historial de películas consultadas (volver atrás)
//  - archivos: carga de películas (JSON) y registro de reseñas (JSON Lines)
class Plataforma {
  constructor({ capacidadResenas = 20, archivoResenas = null } = {}) {
    this.capacidadResenas = capacidadResenas;
    this.archivoResenas = archivoResenas;
    this.peliculas = [];
    this.historial = new Pila();
  }

  _pelicula(id) {
    const i = busquedaSecuencial(this.peliculas, (p) => p.id === String(id));
    return i === -1 ? undefined : this.peliculas[i];
  }

  // Carga las películas desde un archivo JSON.
  cargarPeliculas(ruta) {
    const { datos, error } = leerJSON(ruta);
    if (error) return { cargadas: 0, rechazadas: 0, error };
    if (!Array.isArray(datos)) return { cargadas: 0, rechazadas: 0, error: `El archivo "${ruta}" debe contener un arreglo de películas.` };
    let cargadas = 0, rechazadas = 0;
    for (const raw of datos) { if (this.agregarPelicula(raw)) cargadas++; else rechazadas++; }
    return { cargadas, rechazadas };
  }

  // Rechaza título vacío o identificador repetido.
  agregarPelicula(raw) {
    const titulo = raw && typeof raw.titulo === 'string' ? raw.titulo.trim() : '';
    if (raw == null || raw.id == null || titulo === '' || this._pelicula(raw.id)) return false;
    this.peliculas.push({
      id: String(raw.id), titulo,
      anio: Number.isFinite(raw.anio) ? raw.anio : null,
      generos: Array.isArray(raw.generos) ? raw.generos.map(String) : [],
      suma: 0, cantidad: 0, promedio: 0,
      recientes: new ColaCircular(this.capacidadResenas),
    });
    return true;
  }

  // Valida la reseña, actualiza el promedio, la guarda entre las últimas N y la anota en el archivo.
  registrarResena(resena) {
    const { peliculaId, usuario, calificacion, comentario = '', fecha } = resena || {};
    const p = peliculaId != null ? this._pelicula(peliculaId) : undefined;
    const valida = p && usuario != null && String(usuario) !== ''
      && typeof calificacion === 'number' && Number.isFinite(calificacion)
      && calificacion >= CALIFICACION_MIN && calificacion <= CALIFICACION_MAX
      && fecha != null && !Number.isNaN(new Date(fecha).getTime());
    if (!valida) return false;
    p.suma += calificacion; p.cantidad++; p.promedio = p.suma / p.cantidad;
    const registro = { usuario: String(usuario), calificacion, comentario, fecha };
    p.recientes.encolar(registro);
    if (this.archivoResenas) agregarJSONL(this.archivoResenas, { peliculaId: p.id, ...registro });
    return true;
  }

  // Vuelve a registrar las reseñas guardadas en el archivo (lectura secuencial).
  cargarResenas(ruta) {
    const guardado = this.archivoResenas; this.archivoResenas = null; // no reescribir lo que se está leyendo
    const r = cargarJSONL(ruta);
    let aceptadas = 0, rechazadas = r.errores || 0;
    for (const x of r.registros) { if (this.registrarResena(x)) aceptadas++; else rechazadas++; }
    this.archivoResenas = guardado;
    return { aceptadas, rechazadas, bytes: r.bytes, ms: r.ms, error: r.error };
  }

  buscar(texto, k = 10) { return buscarPorTitulo(this.peliculas, texto, k); }

  _detalle(p) {
    return {
      existe: true, id: p.id, titulo: p.titulo, anio: p.anio, generos: p.generos,
      promedio: Math.round(p.promedio * 100) / 100, cantidad: p.cantidad,
      ultimasResenas: p.recientes.aArreglo(),
    };
  }

  // Consulta una película y la apila en el historial.
  consultar(id) {
    const p = this._pelicula(id);
    if (!p) return { existe: false };
    this.historial.push(p.id);
    return this._detalle(p);
  }

  // Desapila la película actual y muestra la anterior.
  volverAtras() {
    if (this.historial.tamano < 2) return { existe: false };
    this.historial.pop();
    return this._detalle(this._pelicula(this.historial.cima()));
  }

  // Últimas reseñas en una lista doble, de la más antigua a la más reciente.
  navegarResenas(id) {
    const p = this._pelicula(id);
    if (!p) return null;
    const lista = new ListaDoble();
    for (const r of p.recientes.aArreglo()) lista.insertar(r);
    return lista;
  }
}
module.exports = { Plataforma };
