// Obtener el lunes de la semana de una fecha
export function obtenerInicioSemana(fecha) {
  const date = new Date(fecha);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Obtener el sábado de la semana
export function obtenerFinSemana(fecha) {
  const inicio = obtenerInicioSemana(fecha);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 5);
  return fin;
}

// Formatear fecha DD/MM/YYYY
export function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const año = d.getFullYear();
  return `${dia}/${mes}/${año}`;
}

// Formatear semana DD/MM/YYYY - DD/MM/YYYY
export function formatearSemana(fecha) {
  const inicio = obtenerInicioSemana(fecha);
  const fin = obtenerFinSemana(fecha);
  return `${formatearFecha(inicio)} - ${formatearFecha(fin)}`;
}

// Obtener ID único de semana "YYYY-MM-DD" (fecha del lunes)
export function obtenerNumeroSemana(fecha) {
  const inicio = obtenerInicioSemana(fecha);
  const año = inicio.getFullYear();
  const mes = (inicio.getMonth() + 1).toString().padStart(2, '0');
  const dia = inicio.getDate().toString().padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

// Obtener todas las semanas entre dos fechas
export function obtenerSemanasenRango(fechaInicio, fechaFin) {
  const semanas = [];
  let actual = obtenerInicioSemana(new Date(fechaInicio));
  const fin = new Date(fechaFin);

  while (actual <= fin) {
    semanas.push({
      semanaId: obtenerNumeroSemana(actual),
      semanaInicio: new Date(actual),
      label: formatearSemana(actual)
    });
    actual.setDate(actual.getDate() + 7);
  }

  return semanas;
}

// Obtener fecha del día específico dentro de una semana
export function obtenerFechaDiaEnSemana(semanaInicio, dia) {
  const dias = {
    'Lunes': 0, 'Martes': 1, 'Miércoles': 2,
    'Jueves': 3, 'Viernes': 4, 'Sábado': 5
  };
  const fecha = new Date(semanaInicio);
  fecha.setDate(fecha.getDate() + (dias[dia] || 0));
  return fecha;
}

// Formatear fecha para input type="date" (YYYY-MM-DD)
export function formatearFechaInput(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  const año = d.getFullYear();
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const dia = d.getDate().toString().padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

// Convertir fecha de input (YYYY-MM-DD) a Date
export function parsearFechaInput(fechaStr) {
  if (!fechaStr) return null;
  const [año, mes, dia] = fechaStr.split('-').map(Number);
  return new Date(año, mes - 1, dia);
}