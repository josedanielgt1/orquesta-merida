"use client"

export default function EstadisticasTorta({ solicitudes }) {
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada').length;
  const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length;
  const total = solicitudes.length;

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">
          📊 Estadísticas
        </h2>
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500">No hay solicitudes para mostrar</p>
        </div>
      </div>
    );
  }

  const porcentajePendientes = ((pendientes / total) * 100).toFixed(1);
  const porcentajeAprobadas = ((aprobadas / total) * 100).toFixed(1);
  const porcentajeRechazadas = ((rechazadas / total) * 100).toFixed(1);

  // Calcular ángulos para el gráfico de torta SVG
  const calcularAngulo = (porcentaje) => (porcentaje / 100) * 360;
  
  const anguloAprobadas = calcularAngulo(porcentajeAprobadas);
  const anguloPendientes = anguloAprobadas + calcularAngulo(porcentajePendientes);

  const crearPath = (startAngle, endAngle) => {
    const start = polarToCartesian(50, 50, 40, endAngle);
    const end = polarToCartesian(50, 50, 40, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', 50, 50,
      'L', start.x, start.y,
      'A', 40, 40, 0, largeArc, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        📊 Estadísticas Generales
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gráfico de torta */}
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-64 h-64">
            {/* Aprobadas (verde) */}
            {aprobadas > 0 && (
              <path
                d={crearPath(0, anguloAprobadas)}
                fill="#10b981"
                stroke="white"
                strokeWidth="0.5"
              />
            )}
            
            {/* Pendientes (amarillo) */}
            {pendientes > 0 && (
              <path
                d={crearPath(anguloAprobadas, anguloPendientes)}
                fill="#f59e0b"
                stroke="white"
                strokeWidth="0.5"
              />
            )}
            
            {/* Rechazadas (rojo) */}
            {rechazadas > 0 && (
              <path
                d={crearPath(anguloPendientes, 360)}
                fill="#ef4444"
                stroke="white"
                strokeWidth="0.5"
              />
            )}

            {/* Centro blanco */}
            <circle cx="50" cy="50" r="25" fill="white" />
            
            {/* Total en el centro */}
            <text
              x="50"
              y="48"
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
              fontWeight="600"
            >
              Total
            </text>
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fontSize="16"
              fill="#111827"
              fontWeight="bold"
            >
              {total}
            </text>
          </svg>
        </div>

        {/* Leyenda y detalles */}
        <div className="flex flex-col justify-center space-y-4">
          {/* Aprobadas */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="font-semibold text-gray-900">Aprobadas</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{aprobadas}</p>
              <p className="text-xs text-green-700">{porcentajeAprobadas}%</p>
            </div>
          </div>

          {/* Pendientes */}
          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="font-semibold text-gray-900">Pendientes</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-600">{pendientes}</p>
              <p className="text-xs text-yellow-700">{porcentajePendientes}%</p>
            </div>
          </div>

          {/* Rechazadas */}
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="font-semibold text-gray-900">Rechazadas</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">{rechazadas}</p>
              <p className="text-xs text-red-700">{porcentajeRechazadas}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}