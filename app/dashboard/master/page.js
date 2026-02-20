"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/app/firebase';
import { obtenerInicioSemana, obtenerNumeroSemana, formatearSemana } from '@/utils/fechas';
import { generarPDFHorarios } from '@/utils/pdfGenerator';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import OcupacionEspacios from '@/components/OcupacionEspacios';
import CalendarioSemanal from '@/components/CalendarioSemanal';
import BuscadorEspacios from '@/components/BuscadorEspacios';
import SelectorSemana from '@/components/SelectorSemana';
import GestionSemanas from '@/components/GestionSemanas';
import NavBar from '@/components/NavBar';
import { emailSolicitudAprobada, emailSolicitudRechazada } from '@/utils/emailTemplates';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useLogoutOnClose } from '@/hooks/useLogoutOnClose';

export default function MasterDashboard() {
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActual, setSemanaActual] = useState(obtenerInicioSemana(new Date()));
  const [rechazarData, setRechazarData] = useState(null);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  useSessionTimeout(30); 
  useLogoutOnClose();
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'master') {
      router.push('/dashboard/profesor');
      return;
    }

    setUser(parsedUser);

    // Generar lista de espacios
    const espaciosList = [];
    for (let i = 1; i <= 46; i++) {
      if ([35, 37, 38, 39, 40].includes(i)) continue;
      espaciosList.push(`E${i}`);
    }
    espaciosList.push('E11A', 'E25A', 'E25B', 'E25C');
    espaciosList.sort();
    setEspacios(espaciosList);

    // Escuchar TODAS las solicitudes
    const unsubscribe = onSnapshot(
      collection(db, 'requests'),
      (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setSolicitudes(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  const aprobarSolicitud = async (solicitud, espacio) => {
    if (!espacio) {
      setModal({
        isOpen: true,
        title: 'Espacio requerido',
        message: 'Debes seleccionar un espacio antes de aprobar la solicitud.',
        type: 'warning'
      });
      return;
    }

    // Verificar conflicto
    const aprobadas = solicitudes.filter(s =>
      s.estado === 'aprobada' &&
      s.semanaId === solicitud.semanaId
    );

    const hayConflicto = aprobadas.some(s => {
      if (s.espacioAsignado !== espacio) return false;
      if (s.dia !== solicitud.dia) return false;
      return (
        (solicitud.horaInicio >= s.horaInicio && solicitud.horaInicio < s.horaFin) ||
        (solicitud.horaFin > s.horaInicio && solicitud.horaFin <= s.horaFin) ||
        (solicitud.horaInicio <= s.horaInicio && solicitud.horaFin >= s.horaFin)
      );
    });

    if (hayConflicto) {
      const conflicto = aprobadas.find(s =>
        s.espacioAsignado === espacio &&
        s.dia === solicitud.dia &&
        (
          (solicitud.horaInicio >= s.horaInicio && solicitud.horaInicio < s.horaFin) ||
          (solicitud.horaFin > s.horaInicio && solicitud.horaFin <= s.horaFin) ||
          (solicitud.horaInicio <= s.horaInicio && solicitud.horaFin >= s.horaFin)
        )
      );
      
      setModal({
        isOpen: true,
        title: '⚠️ Conflicto de horario',
        message: `El espacio ${espacio} ya está ocupado el ${solicitud.dia} en esa semana por ${conflicto.profesorName} de ${conflicto.horaInicio} a ${conflicto.horaFin}.\n\nPor favor selecciona otro espacio.`,
        type: 'error'
      });
      return;
    }
      // aprobar en Firestore
    try {
      await updateDoc(doc(db, 'requests', solicitud.id), {
        estado: 'aprobada',
        espacioAsignado: espacio,
        fechaAprobacion: serverTimestamp()
      });
      // Enviar Email al Profesor
      const solicitudActualizada = {
       ...solicitud,
       espacioAsignado: espacio
      };

      const htmlEmail = emailSolicitudAprobada(
         { name: solicitud.profesorName },
         solicitudActualizada
      );
      //enviar email(no bloqueante)
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: solicitud.profesorEmail || solicitud.email,
          subject: `✅ Solicitud Aprobada - ${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}`,
          html: htmlEmail
       })  
     }).catch(err => console.error('Error enviando email:', err)); 
      
      
      
       setModal({
        
        isOpen: true,
        title: '✅ Solicitud aprobada',
        message: `La solicitud de ${solicitud.profesorName} para el ${solicitud.dia} ha sido aprobada en el espacio ${espacio}.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error al aprobar',
        message: 'Ocurrió un error al aprobar la solicitud. Por favor intenta de nuevo.',
        type: 'error'
      });
    }
  };

  const rechazarSolicitud = async (solicitudId, solicitud) => {
    setRechazarData({ solicitudId, solicitud });
  };
  const confirmarRechazo = async (motivo) => {
    if (!rechazarData) return;
    
    const { solicitudId, solicitud } = rechazarData;
    setRechazarData(null);

    try {
      await updateDoc(doc(db, 'requests', solicitudId), {
        estado: 'rechazada',
        notasAdmin: motivo || 'Sin motivo especificado',
        fechaAprobacion: serverTimestamp()
      });

      //enviar Email al profesor
      const htmlEmail = emailSolicitudRechazada(
        { name: solicitud.profesorName },
         solicitud,
         motivo || 'Sin motivo especificado'
      );
       // Enviar email (no bloqueante)
       fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: solicitud.profesorEmail || solicitud.email,
          subject: `❌ Solicitud Rechazada - ${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}`,
          html: htmlEmail
        })
      }).catch(err => console.error('Error enviando email:', err));

      setModal({
        isOpen: true,
        title: 'Solicitud rechazada',
        message: 'La solicitud ha sido rechazada correctamente.',
        type: 'info',
        showCancel: false,
        onConfirm:null
      });
    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Ocurrió un error al rechazar la solicitud.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    }
  };

  const exportarPDF = () => {
    const semanaId = obtenerNumeroSemana(semanaActual);
    const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);
    generarPDFHorarios(
      solicitudesSemana,
      formatearSemana(semanaActual),
      `horarios_${formatearSemana(semanaActual).replace(/\//g, '-')}.pdf`
    );
  };

  if (!user) return <Loading message="Cargando panel..." />;

  // Filtros
  const semanaId = obtenerNumeroSemana(semanaActual);
  const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const pendientes = solicitudesPendientes.length;
  const aprobadas = solicitudesSemana.filter(s => s.estado === 'aprobada').length;
  const espaciosOcupados = new Set(
    solicitudesSemana
      .filter(s => s.estado === 'aprobada' && s.espacioAsignado)
      .map(s => s.espacioAsignado)
  ).size;

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Solicitudes Pendientes
            </h3>
            <p className="text-4xl font-bold text-blue-600">{pendientes}</p>
            <p className="text-xs text-gray-500 mt-1">Todas las semanas</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Espacios Ocupados
            </h3>
            <p className="text-4xl font-bold text-green-600">
              {espaciosOcupados}/{espacios.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Semana seleccionada</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Total Aprobadas
            </h3>
            <p className="text-4xl font-bold text-purple-600">{aprobadas}</p>
            <p className="text-xs text-gray-500 mt-1">Semana seleccionada</p>
          </div>
        </div>

        {/* Exportar PDF */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                📄 Exportar Horarios
              </h2>
              <p className="text-gray-600 text-sm">
                Descarga los horarios aprobados de la semana seleccionada
              </p>
            </div>
            <Button variant="primary" onClick={exportarPDF}>
              ⬇️ Descargar PDF
            </Button>
          </div>
        </div>

        {/* Selector de Semana */}
        <SelectorSemana
          semanaActual={semanaActual}
          onCambiarSemana={setSemanaActual}
        />

        {/* Gestión de Semanas */}
        <GestionSemanas
          semanaActual={semanaActual}
          onActualizar={() => setSemanaActual(new Date(semanaActual))}
        />

        {/* Buscador de Espacios */}
        <div className="mb-8">
          <BuscadorEspacios
            solicitudes={solicitudes}
            espacios={espacios}
          />
        </div>

        {/* Solicitudes Pendientes - TODAS LAS SEMANAS */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            Solicitudes Pendientes ({pendientes})
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Mostrando todas las solicitudes pendientes de cualquier semana
          </p>

          {loading ? (
            <p className="text-gray-500">Cargando solicitudes...</p>
          ) : solicitudesPendientes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-500 font-semibold">
                No hay solicitudes pendientes
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {solicitudesPendientes.map(solicitud => (
                <SolicitudCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  espacios={espacios}
                  solicitudesAprobadas={solicitudes.filter(s => s.estado === 'aprobada')}
                  onAprobar={aprobarSolicitud}
                  onRechazar={rechazarSolicitud}
                />
              ))}
            </div>
          )}
        </div>

        {/* Solicitudes Aprobadas - SEMANA SELECCIONADA */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            Solicitudes Aprobadas ({aprobadas})
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Semana: {formatearSemana(semanaActual)}
          </p>

          {solicitudesSemana.filter(s => s.estado === 'aprobada').length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500">
                No hay solicitudes aprobadas para esta semana
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {solicitudesSemana
                .filter(s => s.estado === 'aprobada')
                .sort((a, b) => {
                  const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  return diasOrden.indexOf(a.dia) - diasOrden.indexOf(b.dia);
                })
                .map(solicitud => (
                  <div
                    key={solicitud.id}
                    className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        {solicitud.esSolicitudGrupo && (
                          <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mb-1 font-semibold">
                            📅 Solicitud por rango
                          </span>
                        )}
                        <p className="font-semibold text-gray-900">
                          {solicitud.profesorName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {solicitud.dia} · {solicitud.horaInicio} - {solicitud.horaFin} ·
                          <span className="capitalize"> {solicitud.tipoClase}</span> ·
                          <span className="font-semibold text-green-700"> {solicitud.espacioAsignado}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Calendario General */}
        <div className="mb-8">
          <CalendarioSemanal
            solicitudes={solicitudesSemana}
            profesorView={false}
          />
        </div>

        {/* Ocupación de Espacios */}
        <div className="mb-8">
          <OcupacionEspacios
            solicitudes={solicitudesSemana}
            espacios={espacios}
          />
        </div>

      </main>
      {/* Modal de rechazo con input */}
      {rechazarData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ⚠️ Rechazar solicitud
            </h3>

            <p className="text-gray-700 mb-4">
              ¿Motivo del rechazo? (opcional)
            </p>
            <textarea
             id="motivoRechazo"
             rows="3"
             placeholder="Ej: Espacio no disponible, conflicto de horario..."
             className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button
               onClick={() => setRechazarData(null)}
               className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
               >
                Cancelar
              </button>
               <button
               onClick={() => {
                const motivo = document.getElementById('motivoRechazo').value;
                  confirmarRechazo(motivo);
               }}
               className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Rechazar
              </button>
             </div>
            </div>
           </div>
          )}



         {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({...modal, isOpen: false})}
        title={modal.title}
        type={modal.type}
      >
        <p className="whitespace-pre-line">{modal.message}</p>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────
// COMPONENTE: Tarjeta de solicitud pendiente
// ─────────────────────────────────────────
function SolicitudCard({ solicitud, espacios, solicitudesAprobadas, onAprobar, onRechazar }) {
  const [espacioSeleccionado, setEspacioSeleccionado] = useState('');

  const espacioTieneConflicto = (espacio) => {
    const aprobadasMismaSemana = solicitudesAprobadas.filter(s =>
      s.semanaId === solicitud.semanaId
    );
    return aprobadasMismaSemana.some(s => {
      if (s.espacioAsignado !== espacio) return false;
      if (s.dia !== solicitud.dia) return false;
      return (
        (solicitud.horaInicio >= s.horaInicio && solicitud.horaInicio < s.horaFin) ||
        (solicitud.horaFin > s.horaInicio && solicitud.horaFin <= s.horaFin) ||
        (solicitud.horaInicio <= s.horaInicio && solicitud.horaFin >= s.horaFin)
      );
    });
  };

  const formatearFechaTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch { return ''; }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-yellow-50 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Info izquierda */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {solicitud.profesorName || 'Sin nombre'}
          </h3>

          {/* Badge grupo */}
          {solicitud.esSolicitudGrupo && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-purple-700 mb-1">
                📅 Solicitud por rango de fechas
              </p>
              <p className="text-sm text-purple-900">
                {formatearFechaTimestamp(solicitud.grupoFechaInicio)} →{' '}
                {formatearFechaTimestamp(solicitud.grupoFechaFin)}
              </p>
              {solicitud.grupoDias && (
                <p className="text-xs text-purple-600 mt-1">
                  Días: {solicitud.grupoDias.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Semana específica */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <p className="text-xs font-bold text-blue-700">📅 Esta semana:</p>
            <p className="text-sm font-bold text-blue-900">
              {formatearFechaTimestamp(solicitud.semanaInicio)}
            </p>
          </div>

          {/* Datos */}
          <div className="space-y-2 text-gray-700">
            <p>
              <span className="font-semibold">Día:</span> {solicitud.dia}
            </p>
            <p>
              <span className="font-semibold">Horario:</span>{' '}
              {solicitud.horaInicio} - {solicitud.horaFin}
            </p>
            <p>
              <span className="font-semibold">Tipo:</span>{' '}
              <span className="capitalize">{solicitud.tipoClase}</span>
            </p>
            {solicitud.observaciones && (
              <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                <p className="text-xs font-semibold text-gray-600">Observaciones:</p>
                <p className="text-sm text-gray-700 mt-1">{solicitud.observaciones}</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones derecha */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-900">
            Asignar espacio para esta semana:
          </label>

          <select
            value={espacioSeleccionado}
            onChange={(e) => setEspacioSeleccionado(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar espacio</option>
            {espacios.map(espacio => {
              const conflicto = espacioTieneConflicto(espacio);
              return (
                <option key={espacio} value={espacio}>
                  {espacio} {conflicto ? '⚠️ OCUPADO' : '✓'}
                </option>
              );
            })}
          </select>

          {espacioSeleccionado && espacioTieneConflicto(espacioSeleccionado) && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">
              ⚠️ Conflicto en esta semana - Selecciona otro espacio
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => onAprobar(solicitud, espacioSeleccionado)}
            >
              ✓ Aprobar
            </Button>
            <Button
              variant="danger"
              onClick={() => onRechazar(solicitud.id, solicitud)}
            >
              ✗ Rechazar
            </Button>
          </div>

          {solicitud.esSolicitudGrupo && (
            <p className="text-xs text-gray-500 mt-3 italic">
              💡 Cada semana del rango aparece por separado. Puedes asignar un espacio diferente para cada semana si hay conflictos.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}