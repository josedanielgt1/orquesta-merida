"use client"

import { useState } from 'react';
import { obtenerInicioSemana, formatearSemana, obtenerNumeroSemana } from '@/utils/fechas';
import Button from './ui/Button';
import Modal from './ui/Modal';

// Función helper para convertir horas a minutos
const convertirAMinutos = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
};

export default function BuscadorEspacios({ solicitudes, espacios }) {
  const [filtros, setFiltros] = useState({
    semanaIndex: 0,
    dia: '',
    horaInicio: '',
    horaFin: ''
  });
  
  const [resultados, setResultados] = useState([]);
  const [buscado, setBuscado] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const horas = Array.from({ length: 11 }, (_, i) => `${8 + i}:00`);

  const getSemanaFecha = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + (7 * filtros.semanaIndex));
    return obtenerInicioSemana(fecha);
  };

  const buscarEspaciosDisponibles = () => {
    if (!filtros.dia || !filtros.horaInicio || !filtros.horaFin) {
      setModal({
        isOpen: true,
        title: 'Campos incompletos',
        message: 'Debes seleccionar día, hora de inicio y hora de fin.',
        type: 'warning'
      });
      return;
    }

    // Convertir a minutos para comparar correctamente
    const inicioMinutos = convertirAMinutos(filtros.horaInicio);
    const finMinutos = convertirAMinutos(filtros.horaFin);

    if (inicioMinutos >= finMinutos) {
      setModal({
        isOpen: true,
        title: 'Horario inválido',
        message: 'La hora de fin debe ser posterior a la hora de inicio.',
        type: 'warning'
      });
      return;
    }

    const semanaFecha = getSemanaFecha();
    const semanaId = obtenerNumeroSemana(semanaFecha);
    
    // Filtrar solicitudes aprobadas de la semana y día seleccionados
    const aprobadas = solicitudes.filter(s => 
      s.estado === 'aprobada' && 
      s.semanaId === semanaId &&
      s.dia === filtros.dia
    );
    
    const espaciosDisponibles = espacios.filter(espacio => {
      // Verificar si el espacio tiene conflicto
      const tieneConflicto = aprobadas.some(s => {
        // Solo revisar si es el mismo espacio
        if (s.espacioAsignado !== espacio) return false;
        
        // Convertir horarios de la solicitud a minutos
        const sInicioMin = convertirAMinutos(s.horaInicio);
        const sFinMin = convertirAMinutos(s.horaFin);
        
        // Verificar solapamiento
        // Hay conflicto si:
        // - El inicio de la búsqueda está dentro de una clase existente
        // - El fin de la búsqueda está dentro de una clase existente
        // - La búsqueda abarca completamente una clase existente
        const hayConflicto = (
          (inicioMinutos >= sInicioMin && inicioMinutos < sFinMin) ||
          (finMinutos > sInicioMin && finMinutos <= sFinMin) ||
          (inicioMinutos <= sInicioMin && finMinutos >= sFinMin)
        );
        
        return hayConflicto;
      });
      
      // El espacio está disponible si NO tiene conflicto
      return !tieneConflicto;
    });

    setResultados(espaciosDisponibles);
    setBuscado(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Buscar Espacios Disponibles</h2>
        
        {/* Formulario de búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {/* Semana */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Semana</label>
            <select
              value={filtros.semanaIndex}
              onChange={(e) => setFiltros({...filtros, semanaIndex: parseInt(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Esta semana</option>
              <option value={1}>En 1 semana</option>
              <option value={2}>En 2 semanas</option>
              <option value={3}>En 3 semanas</option>
              <option value={4}>En 4 semanas</option>
              <option value={5}>En 5 semanas</option>
              <option value={6}>En 6 semanas</option>
              <option value={7}>En 7 semanas</option>
              <option value={8}>En 8 semanas</option>
            </select>
          </div>

          {/* Día */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Día</label>
            <select
              value={filtros.dia}
              onChange={(e) => setFiltros({...filtros, dia: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {dias.map(dia => (
                <option key={dia} value={dia}>{dia}</option>
              ))}
            </select>
          </div>

          {/* Hora Inicio */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Hora Inicio</label>
            <select
              value={filtros.horaInicio}
              onChange={(e) => setFiltros({...filtros, horaInicio: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {horas.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>

          {/* Hora Fin */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Hora Fin</label>
            <select
              value={filtros.horaFin}
              onChange={(e) => setFiltros({...filtros, horaFin: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {horas.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>

          {/* Botón */}
          <div className="flex items-end">
            <Button variant="primary" onClick={buscarEspaciosDisponibles}>
              🔍 Buscar
            </Button>
          </div>
        </div>

        {/* Resultados */}
        {buscado && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Resultados: {resultados.length} espacios disponibles
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Para {filtros.dia} de {filtros.horaInicio} a {filtros.horaFin} 
              ({formatearSemana(getSemanaFecha())})
            </p>
            
            {resultados.length === 0 ? (
              <p className="text-gray-500">
                No hay espacios disponibles para esta búsqueda
              </p>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {resultados.map(espacio => (
                  <div
                    key={espacio}
                    className="bg-green-100 border border-green-300 rounded p-3 text-center font-semibold text-green-800"
                  >
                    {espacio}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({...modal, isOpen: false})}
        title={modal.title}
        type={modal.type}
      >
        <p>{modal.message}</p>
      </Modal>
    </>
  );
}