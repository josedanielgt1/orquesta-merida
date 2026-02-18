"use client"

import { useState } from 'react';

export default function CalendarioSemanal({ solicitudes, profesorView = false }) {
  const [semanaOffset, setSemanaOffset] = useState(0);
  
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Generar horas con incrementos de 15 min (solo mostrar horas completas)
  const horasCompletas = Array.from({ length: 11 }, (_, i) => 8 + i);

  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada');

  // Función para obtener clase en un slot específico
  const obtenerClase = (dia, hora, minutos) => {
    const horaActual = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    
    return aprobadas.find(s => {
      if (s.dia !== dia) return false;
      
      // Parsear hora inicio y fin
      const [inicioHora, inicioMin] = s.horaInicio.split(':').map(Number);
      const [finHora, finMin] = s.horaFin.split(':').map(Number);
      
      const inicioMinutos = inicioHora * 60 + inicioMin;
      const finMinutos = finHora * 60 + finMin;
      const actualMinutos = hora * 60 + minutos;
      
      return actualMinutos >= inicioMinutos && actualMinutos < finMinutos;
    });
  };

  // Agrupar clases que ocupan múltiples slots
  const obtenerSpanClase = (dia, hora, minutos) => {
    const clase = obtenerClase(dia, hora, minutos);
    if (!clase) return null;

    const [inicioHora, inicioMin] = clase.horaInicio.split(':').map(Number);
    const [finHora, finMin] = clase.horaFin.split(':').map(Number);
    
    const inicioMinutos = inicioHora * 60 + inicioMin;
    const finMinutos = finHora * 60 + finMin;
    const actualMinutos = hora * 60 + minutos;

    // Si esta es la primera celda de la clase
    if (actualMinutos === inicioMinutos) {
      const duracionMinutos = finMinutos - inicioMinutos;
      const slots = duracionMinutos / 15; // Cada slot es 15 min
      return { clase, rowspan: slots, isFirst: true };
    }

    return { clase, rowspan: 0, isFirst: false };
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        {profesorView ? 'Mi Horario Semanal' : 'Horarios Aprobados'}
      </h2>

      {aprobadas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-gray-500 text-lg">
            {profesorView ? 'No tienes horarios aprobados' : 'No hay horarios aprobados esta semana'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-600">
                <th className="px-4 py-3 text-left font-semibold text-white sticky left-0 bg-blue-600 z-10">
                  Hora
                </th>
                {dias.map(dia => (
                  <th key={dia} className="px-4 py-3 text-center font-semibold text-white min-w-[150px]">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horasCompletas.map(hora => (
                // Por cada hora completa, mostrar 4 filas de 15 min
                [0, 15, 30, 45].map(minutos => {
                  const mostrarHora = minutos === 0;
                  
                  return (
                    <tr key={`${hora}-${minutos}`} className="border-b border-gray-200">
                      <td className={`px-4 py-1 text-sm font-semibold text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-300 ${!mostrarHora && 'text-gray-400'}`}>
                        {mostrarHora ? `${hora}:00` : `${hora}:${minutos}`}
                      </td>
                      {dias.map(dia => {
                        const spanInfo = obtenerSpanClase(dia, hora, minutos);
                        
                        if (!spanInfo) {
                          // Celda vacía
                          return (
                            <td key={dia} className="border-r border-gray-100 bg-green-50">
                              <div className="h-4"></div>
                            </td>
                          );
                        }

                        if (spanInfo.isFirst) {
                          // Primera celda de la clase - mostrar toda la info
                          return (
                            <td 
                              key={dia}
                              rowSpan={spanInfo.rowspan}
                              className="px-3 py-2 bg-blue-100 border border-blue-300 align-top"
                            >
                              <div className="text-xs font-bold text-blue-900 mb-1">
                                {spanInfo.clase.profesorName}
                              </div>
                              <div className="text-xs text-blue-700 mb-1">
                                {spanInfo.clase.horaInicio} - {spanInfo.clase.horaFin}
                              </div>
                              <div className="text-xs text-blue-600 capitalize">
                                {spanInfo.clase.tipoClase}
                              </div>
                              <div className="text-xs text-blue-800 font-semibold mt-1">
                                {spanInfo.clase.espacioAsignado}
                              </div>
                            </td>
                          );
                        }

                        // Celda que ya fue abarcada por rowspan - no renderizar nada
                        return null;
                      })}
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-300 rounded"></div>
          <span className="text-sm text-gray-600">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-sm text-gray-600">Ocupado</span>
        </div>
      </div>
    </div>
  );
}