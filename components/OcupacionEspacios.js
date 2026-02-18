"use client"

import { useState } from 'react';

export default function OcupacionEspacios({ solicitudes, espacios }) {
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes');
  const [paginaActual, setPaginaActual] = useState(0);
  const espaciosPorPagina = 12;
  
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const horas = Array.from({ length: 11 }, (_, i) => `${8 + i}:00`);

  // Paginación
  const totalPaginas = Math.ceil(espacios.length / espaciosPorPagina);
  const inicio = paginaActual * espaciosPorPagina;
  const fin = inicio + espaciosPorPagina;
  const espaciosPagina = espacios.slice(inicio, fin);

  const obtenerClaseEnEspacio = (espacio, dia, hora) => {
    const aprobadas = solicitudes.filter(s => s.estado === 'aprobada');
    
    return aprobadas.find(s => {
      if (s.espacioAsignado !== espacio) return false;
      if (s.dia !== dia) return false;
      
      const horaNum = parseInt(hora.split(':')[0]);
      const inicioNum = parseInt(s.horaInicio.split(':')[0]);
      const finNum = parseInt(s.horaFin.split(':')[0]);
      
      return horaNum >= inicioNum && horaNum < finNum;
    });
  };

  const calcularPorcentajeOcupacion = (espacio) => {
    const aprobadas = solicitudes.filter(s => 
      s.estado === 'aprobada' && 
      s.espacioAsignado === espacio
    );
    
    let horasOcupadas = 0;
    const horasDisponibles = horas.length * dias.length; // 11 horas × 6 días = 66 horas
    
    aprobadas.forEach(s => {
      const inicio = parseInt(s.horaInicio.split(':')[0]);
      const fin = parseInt(s.horaFin.split(':')[0]);
      horasOcupadas += (fin - inicio);
    });
    
    return Math.round((horasOcupadas / horasDisponibles) * 100);
  };

  const paginaSiguiente = () => {
    if (paginaActual < totalPaginas - 1) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 0) {
      setPaginaActual(paginaActual - 1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Ocupación de Espacios
      </h2>

      {/* Selector de día */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2 text-gray-900">
          Seleccionar día:
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dias.map(dia => (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(dia)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                diaSeleccionado === dia
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {dia}
            </button>
          ))}
        </div>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={paginaAnterior}
          disabled={paginaActual === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-all"
        >
          ← Anterior
        </button>

        <p className="text-sm text-gray-600 font-semibold">
          Mostrando espacios {inicio + 1} - {Math.min(fin, espacios.length)} de {espacios.length}
        </p>

        <button
          onClick={paginaSiguiente}
          disabled={paginaActual === totalPaginas - 1}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-all"
        >
          Siguiente →
        </button>
      </div>

      {/* Tabla de ocupación */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600">
              <th className="px-4 py-3 text-left font-semibold text-white w-24">
                Hora
              </th>
              {espaciosPagina.map(espacio => {
                const porcentaje = calcularPorcentajeOcupacion(espacio);
                return (
                  <th key={espacio} className="px-2 py-3 text-center">
                    <div className="text-white font-semibold text-sm mb-1">
                      {espacio}
                    </div>
                    <div className="text-xs text-blue-100">
                      {porcentaje}%
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {horas.map((hora, idx) => (
              <tr key={hora} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-3 font-semibold text-gray-900 border-r border-gray-200">
                  {hora}
                </td>
                {espaciosPagina.map(espacio => {
                  const clase = obtenerClaseEnEspacio(espacio, diaSeleccionado, hora);
                  return (
                    <td key={espacio} className="px-2 py-2 text-center border-r border-gray-100">
                      {clase ? (
                        <div 
                          className="bg-red-100 border border-red-300 rounded px-1 py-1 text-xs"
                          title={`${clase.profesorName} - ${clase.horaInicio} a ${clase.horaFin}`}
                        >
                          <p className="font-bold text-red-900 truncate">
                            {clase.profesorName?.split(' ')[0]}
                          </p>
                        </div>
                      ) : (
                        <div className="text-green-600 text-xs">✓</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Indicadores de página */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPaginas }, (_, i) => (
            <button
              key={i}
              onClick={() => setPaginaActual(i)}
              className={`w-8 h-8 rounded-full font-semibold text-sm ${
                paginaActual === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-sm text-gray-600">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-sm text-gray-600">Ocupado</span>
        </div>
      </div>
    </div>
  );
}