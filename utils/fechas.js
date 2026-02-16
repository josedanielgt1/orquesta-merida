// Utilidades para manejar fechas y semanas

export function obtenerInicioSemana(fecha = new Date()) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = d.getDate() - dia + (dia === 0 ? -6 : 1); // Ajustar para que lunes sea inicio
  return new Date(d.setDate(diff));
}

export function obtenerFinSemana(fecha = new Date()) {
  const inicio = obtenerInicioSemana(fecha);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6); // Sábado
  return fin;
}

export function formatearFecha(fecha) {
  return fecha.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

export function formatearSemana(fecha) {
  const inicio = obtenerInicioSemana(fecha);
  const fin = obtenerFinSemana(fecha);
  return `${formatearFecha(inicio)} - ${formatearFecha(fin)}`;
}

export function obtenerSemanasDelMes(mes, año) {
  const semanas = [];
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  
  let actual = obtenerInicioSemana(primerDia);
  
  while (actual <= ultimoDia) {
    semanas.push({
      inicio: new Date(actual),
      fin: obtenerFinSemana(actual),
      label: formatearSemana(actual)
    });
    actual.setDate(actual.getDate() + 7);
  }
  
  return semanas;
}

export function obtenerNumeroSemana(fecha) {
  const inicio = obtenerInicioSemana(fecha);
  return `${inicio.getFullYear()}-W${Math.ceil(inicio.getDate() / 7)}`;
}
