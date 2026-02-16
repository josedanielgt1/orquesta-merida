"use client"

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { obtenerInicioSemana, formatearFecha, formatearSemana, obtenerNumeroSemana } from '@/utils/fechas';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';

export default function SolicitudForm({ userId, userName, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    dia: '',
    horaInicio: '',
    horaFin: '',
    tipoClase: 'individual',
    observaciones: '',
    semanaInicio: obtenerInicioSemana(new Date())
  });

  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  const horarios = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validar que hora fin sea mayor que hora inicio
      if (formData.horaInicio >= formData.horaFin) {
        setError('La hora de fin debe ser posterior a la hora de inicio');
        setLoading(false);
        return;
      }

      // Crear solicitud en Firestore
      await addDoc(collection(db, 'requests'), {
        profesorId: userId,
        profesorName: userName,
        dia: formData.dia,
        horaInicio: formData.horaInicio,
        horaFin: formData.horaFin,
        tipoClase: formData.tipoClase,
        observaciones: formData.observaciones,
        estado: 'pendiente',
        espacioAsignado: null,
        fechaSolicitud: serverTimestamp(),
        fechaAprobacion: null,
        notasAdmin: null,
        semanaInicio: formData.semanaInicio,
        semanaId: obtenerNumeroSemana(formData.semanaInicio)
      });

      // Limpiar formulario
      setFormData({
        dia: '',
        horaInicio: '',
        horaFin: '',
        tipoClase: 'individual',
        observaciones: '',
        semanaInicio: obtenerInicioSemana(new Date())
      });

      alert('¡Solicitud creada exitosamente!');
      
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('Error:', err);
      setError('Error al crear la solicitud: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Nueva Solicitud de Horario">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Semana */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            ¿Para qué semana? <span className="text-red-500">*</span>
          </label>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {/* Semana actual */}
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                semanaInicio: obtenerInicioSemana(new Date())
              })}
              className={`w-full p-3 rounded-lg text-left border-2 transition-all ${
                formatearFecha(formData.semanaInicio) === formatearFecha(obtenerInicioSemana(new Date()))
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="font-semibold">📅 Esta semana</div>
              <div className={`text-sm ${
                formatearFecha(formData.semanaInicio) === formatearFecha(obtenerInicioSemana(new Date()))
                  ? 'text-blue-100'
                  : 'text-gray-600'
              }`}>
                {formatearSemana(obtenerInicioSemana(new Date()))}
              </div>
            </button>

            {/* Próximas 8 semanas */}
            {Array.from({ length: 8 }, (_, i) => {
              const fecha = new Date();
              fecha.setDate(fecha.getDate() + (7 * (i + 1)));
              const inicio = obtenerInicioSemana(fecha);
              const esSeleccionada = formatearFecha(formData.semanaInicio) === formatearFecha(inicio);
              
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    semanaInicio: inicio
                  })}
                  className={`w-full p-3 rounded-lg text-left border-2 transition-all ${
                    esSeleccionada
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <div className="font-semibold">
                    🗓️ En {i + 1} semana{i > 0 ? 's' : ''}
                  </div>
                  <div className={`text-sm ${
                    esSeleccionada ? 'text-blue-100' : 'text-gray-600'
                  }`}>
                    {formatearSemana(inicio)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Día */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Día de la semana <span className="text-red-500">*</span>
          </label>
          <select
            name="dia"
            value={formData.dia}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="">Seleccione un día</option>
            {dias.map(dia => (
              <option key={dia} value={dia}>{dia}</option>
            ))}
          </select>
        </div>

        {/* Hora Inicio */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Hora de inicio <span className="text-red-500">*</span>
          </label>
          <select
            name="horaInicio"
            value={formData.horaInicio}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="">Seleccione hora</option>
            {horarios.map(hora => (
              <option key={hora} value={hora}>{hora}</option>
            ))}
          </select>
        </div>

        {/* Hora Fin */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Hora de fin <span className="text-red-500">*</span>
          </label>
          <select
            name="horaFin"
            value={formData.horaFin}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="">Seleccione hora</option>
            {horarios.map(hora => (
              <option key={hora} value={hora}>{hora}</option>
            ))}
          </select>
        </div>

        {/* Tipo de Clase */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Tipo de clase <span className="text-red-500">*</span>
          </label>
          <select
            name="tipoClase"
            value={formData.tipoClase}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            <option value="individual">Individual</option>
            <option value="grupal">Grupal</option>
          </select>
        </div>

        {/* Observaciones */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Observaciones (opcional)
          </label>
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            rows="3"
            placeholder="Ej: Necesito piano, preferencia por espacio E12..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </div>

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar Solicitud'}
        </Button>
      </form>
    </Card>
  );
}