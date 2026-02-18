"use client"

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { 
  obtenerInicioSemana, 
  formatearFecha,
  formatearFechaInput,
  parsearFechaInput,
  obtenerSemanasenRango,
  obtenerNumeroSemana
} from '@/utils/fechas';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';

export default function SolicitudForm({ userId, userName, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [formData, setFormData] = useState({
    dias: [],
    horaInicio: '',
    horaFin: '',
    tipoClase: 'individual',
    observaciones: '',
    fechaInicio: formatearFechaInput(new Date()),
    fechaFin: formatearFechaInput(new Date())
  });

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Horarios con incrementos de 15 minutos
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

  const horarios = generarHorarios();

  const toggleDia = (dia) => {
    if (formData.dias.includes(dia)) {
      setFormData({...formData, dias: formData.dias.filter(d => d !== dia)});
    } else {
      setFormData({...formData, dias: [...formData.dias, dia]});
    }
    setPreview(null);
  };

  const calcularPreview = () => {
    if (formData.dias.length === 0) {
      setError('Selecciona al menos un día');
      return;
    }
    if (!formData.horaInicio || !formData.horaFin) {
      setError('Selecciona hora de inicio y fin');
      return;
    }
    if (formData.horaInicio >= formData.horaFin) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }
    if (!formData.fechaInicio || !formData.fechaFin) {
      setError('Selecciona fecha de inicio y fin');
      return;
    }

    const inicio = parsearFechaInput(formData.fechaInicio);
    const fin = parsearFechaInput(formData.fechaFin);

    if (fin < inicio) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    setError('');
    const semanas = obtenerSemanasenRango(inicio, fin);
    
    const totalSolicitudes = semanas.length * formData.dias.length;
    
    setPreview({
      semanas,
      totalSolicitudes,
      dias: formData.dias,
      horaInicio: formData.horaInicio,
      horaFin: formData.horaFin
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!preview) {
      calcularPreview();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const grupoId = `grupo_${userId}_${Date.now()}`;

      const promesas = [];
      
      for (const semana of preview.semanas) {
        for (const dia of formData.dias) {
          promesas.push(
            addDoc(collection(db, 'requests'), {
              profesorId: userId,
              profesorName: userName,
              dia: dia,
              horaInicio: formData.horaInicio,
              horaFin: formData.horaFin,
              tipoClase: formData.tipoClase,
              observaciones: formData.observaciones,
              estado: 'pendiente',
              espacioAsignado: null,
              fechaSolicitud: serverTimestamp(),
              fechaAprobacion: null,
              notasAdmin: null,
              semanaId: semana.semanaId,
              semanaInicio: semana.semanaInicio,
              grupoId: grupoId,
              grupoFechaInicio: parsearFechaInput(formData.fechaInicio),
              grupoFechaFin: parsearFechaInput(formData.fechaFin),
              grupoDias: formData.dias,
              esSolicitudGrupo: true
            })
          );
        }
      }

      await Promise.all(promesas);

      setModal({
        isOpen: true,
        title: '✅ Solicitud enviada exitosamente',
        message: `Se crearon ${preview.totalSolicitudes} solicitudes para el período del ${formatearFecha(parsearFechaInput(formData.fechaInicio))} al ${formatearFecha(parsearFechaInput(formData.fechaFin))}.\n\nEl administrador las revisará próximamente.`,
        type: 'success'
      });

      // NO resetear aquí - se resetea al cerrar el modal

    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error al enviar solicitud',
        message: 'Ocurrió un error al crear las solicitudes. Por favor intenta de nuevo.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setModal({...modal, isOpen: false});
    
    // Si fue exitoso, resetear el formulario
    if (modal.type === 'success') {
      setFormData({
        dias: [],
        horaInicio: '',
        horaFin: '',
        tipoClase: 'individual',
        observaciones: '',
        fechaInicio: formatearFechaInput(new Date()),
        fechaFin: formatearFechaInput(new Date())
      });
      setPreview(null);
      
      if (onSuccess) {
        onSuccess();
      }
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

        {/* Días de la semana */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-3">
            Días de la semana <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {diasSemana.map(dia => (
              <button
                key={dia}
                type="button"
                onClick={() => toggleDia(dia)}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  formData.dias.includes(dia)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {dia.slice(0, 3)}
              </button>
            ))}
          </div>
          {formData.dias.length > 0 && (
            <p className="text-sm text-blue-600 mt-2">
              ✓ Seleccionados: {formData.dias.join(', ')}
            </p>
          )}
        </div>

        {/* Horario */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Hora de inicio <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.horaInicio}
              onChange={(e) => {
                setFormData({...formData, horaInicio: e.target.value});
                setPreview(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {horarios.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Hora de fin <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.horaFin}
              onChange={(e) => {
                setFormData({...formData, horaFin: e.target.value});
                setPreview(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar</option>
              {horarios.map(hora => (
                <option key={hora} value={hora}>{hora}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rango de fechas */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Desde <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fechaInicio}
              min={formatearFechaInput(new Date())}
              onChange={(e) => {
                setFormData({...formData, fechaInicio: e.target.value});
                setPreview(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Hasta <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fechaFin}
              min={formData.fechaInicio || formatearFechaInput(new Date())}
              onChange={(e) => {
                setFormData({...formData, fechaFin: e.target.value});
                setPreview(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tipo de Clase */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Tipo de clase <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {['individual', 'grupal'].map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => setFormData({...formData, tipoClase: tipo})}
                className={`py-3 rounded-lg text-sm font-semibold border-2 capitalize transition-all ${
                  formData.tipoClase === tipo
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {tipo === 'individual' ? '👤 Individual' : '👥 Grupal'}
              </button>
            ))}
          </div>
        </div>

        {/* Observaciones */}
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-2">
            Observaciones (opcional)
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
            rows="2"
            placeholder="Ej: Necesito piano, preferencia por espacio E12..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Preview de semanas */}
        {preview && (
          <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-lg p-5">
            <h3 className="font-bold text-blue-900 mb-4 text-lg">
              📋 Vista previa - {preview.totalSolicitudes} clases a solicitar:
            </h3>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-semibold">Días:</p>
                  <p className="text-gray-900">{preview.dias.join(', ')}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-semibold">Horario:</p>
                  <p className="text-gray-900">{preview.horaInicio} - {preview.horaFin}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-semibold">Desde:</p>
                  <p className="text-gray-900">{formatearFecha(parsearFechaInput(formData.fechaInicio))}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-semibold">Hasta:</p>
                  <p className="text-gray-900">{formatearFecha(parsearFechaInput(formData.fechaFin))}</p>
                </div>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 mb-4">
              {preview.semanas.map((semana, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-sm font-semibold text-gray-900">
                    📅 Semana {idx + 1}: {semana.label}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {preview.dias.join(', ')} · {preview.horaInicio} - {preview.horaFin}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="bg-green-100 border border-green-300 rounded-lg p-3">
              <p className="text-sm text-green-800 font-semibold">
                ✓ Total: {preview.totalSolicitudes} solicitudes pendientes de aprobación
              </p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="space-y-3">
          {!preview ? (
            <button
              type="button"
              onClick={calcularPreview}
              className="w-full py-3 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-all text-lg"
            >
              👁️ Ver Preview
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 text-lg"
              >
                {loading ? 'Enviando...' : `✅ Confirmar y Enviar ${preview.totalSolicitudes} Solicitudes`}
              </button>
              
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="w-full py-2 text-gray-600 text-sm hover:text-gray-800 font-semibold"
              >
                ← Modificar Solicitud
              </button>
            </>
          )}
        </div>
      </form>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        title={modal.title}
        type={modal.type}
      >
        <p className="whitespace-pre-line">{modal.message}</p>
      </Modal>
    </Card>
  );
}