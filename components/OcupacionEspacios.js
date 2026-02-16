"use client"

import { useState } from 'react';

export default function OcupacionEspacios({ solicitudes, espacios }) {
  const [diaSeleccionado, setDiaSeleccionado] = useState('Lunes');
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const horas = Array.from({ length: 11 }, (_, i) => `${8 + i}:00`);

  // Filtrar solo aprobadas
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada');

  // Verificar si un espacio está ocupado en cierta hora del día
  const isEspacioOcupado = (espacio, hora) => {
    const horaInt = parseInt(hora.split(':')[0]);
    
    return aprobadas.some(s => {
      if (s.espacioAsignado !== espacio) return false;
      if (s.dia !== diaSeleccionado) return false;
      
      const inicioInt = parseInt(s.horaInicio.split(':')[0]);
      const finInt = parseInt(s.horaFin.split(':')[0]);
      
      return horaInt >= inicioInt && horaInt < finInt;
    });
  };

  // Obtener profesor en espacio/hora
  const getProfesorEnEspacio = (espacio, hora) => {
    const horaInt = parseInt(hora.split(':')[0]);
    
    const solicitud = aprobadas.find(s => {
      if (s.espacioAsignado !== espacio) return false;
      if (s.dia !== diaSeleccionado) return false;
      
      const inicioInt = parseInt(s.horaInicio.split(':')[0]);
      const finInt = parseInt(s.horaFin.split(':')[0]);
      
      return horaInt >= inicioInt && horaInt < finInt;
    });
    
    return solicitud;
  };

  // Calcular porcentaje de ocupación del día
  const calcularOcupacion = () => {
    const totalSlots = espacios.length * horas.length;
    let ocupados = 0;
    
    espacios.forEach(espacio => {
      horas.forEach(hora => {
        if (isEspacioOcupado(espacio, hora)) ocupados++;
      });
    });
    
    return Math.round((ocupados / totalSlots) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Ocupación de Espacios</h2>
        
        {/* Selector de día */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {dias.map(dia => (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(dia)}
              className={`px-4 py-2 rounded font-semibold ${
                diaSeleccionado === dia
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {dia}
            </button>
          ))}
        </div>

        {/* Indicador de ocupación */}
        <div className="bg-gray-100 rounded p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Ocupación del {diaSeleccionado}</p>
          <div className="w-full bg-gray-300 rounded-full h-4">
            <div 
              className="bg-green-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${calcularOcupacion()}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-right font-semibold">
            {calcularOcupacion()}% ocupado
          </p>
        </div>
      </div>

      {/* Tabla de ocupación */}
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header */}
          <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: '100px repeat(11, 1fr)' }}>
            <div className="font-bold text-center p-2 bg-gray-600 rounded text-sm">
              Espacio
            </div>
            {horas.map(hora => (
              <div key={hora} className="font-bold text-center p-2 bg-blue-100 rounded text-xs">
                {hora}
              </div>
            ))}
          </div>

          {/* Filas de espacios */}
          {espacios.slice(0, 10).map(espacio => (
            <div 
              key={espacio} 
              className="grid gap-1 mb-1"
              style={{ gridTemplateColumns: '100px repeat(11, 1fr)' }}
            >
              <div className="font-semibold text-center p-2 bg-gray-50 rounded text-sm">
                {espacio}
              </div>
              
              {horas.map(hora => {
                const ocupado = isEspacioOcupado(espacio, hora);
                const solicitud = getProfesorEnEspacio(espacio, hora);
                
                return (
                  <div
                    key={`${espacio}-${hora}`}
                    className={`p-1 rounded text-xs ${
                      ocupado 
                        ? 'bg-red-100 border border-red-300' 
                        : 'bg-green-100 border border-green-300'
                    }`}
                    title={ocupado ? solicitud?.profesorName : 'Disponible'}
                  >
                    {ocupado ? (
                      <span className="text-red-700 font-semibold">✗</span>
                    ) : (
                      <span className="text-green-700 font-semibold">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          
          {espacios.length > 10 && (
            <p className="text-sm text-gray-500 mt-2">
              Mostrando primeros 10 espacios de {espacios.length}
            </p>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded text-gray-900"></div>
          <span>✓ Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded text-gray-900"></div>
          <span>✗ Ocupado</span>
        </div>
      </div>
    </div>
  );
}