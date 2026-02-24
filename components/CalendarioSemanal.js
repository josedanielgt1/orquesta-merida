"use client"

import { useState } from 'react';

export default function CalendarioSemanal({ solicitudes, profesorView = false }) {
  const [profesorFiltro, setProfesorFiltro] = useState('todos');
  const [modalClases, setModalClases] = useState(null);

  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  const generarHorarios = () => {
    const horarios = [];
    for (let h = 8; h <= 18; h++) {
      for (let m of [0, 15, 30, 45]) {
        if (h === 18 && m > 0) break;
        horarios.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return horarios;
  };
  
  const horas = generarHorarios();

  // Obtener lista única de profesores
  const profesores = [...new Set(solicitudes.map(s => s.profesorName))].sort();

  // Filtrar solicitudes según profesor seleccionado
  const solicitudesFiltradas = profesorFiltro === 'todos' 
    ? solicitudes.filter(s => s.estado === 'aprobada')
    : solicitudes.filter(s => s.estado === 'aprobada' && s.profesorName === profesorFiltro);

  const obtenerClasesEnHorario = (dia, hora) => {
    return solicitudesFiltradas.filter(s => {
      if (s.dia !== dia) return false;
      
      const [horaNum, minNum] = hora.split(':').map(Number);
      const [inicioHora, inicioMin] = s.horaInicio.split(':').map(Number);
      const [finHora, finMin] = s.horaFin.split(':').map(Number);
      
      const horaActualMinutos = horaNum * 60 + minNum;
      const inicioMinutos = inicioHora * 60 + inicioMin;
      const finMinutos = finHora * 60 + finMin;
      
      return horaActualMinutos >= inicioMinutos && horaActualMinutos < finMinutos;
    });
  };

  const abrirModalClases = (clases) => {
    setModalClases(clases);
  };

  const cerrarModal = () => {
    setModalClases(null);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {profesorView ? 'Mi Calendario' : 'Horarios Aprobados'}
          </h2>

          {/* Filtro de profesor - Solo para vista master */}
          {!profesorView && profesores.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">
                Filtrar por profesor:
              </label>
              <select
                value={profesorFiltro}
                onChange={(e) => setProfesorFiltro(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos ({solicitudesFiltradas.length})</option>
                {profesores.map(profesor => {
                  const count = solicitudes.filter(s => 
                    s.estado === 'aprobada' && s.profesorName === profesor
                  ).length;
                  return (
                    <option key={profesor} value={profesor}>
                      {profesor} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {solicitudesFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-gray-500 font-semibold">
              {profesorFiltro === 'todos' 
                ? 'No hay clases aprobadas para esta semana'
                : `No hay clases aprobadas para ${profesorFiltro} esta semana`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600">
                  <th className="px-4 py-3 text-left font-semibold text-white w-20">
                    Hora
                  </th>
                  {dias.map(dia => (
                    <th key={dia} className="px-4 py-3 text-center font-semibold text-white">
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horas.map((hora, idx) => (
                  <tr key={hora} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 font-semibold text-gray-900 border-r border-gray-200 text-sm">
                      {hora}
                    </td>
                    {dias.map(dia => {
                      const clases = obtenerClasesEnHorario(dia, hora);
                      const primeraClase = clases[0];
                      const clasesAdicionales = clases.length - 1;

                      return (
                        <td key={dia} className="px-2 py-2 border-r border-gray-100 align-top">
                          {primeraClase ? (
                            <div>
                              {/* Primera clase */}
                              <div 
                                className="bg-blue-50 border border-blue-300 rounded-lg p-2 mb-1 cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => clasesAdicionales > 0 && abrirModalClases(clases)}
                              >
                                <p className="font-bold text-blue-900 text-xs truncate">
                                  {primeraClase.profesorName}
                                </p>
                                <p className="text-xs text-blue-700">
                                  {primeraClase.horaInicio} - {primeraClase.horaFin}
                                </p>
                                <p className="text-xs text-blue-600 capitalize">
                                  {primeraClase.tipoClase}
                                </p>
                                {primeraClase.espacioAsignado && (
                                  <p className="text-xs font-semibold text-blue-800 mt-1">
                                    📍 {primeraClase.espacioAsignado}
                                  </p>
                                )}
                              </div>

                              {/* Contador de clases adicionales */}
                              {clasesAdicionales > 0 && (
                                <button
                                  onClick={() => abrirModalClases(clases)}
                                  className="w-full text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded px-2 py-1 font-semibold hover:bg-purple-200 transition-colors"
                                >
                                  + {clasesAdicionales} clase{clasesAdicionales > 1 ? 's' : ''} más
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-gray-300 text-xs py-4">
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Leyenda */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-sm text-gray-600">Clase aprobada</span>
          </div>
          {!profesorView && profesores.length > 1 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
              <span className="text-sm text-gray-600">Múltiples clases (click para ver)</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal para mostrar todas las clases */}
      {modalClases && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
          onClick={cerrarModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                📚 Clases en este horario ({modalClases.length})
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {modalClases.map((clase, idx) => (
                <div 
                  key={clase.id || idx}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg mb-1">
                        {clase.profesorName}
                      </p>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p>
                          <span className="font-semibold">Día:</span> {clase.dia}
                        </p>
                        <p>
                          <span className="font-semibold">Horario:</span>{' '}
                          {clase.horaInicio} - {clase.horaFin}
                        </p>
                        <p>
                          <span className="font-semibold">Tipo:</span>{' '}
                          <span className="capitalize">{clase.tipoClase}</span>
                        </p>
                        {clase.espacioAsignado && (
                          <p>
                            <span className="font-semibold">Espacio:</span>{' '}
                            <span className="text-blue-600 font-bold">
                              {clase.espacioAsignado}
                            </span>
                          </p>
                        )}
                        {clase.observaciones && (
                          <p className="text-xs text-gray-600 italic mt-2">
                            💬 {clase.observaciones}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        ✓ Aprobada
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={cerrarModal}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
