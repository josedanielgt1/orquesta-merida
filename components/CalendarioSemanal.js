"use client"

export default function CalendarioSemanal({ solicitudes, profesorView = false }) {
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const horas = Array.from({ length: 11 }, (_, i) => `${8 + i}:00`);

  // Organizar solicitudes por día y hora
  const getSolicitudesEnSlot = (dia, hora) => {
    return solicitudes.filter(s => {
      if (s.estado !== 'aprobada') return false;
      if (s.dia !== dia) return false;
      
      const horaInt = parseInt(hora.split(':')[0]);
      const inicioInt = parseInt(s.horaInicio.split(':')[0]);
      const finInt = parseInt(s.horaFin.split(':')[0]);
      
      return horaInt >= inicioInt && horaInt < finInt;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        {profesorView ? 'Mi Horario Semanal' : 'Horarios Aprobados'}
      </h2>
      
      <div className="min-w-[800px]">
        {/* Header con días */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          <div className="font-bold text-center p-2 bg-gray-100 rounded text-blue-900">Hora</div>
          {dias.map(dia => (
            <div key={dia} className="font-bold text-center p-2 bg-blue-100 rounded text-gray-900">
              {dia}
            </div>
          ))}
        </div>

        {/* Filas de horas */}
        {horas.map(hora => (
          <div key={hora} className="grid grid-cols-7 gap-2 mb-2">
            {/* Columna de hora */}
            <div className="text-sm font-semibold text-gray-600 p-2 bg-gray-50 rounded text-center">
              {hora}
            </div>

            {/* Columnas de días */}
            {dias.map(dia => {
              const solicitudesEnSlot = getSolicitudesEnSlot(dia, hora);
              
              return (
                <div 
                  key={`${dia}-${hora}`}
                  className={`p-2 rounded min-h-[60px] border ${
                    solicitudesEnSlot.length > 0 
                      ? 'bg-green-100 border-green-300' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {solicitudesEnSlot.map((solicitud, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="font-semibold text-green-800">
                        {solicitud.espacioAsignado}
                      </p>
                      {!profesorView && (
                        <p className="text-gray-600 truncate">
                          {solicitud.profesorName}
                        </p>
                      )}
                      <p className="text-gray-500 capitalize">
                        {solicitud.tipoClase}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
          <span>Disponible</span>
        </div>
      </div>
    </div>
  );
}