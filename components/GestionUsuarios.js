"use client"

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';

export default function GestionUsuarios() {
  const [profesores, setProfesores] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    onConfirm: null
  });

  const [nuevoProfesor, setNuevoProfesor] = useState({
    name: '',
    email: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar profesores registrados
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const profesoresData = [];
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.role === 'profesor') {
          profesoresData.push({ 
            id: doc.id, 
            ...data,
            activo: data.activo !== undefined ? data.activo : true // Por defecto activo
          });
        }
      });
      setProfesores(profesoresData);

      // Cargar invitaciones pendientes
      const invitacionesSnapshot = await getDocs(collection(db, 'invitations'));
      const invitacionesData = [];
      invitacionesSnapshot.forEach(doc => {
        invitacionesData.push({ id: doc.id, ...doc.data() });
      });
      setInvitaciones(invitacionesData.filter(inv => !inv.usado));

      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const toggleEstadoProfesor = async (profesorId, estadoActual, nombreProfesor) => {
    const nuevoEstado = !estadoActual;
    const accion = nuevoEstado ? 'activar' : 'inactivar';

    setModal({
      isOpen: true,
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} profesor?`,
      message: `¿Estás seguro de ${accion} a ${nombreProfesor}?\n\n${
        nuevoEstado 
          ? 'Podrá iniciar sesión y crear solicitudes nuevamente.' 
          : 'No podrá iniciar sesión ni crear solicitudes hasta que sea reactivado.'
      }`,
      type: 'confirm',
      showCancel: true,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', profesorId), {
            activo: nuevoEstado
          });

          setModal({
            isOpen: true,
            title: nuevoEstado ? '✅ Profesor activado' : '⚠️ Profesor inactivado',
            message: `${nombreProfesor} ha sido ${nuevoEstado ? 'activado' : 'inactivado'} correctamente.`,
            type: nuevoEstado ? 'success' : 'warning',
            showCancel: false,
            onConfirm: null
          });

          cargarDatos();
        } catch (err) {
          console.error('Error:', err);
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'No se pudo cambiar el estado del profesor.',
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        }
      }
    });
  };

  const enviarInvitacion = async (e) => {
    e.preventDefault();

    if (!nuevoProfesor.name || !nuevoProfesor.email) {
      setModal({
        isOpen: true,
        title: 'Campos requeridos',
        message: 'Por favor completa todos los campos.',
        type: 'warning',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevoProfesor.email)) {
      setModal({
        isOpen: true,
        title: 'Email inválido',
        message: 'Por favor ingresa un email válido.',
        type: 'warning',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    const yaExiste = profesores.some(p => p.email === nuevoProfesor.email);
    if (yaExiste) {
      setModal({
        isOpen: true,
        title: 'Email ya registrado',
        message: 'Ya existe un profesor con este email.',
        type: 'warning',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    const invitacionPendiente = invitaciones.some(inv => inv.email === nuevoProfesor.email);
    if (invitacionPendiente) {
      setModal({
        isOpen: true,
        title: 'Invitación pendiente',
        message: 'Ya existe una invitación pendiente para este email.',
        type: 'warning',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    setLoading(true);

    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const expira = new Date();
      expira.setHours(expira.getHours() + 48);

      await addDoc(collection(db, 'invitations'), {
        email: nuevoProfesor.email,
        name: nuevoProfesor.name,
        token: token,
        usado: false,
        fechaCreacion: serverTimestamp(),
        expira: expira
      });

      const enlaceRegistro = `${window.location.origin}/registro/${token}`;
      
      const htmlEmail = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎼 Orquesta Sinfónica</h1>
            <p style="color: #f0f0f0; margin: 5px 0 0 0;">de Mérida</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #667eea; margin-top: 0;">Invitación al Sistema</h2>
            
            <p>Hola <strong>${nuevoProfesor.name}</strong>,</p>
            
            <p>Has sido invitado a unirte al sistema de gestión de espacios de la <strong>Orquesta Sinfónica de Mérida</strong>.</p>
            
            <p>Para completar tu registro y crear tu contraseña, haz click en el siguiente botón:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${enlaceRegistro}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Completar Registro
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">O copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 12px; background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
              ${enlaceRegistro}
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                ⚠️ <strong>Importante:</strong> Este enlace expira en 48 horas.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              Orquesta Sinfónica de Mérida<br>
              Sistema de Gestión de Espacios
            </p>
          </div>
        </body>
        </html>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: nuevoProfesor.email,
          subject: '🎼 Invitación - Orquesta Sinfónica de Mérida',
          html: htmlEmail
        })
      });

      const result = await response.json();

      if (result.success) {
        setModal({
          isOpen: true,
          title: '✅ Invitación enviada',
          message: `Se ha enviado una invitación a ${nuevoProfesor.email}.\n\nEl profesor recibirá un email con un enlace para completar su registro.`,
          type: 'success',
          showCancel: false,
          onConfirm: null
        });

        setNuevoProfesor({ name: '', email: '' });
        setShowForm(false);
        cargarDatos();
      } else {
        throw new Error(result.error);
      }

    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error al enviar invitación',
        message: 'No se pudo enviar la invitación. Verifica la configuración de email.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelarInvitacion = async (invitacionId) => {
    setModal({
      isOpen: true,
      title: '¿Cancelar invitación?',
      message: '¿Estás seguro de cancelar esta invitación?',
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'invitations', invitacionId));
          setModal({
            isOpen: true,
            title: 'Invitación cancelada',
            message: 'La invitación ha sido eliminada.',
            type: 'info',
            showCancel: false,
            onConfirm: null
          });
          cargarDatos();
        } catch (err) {
          console.error('Error:', err);
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'No se pudo cancelar la invitación.',
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        }
      }
    });
  };

  return (
    <>
      <Card title="Gestión de Profesores">
        {/* Botón invitar */}
        <div className="mb-6">
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '+ Invitar Nuevo Profesor'}
          </Button>
        </div>

        {/* Formulario de invitación */}
        {showForm && (
          <form onSubmit={enviarInvitacion} className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Enviar Invitación</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nuevoProfesor.name}
                  onChange={(e) => setNuevoProfesor({...nuevoProfesor, name: e.target.value})}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={nuevoProfesor.email}
                  onChange={(e) => setNuevoProfesor({...nuevoProfesor, email: e.target.value})}
                  placeholder="Ej: profesor@gmail.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  ℹ️ El profesor recibirá un email con un enlace para crear su contraseña.
                </p>
              </div>

              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Enviando...' : '📧 Enviar Invitación'}
              </Button>
            </div>
          </form>
        )}

        {/* Invitaciones pendientes */}
        {invitaciones.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Invitaciones Pendientes ({invitaciones.length})
            </h3>
            <div className="space-y-2">
              {invitaciones.map(inv => (
                <div key={inv.id} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div>
                    <p className="font-semibold text-gray-900">{inv.name}</p>
                    <p className="text-sm text-gray-600">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      Enviada: {inv.fechaCreacion?.toDate?.().toLocaleDateString() || 'Reciente'}
                    </p>
                  </div>
                  <button
                    onClick={() => cancelarInvitacion(inv.id)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de profesores */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Profesores Registrados ({profesores.length})
          </h3>
          
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : profesores.length === 0 ? (
            <p className="text-gray-500">No hay profesores registrados aún.</p>
          ) : (
            <div className="space-y-2">
              {profesores.map(profesor => {
                const estaActivo = profesor.activo !== false;
                
                return (
                  <div 
                    key={profesor.id} 
                    className={`flex items-center justify-between rounded-lg p-4 border-2 ${
                      estaActivo 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`font-semibold ${estaActivo ? 'text-gray-900' : 'text-gray-500'}`}>
                        {profesor.name}
                      </p>
                      <p className={`text-sm ${estaActivo ? 'text-gray-600' : 'text-gray-400'}`}>
                        {profesor.email}
                      </p>
                      {profesor.fechaCreacion && (
                        <p className="text-xs text-gray-500">
                          Registrado: {profesor.fechaCreacion.toDate?.().toLocaleDateString() || 'N/A'}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        estaActivo 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {estaActivo ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                      
                      <button
                        onClick={() => toggleEstadoProfesor(profesor.id, estaActivo, profesor.name)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          estaActivo
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {estaActivo ? 'Inactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({...modal, isOpen: false})}
        title={modal.title}
        type={modal.type}
        showCancel={modal.showCancel}
        onConfirm={modal.onConfirm}
      >
        <p className="whitespace-pre-line">{modal.message}</p>
      </Modal>
    </>
  );
}