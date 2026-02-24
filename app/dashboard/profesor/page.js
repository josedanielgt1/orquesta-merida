"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '@/app/firebase';
import { obtenerInicioSemana, obtenerNumeroSemana, formatearSemana } from '@/utils/fechas';
import { generarPDFPorProfesor } from '@/utils/pdfGenerator';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import CalendarioSemanal from '@/components/CalendarioSemanal';
import SolicitudForm from '@/components/SolicitudForm';
import NavBar from '@/components/NavBar';

export default function ProfesorDashboard() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [semanaActual, setSemanaActual] = useState(obtenerInicioSemana(new Date()));
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    onConfirm: null
  });
  const router = useRouter();

  // Marcar componente como montado
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'profesor') {
      router.push('/dashboard/master');
      return;
    }

    setUser(parsedUser);

    const q = query(
      collection(db, 'requests'),
      where('profesorId', '==', parsedUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setSolicitudes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, mounted]);

  const irSemanaAnterior = () => {
    const nuevaFecha = new Date(semanaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() - 7);
    setSemanaActual(obtenerInicioSemana(nuevaFecha));
  };

  const irSemanaSiguiente = () => {
    const nuevaFecha = new Date(semanaActual);
    nuevaFecha.setDate(nuevaFecha.getDate() + 7);
    setSemanaActual(obtenerInicioSemana(nuevaFecha));
  };

  const irSemanaActual = () => {
    setSemanaActual(obtenerInicioSemana(new Date()));
  };

  const cancelarSolicitud = async (solicitud) => {
    setModal({
      isOpen: true,
      title: '¿Cancelar solicitud?',
      message: `¿Estás seguro de cancelar esta solicitud?\n\n${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'requests', solicitud.id));
          setModal({
            isOpen: true,
            title: '✅ Solicitud cancelada',
            message: 'La solicitud ha sido eliminada correctamente.',
            type: 'success',
            showCancel: false,
            onConfirm: null
          });
        } catch (err) {
          console.error('Error:', err);
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'No se pudo cancelar la solicitud.',
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        }
      }
    });
  };

  const exportarMiHorario = () => {
    const aprobadas = solicitudes.filter(s => s.estado === 'aprobada');
    if (aprobadas.length === 0) {
      setModal({
        isOpen: true,
        title: 'Sin clases aprobadas',
        message: 'No tienes clases aprobadas para exportar.',
        type: 'info'
      });
      return;
    }
    generarPDFPorProfesor(aprobadas, user.name);
  };

  if (!mounted || !user) return <Loading message="Cargando panel..." />;

  const semanaId = obtenerNumeroSemana(semanaActual);
  const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);
  const pendientes = solicitudesSemana.filter(s => s.estado === 'pendiente').length;
  const aprobadas = solicitudesSemana.filter(s => s.estado === 'aprobada').length;
  const rechazadas = solicitudesSemana.filter(s => s.estado === 'rechazada').length;

  // Agrupar por rango
  const solicitudesAgrupadas = solicitudes.reduce((acc, sol) => {
    if (sol.esSolicitudGrupo && sol.grupoId) {
      if (!acc[sol.grupoId]) {
        acc[sol.grupoId] = [];
      }
      acc[sol.grupoId].push(sol);
    } else {
      acc[sol.id] = [sol];
    }
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Botón Nueva Solicitud */}
        <div className="mb-8">
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '+ Nueva Solicitud'}
          </Button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="mb-8">
            <SolicitudForm
              userId={user.uid}
              userName={user.name}
              userEmail={user.email}
              onSuccess={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Pendientes
            </h3>
            <p className="text-4xl font-bold text-yellow-600">{pendientes}</p>
            <p className="text-xs text-gray-500 mt-1">Semana seleccionada</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Aprobadas
            </h3>
            <p className="text-4xl font-bold text-green-600">{aprobadas}</p>
            <p className="text-xs text-gray-500 mt-1">Semana seleccionada</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Rechazadas
            </h3>
            <p className="text-4xl font-bold text-red-600">{rechazadas}</p>
            <p className="text-xs text-gray-500 mt-1">Semana seleccionada</p>
          </div>
        </div>

        {/* Exportar PDF */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                📄 Mi Horario Completo
              </h2>
              <p className="text-gray-600 text-sm">
                Descarga todas tus clases aprobadas ordenadas por semana
              </p>
            </div>
            <Button variant="primary" onClick={exportarMiHorario}>
              ⬇️ Descargar PDF
            </Button>
          </div>
        </div>

        {/* Navegación de semanas */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={irSemanaAnterior}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              ← Anterior
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Semana actual</p>
              <p className="text-xl font-bold text-gray-900">
                {formatearSemana(semanaActual)}
              </p>
            </div>

            <button
              onClick={irSemanaSiguiente}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Siguiente →
            </button>
          </div>

          <div className="text-center mt-4">
            <button
              onClick={irSemanaActual}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-all text-sm"
            >
              📅 Ir a esta semana
            </button>
          </div>
        </div>

        {/* Mis Solicitudes Agrupadas */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Mis Solicitudes
          </h2>

          {loading ? (
            <p className="text-gray-500">Cargando solicitudes...</p>
          ) : Object.keys(solicitudesAgrupadas).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500">No has creado solicitudes aún</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(solicitudesAgrupadas).map(([grupoId, solicitudesGrupo]) => {
                const esGrupo = solicitudesGrupo[0].esSolicitudGrupo;
                const todasPendientes = solicitudesGrupo.every(s => s.estado === 'pendiente');

                return (
                  <div key={grupoId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    
                    {/* Header del grupo */}
                    {esGrupo && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-block text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                            📅 Solicitud por rango de fechas
                          </span>
                          
                          {todasPendientes && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-semibold">
                              ⏳ Todas pendientes
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600">
                          Del{' '}
                          {solicitudesGrupo[0].grupoFechaInicio?.toDate?.().toLocaleDateString('es-ES') || 'N/A'}
                          {' → '}
                          {solicitudesGrupo[0].grupoFechaFin?.toDate?.().toLocaleDateString('es-ES') || 'N/A'}
                        </p>
                        
                        {solicitudesGrupo[0].grupoDias && (
                          <p className="text-xs text-gray-500 mt-1">
                            Días: {solicitudesGrupo[0].grupoDias.join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Solicitudes individuales */}
                    <div className="space-y-2">
                      {solicitudesGrupo.map(solicitud => (
                        <div
                          key={solicitud.id}
                          className={`p-4 rounded-lg border-l-4 ${
                            solicitud.estado === 'pendiente'
                              ? 'bg-yellow-50 border-yellow-400'
                              : solicitud.estado === 'aprobada'
                              ? 'bg-green-50 border-green-400'
                              : 'bg-red-50 border-red-400'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              {esGrupo && (
                                <p className="text-xs text-gray-500 mb-1">
                                  📅 Semana: {solicitud.semanaInicio?.toDate?.().toLocaleDateString('es-ES') || 'N/A'}
                                </p>
                              )}
                              
                              <p className="font-semibold text-gray-900">
                                {solicitud.dia} · {solicitud.horaInicio} - {solicitud.horaFin}
                              </p>
                              
                              <p className="text-sm text-gray-600 capitalize">
                                {solicitud.tipoClase}
                                {solicitud.espacioAsignado && (
                                  <span className="font-semibold text-green-700">
                                    {' · Espacio: '}{solicitud.espacioAsignado}
                                  </span>
                                )}
                              </p>

                              {solicitud.observaciones && (
                                <p className="text-xs text-gray-500 mt-1 italic">
                                  💬 {solicitud.observaciones}
                                </p>
                              )}

                              {solicitud.notasAdmin && (
                                <div className="mt-2 p-2 bg-white rounded border border-red-200">
                                  <p className="text-xs font-semibold text-red-600">
                                    Motivo de rechazo:
                                  </p>
                                  <p className="text-sm text-red-700">{solicitud.notasAdmin}</p>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  solicitud.estado === 'pendiente'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : solicitud.estado === 'aprobada'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {solicitud.estado === 'pendiente' && '⏳ Pendiente'}
                                {solicitud.estado === 'aprobada' && '✅ Aprobada'}
                                {solicitud.estado === 'rechazada' && '❌ Rechazada'}
                              </span>

                              {solicitud.estado === 'pendiente' && (
                                <button
                                  onClick={() => cancelarSolicitud(solicitud)}
                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                                  title="Cancelar solicitud"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendario */}
        <div className="mb-8">
          <CalendarioSemanal
            solicitudes={solicitudesSemana}
            profesorView={true}
          />
        </div>

      </main>

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
    </div>
  );
}