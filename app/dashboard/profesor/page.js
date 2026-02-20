"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/app/firebase';
import { obtenerInicioSemana, formatearSemana, obtenerNumeroSemana } from '@/utils/fechas';
import { generarPDFPorProfesor } from '@/utils/pdfGenerator';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import SolicitudForm from '@/components/SolicitudForm';
import CalendarioSemanal from '@/components/CalendarioSemanal';

export default function ProfesorDashboard() {
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('solicitudes');
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

  useEffect(() => {
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
      data.sort((a, b) => {
        if (!a.semanaId || !b.semanaId) return 0;
        return a.semanaId.localeCompare(b.semanaId);
      });
      setSolicitudes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const exportarMiHorario = () => {
    generarPDFPorProfesor(
      solicitudes,
      user.name,
      formatearSemana(obtenerInicioSemana(new Date()))
    );
  };

  const cancelarSolicitud = async (solicitudId, solicitudInfo) => {
    setModal({
      isOpen: true,
      title: '⚠️ ¿Cancelar solicitud?',
      message: `¿Estás seguro de cancelar la solicitud de:\n\n${solicitudInfo.dia} · ${solicitudInfo.horaInicio} - ${solicitudInfo.horaFin}\n\nEsta acción no se puede deshacer.`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'requests', solicitudId));
          
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
            message: 'No se pudo cancelar la solicitud. Intenta de nuevo.',
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        }
      }
    });
  };

  if (!user) return <Loading message="Cargando panel..." />;

  // Stats
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada').length;
  const rechazadas = solicitudes.filter(s => s.estado === 'rechazada').length;
  const horasSemanales = solicitudes
    .filter(s => s.estado === 'aprobada')
    .reduce((total, s) => {
      const inicio = parseInt(s.horaInicio?.split(':')[0] || 0);
      const fin = parseInt(s.horaFin?.split(':')[0] || 0);
      return total + (fin - inicio);
    }, 0);

  // Agrupar solicitudes por grupoId
  const solicitudesAgrupadas = [];
  const gruposVistos = new Set();

  solicitudes.forEach(sol => {
    if (sol.esSolicitudGrupo && sol.grupoId) {
      if (!gruposVistos.has(sol.grupoId)) {
        gruposVistos.add(sol.grupoId);
        const delGrupo = solicitudes.filter(s => s.grupoId === sol.grupoId);
        solicitudesAgrupadas.push({
          esGrupo: true,
          grupoId: sol.grupoId,
          solicitudes: delGrupo,
          dia: sol.dia,
          grupoDias: sol.grupoDias,
          horaInicio: sol.horaInicio,
          horaFin: sol.horaFin,
          tipoClase: sol.tipoClase,
          observaciones: sol.observaciones,
          grupoFechaInicio: sol.grupoFechaInicio,
          grupoFechaFin: sol.grupoFechaFin,
        });
      }
    } else {
      solicitudesAgrupadas.push({
        esGrupo: false,
        solicitudes: [sol],
        ...sol
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎼</span>
              <div>
                <p className="font-bold text-gray-900 leading-tight">Orquesta Sinfónica</p>
                <p className="text-xs text-gray-500 leading-tight">de Mérida</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => { setVistaActiva('solicitudes'); setShowForm(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  vistaActiva === 'solicitudes'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📋 Mis Solicitudes
              </button>
              <button
                onClick={() => { setVistaActiva('calendario'); setShowForm(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  vistaActiva === 'calendario'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📅 Mi Calendario
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Profesor</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>

          <div className="md:hidden flex gap-2 pb-3">
            <button
              onClick={() => setVistaActiva('solicitudes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                vistaActiva === 'solicitudes' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              📋 Solicitudes
            </button>
            <button
              onClick={() => setVistaActiva('calendario')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                vistaActiva === 'calendario' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              📅 Calendario
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-gray-500 text-xs font-semibold mb-1">Pendientes</h3>
            <p className="text-3xl font-bold text-yellow-500">{pendientes}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-gray-500 text-xs font-semibold mb-1">Aprobadas</h3>
            <p className="text-3xl font-bold text-green-600">{aprobadas}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-gray-500 text-xs font-semibold mb-1">Rechazadas</h3>
            <p className="text-3xl font-bold text-red-500">{rechazadas}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-gray-500 text-xs font-semibold mb-1">Horas aprobadas</h3>
            <p className="text-3xl font-bold text-blue-600">{horasSemanales}h</p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <Button variant="primary" onClick={() => { setShowForm(!showForm); setVistaActiva('solicitudes'); }}>
            {showForm ? '✕ Cancelar' : '+ Nueva Solicitud'}
          </Button>
          {aprobadas > 0 && (
            <Button variant="secondary" onClick={exportarMiHorario}>
              📄 Descargar Mi Horario PDF
            </Button>
          )}
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

        {/* VISTA: SOLICITUDES */}
        {vistaActiva === 'solicitudes' && !showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Mis Solicitudes ({solicitudes.length})
            </h2>

            {loading ? (
              <p className="text-gray-500">Cargando...</p>
            ) : solicitudesAgrupadas.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-gray-500 text-lg mb-4">No tienes solicitudes aún</p>
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  + Crear mi primera solicitud
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {solicitudesAgrupadas.map((item, idx) => {
                  if (item.esGrupo) {
                    // ── SOLICITUD POR RANGO ──
                    const total = item.solicitudes.length;
                    const aprobadas = item.solicitudes.filter(s => s.estado === 'aprobada').length;
                    const pendientes = item.solicitudes.filter(s => s.estado === 'pendiente').length;
                    const rechazadas = item.solicitudes.filter(s => s.estado === 'rechazada').length;

                    const fechaInicioText = item.grupoFechaInicio?.toDate
                      ? item.grupoFechaInicio.toDate().toLocaleDateString('es-ES')
                      : item.grupoFechaInicio
                        ? new Date(item.grupoFechaInicio).toLocaleDateString('es-ES')
                        : '';

                    const fechaFinText = item.grupoFechaFin?.toDate
                      ? item.grupoFechaFin.toDate().toLocaleDateString('es-ES')
                      : item.grupoFechaFin
                        ? new Date(item.grupoFechaFin).toLocaleDateString('es-ES')
                        : '';

                    return (
                      <div key={item.grupoId} className="border-2 border-purple-200 rounded-xl p-5 bg-purple-50">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <span className="inline-block text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-bold mb-2">
                              📅 Solicitud por rango · {total} semanas
                            </span>
                            <h3 className="text-lg font-bold text-gray-900">
                              {item.grupoDias?.join(' + ')} · {item.horaInicio} - {item.horaFin}
                            </h3>
                            <p className="text-sm text-gray-600 capitalize">
                              Clase {item.tipoClase}
                            </p>
                            {fechaInicioText && (
                              <p className="text-sm text-purple-700 font-semibold mt-1">
                                📆 {fechaInicioText} → {fechaFinText}
                              </p>
                            )}
                            {item.observaciones && (
                              <p className="text-xs text-gray-500 mt-1">📝 {item.observaciones}</p>
                            )}
                          </div>

                          <div className="text-right text-sm space-y-1">
                            {aprobadas > 0 && (
                              <p className="text-green-600 font-semibold">✓ {aprobadas} aprobadas</p>
                            )}
                            {pendientes > 0 && (
                              <p className="text-yellow-600 font-semibold">⏳ {pendientes} pendientes</p>
                            )}
                            {rechazadas > 0 && (
                              <p className="text-red-600 font-semibold">✗ {rechazadas} rechazadas</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {item.solicitudes.map(sol => {
                            let semanaTexto = '';
                            if (sol.semanaInicio) {
                              try {
                                const fecha = sol.semanaInicio.toDate
                                  ? sol.semanaInicio.toDate()
                                  : new Date(sol.semanaInicio);
                                semanaTexto = fecha.toLocaleDateString('es-ES', {
                                  day: '2-digit', month: '2-digit', year: 'numeric'
                                });
                              } catch {}
                            }

                            return (
                              <div
                                key={sol.id}
                                className={`flex items-center justify-between px-4 py-2 rounded-lg border ${
                                  sol.estado === 'aprobada'
                                    ? 'bg-green-50 border-green-200'
                                    : sol.estado === 'rechazada'
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-lg">
                                    {sol.estado === 'aprobada' ? '✅' :
                                     sol.estado === 'rechazada' ? '❌' : '⏳'}
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {sol.dia} · Semana del {semanaTexto}
                                    </p>
                                    {sol.estado === 'aprobada' && (
                                      <p className="text-xs text-green-700 font-semibold">
                                        Espacio {sol.espacioAsignado}
                                      </p>
                                    )}
                                    {sol.estado === 'rechazada' && sol.notasAdmin && (
                                      <p className="text-xs text-red-600">
                                        {sol.notasAdmin}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    sol.estado === 'aprobada'
                                      ? 'bg-green-100 text-green-700'
                                      : sol.estado === 'rechazada'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {sol.estado === 'aprobada' ? 'Aprobada' :
                                     sol.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'}
                                  </span>

                                  {/* Botón cancelar */}
                                  {sol.estado === 'pendiente' && (
                                    <button
                                      onClick={() => cancelarSolicitud(sol.id, sol)}
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                      title="Cancelar esta solicitud"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    // ── SOLICITUD INDIVIDUAL ──
                    const sol = item.solicitudes[0];
                    let semanaTexto = '';
                    if (sol.semanaInicio) {
                      try {
                        const fecha = sol.semanaInicio.toDate
                          ? sol.semanaInicio.toDate()
                          : new Date(sol.semanaInicio);
                        semanaTexto = fecha.toLocaleDateString('es-ES', {
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        });
                      } catch {}
                    }

                    return (
                      <div
                        key={sol.id}
                        className={`border-l-4 pl-4 py-4 rounded-r-lg ${
                          sol.estado === 'pendiente'
                            ? 'border-yellow-500 bg-yellow-50'
                            : sol.estado === 'aprobada'
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {semanaTexto && (
                              <p className="text-xs text-gray-500 mb-1">
                                📅 Semana del {semanaTexto}
                              </p>
                            )}
                            <p className="font-bold text-lg text-gray-900">
                              {sol.dia} · {sol.horaInicio} - {sol.horaFin}
                            </p>
                            <p className="text-sm text-gray-600 capitalize">
                              Clase {sol.tipoClase}
                            </p>
                            {sol.observaciones && (
                              <p className="text-sm text-gray-500 mt-1">📝 {sol.observaciones}</p>
                            )}
                            <p className={`text-sm font-bold mt-2 ${
                              sol.estado === 'pendiente' ? 'text-yellow-600' :
                              sol.estado === 'aprobada' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {sol.estado === 'pendiente' && '⏳ Pendiente de aprobación'}
                              {sol.estado === 'aprobada' && `✓ Aprobada - Espacio ${sol.espacioAsignado}`}
                              {sol.estado === 'rechazada' && `✗ Rechazada${sol.notasAdmin ? ` - ${sol.notasAdmin}` : ''}`}
                            </p>
                          </div>

                          {/* Botón cancelar */}
                          {sol.estado === 'pendiente' && (
                            <button
                              onClick={() => cancelarSolicitud(sol.id, sol)}
                              className="ml-4 p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                              title="Cancelar solicitud"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        )}

        {/* VISTA: CALENDARIO */}
        {vistaActiva === 'calendario' && (
          <div>
            {/* Navegación de semana */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const nueva = new Date(semanaActual);
                    nueva.setDate(nueva.getDate() - 7);
                    setSemanaActual(nueva);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  ← Anterior
                </button>

                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">
                    {formatearSemana(semanaActual)}
                  </p>
                  <button
                    onClick={() => setSemanaActual(obtenerInicioSemana(new Date()))}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Ir a esta semana
                  </button>
                </div>

                <button
                  onClick={() => {
                    const nueva = new Date(semanaActual);
                    nueva.setDate(nueva.getDate() + 7);
                    setSemanaActual(nueva);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Siguiente →
                </button>
              </div>
            </div>

            <CalendarioSemanal
              solicitudes={solicitudes.filter(s =>
                s.semanaId === obtenerNumeroSemana(semanaActual)
              )}
              profesorView={true}
            />
          </div>
        )}

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