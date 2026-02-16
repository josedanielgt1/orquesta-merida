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
import OcupacionEspacios from '@/components/OcupacionEspacios';
import CalendarioSemanal from '@/components/CalendarioSemanal';
import BuscadorEspacios from '@/components/BuscadorEspacios';
import SelectorSemana from '@/components/SelectorSemana';
import GestionSemanas from '@/components/GestionSemanas';
import GestionUsuarios from '@/components/GestionUsuarios';

export default function MasterDashboard() {
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActual, setSemanaActual] = useState(obtenerInicioSemana(new Date()));
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
      if (i === 35 || i === 37 || i === 38 || i === 39 || i === 40) continue;
      espaciosList.push(`E${i}`);
    }
    espaciosList.push('E11A', 'E25A', 'E25B', 'E25C');
    espaciosList.sort();
    setEspacios(espaciosList);

    // Escuchar TODAS las solicitudes (sin filtro de semana)
    const unsubscribe = onSnapshot(
      collection(db, 'requests'),
      (snapshot) => {
        const solicitudesData = [];
        snapshot.forEach((doc) => {
          solicitudesData.push({ id: doc.id, ...doc.data() });
        });
        setSolicitudes(solicitudesData);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('user');
    router.push('/login');
  };

  const aprobarSolicitud = async (solicitud, espacio) => {
    if (!espacio) {
      alert('Debes seleccionar un espacio');
      return;
    }

    // Verificar conflictos en la misma semana
    const semanaId = solicitud.semanaId || obtenerNumeroSemana(semanaActual);
    const aprobadas = solicitudes.filter(s => 
      s.estado === 'aprobada' && 
      s.semanaId === semanaId
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
      
      alert(`⚠️ CONFLICTO DETECTADO\n\nEl espacio ${espacio} ya está ocupado el ${solicitud.dia} en ese horario por:\n${conflicto.profesorName}\nHorario: ${conflicto.horaInicio} - ${conflicto.horaFin}\n\nSelecciona otro espacio o rechaza esta solicitud.`);
      return;
    }

    try {
      await updateDoc(doc(db, 'requests', solicitud.id), {
        estado: 'aprobada',
        espacioAsignado: espacio,
        fechaAprobacion: serverTimestamp()
      });
      alert('✅ Solicitud aprobada correctamente');
    } catch (err) {
      console.error('Error:', err);
      alert('Error al aprobar solicitud');
    }
  };

  const rechazarSolicitud = async (solicitudId) => {
    const motivo = prompt('Motivo del rechazo (opcional):');
    
    try {
      await updateDoc(doc(db, 'requests', solicitudId), {
        estado: 'rechazada',
        notasAdmin: motivo || 'Sin motivo especificado',
        fechaAprobacion: serverTimestamp()
      });
      alert('Solicitud rechazada');
    } catch (err) {
      console.error('Error:', err);
      alert('Error al rechazar solicitud');
    }
  };

  const exportarPDF = () => {
    const semanaId = obtenerNumeroSemana(semanaActual);
    const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);
    
    generarPDFHorarios(
      solicitudesSemana,
      formatearSemana(semanaActual),
      `horarios_semana_${formatearSemana(semanaActual).replace(/\//g, '-')}.pdf`
    );
  };

  if (!user) return <Loading message="Cargando panel..." />;

  // Filtrar por semana seleccionada
  const semanaId = obtenerNumeroSemana(semanaActual);
  const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);
  
  // Solicitudes pendientes: TODAS sin importar la semana
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const pendientes = solicitudesPendientes.length;
  
  // Solicitudes aprobadas: solo de la semana seleccionada
  const aprobadas = solicitudesSemana.filter(s => s.estado === 'aprobada').length;
  const espaciosOcupados = new Set(
    solicitudesSemana.filter(s => s.estado === 'aprobada').map(s => s.espacioAsignado)
  ).size;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Panel de Administración
            </h1>
            <p className="text-gray-600">Bienvenido, {user.name}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
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
            <p className="text-4xl font-bold text-green-600">{espaciosOcupados}/{espacios.length}</p>
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                📄 Exportar Horarios
              </h2>
              <p className="text-gray-600 text-sm">
                Descarga los horarios aprobados de la semana seleccionada en formato PDF
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

        {/* Gestión de Usuarios */}
        <GestionUsuarios />

        {/* Buscador de Espacios */}
        <div className="mb-8">
          <BuscadorEspacios 
            solicitudes={solicitudes}
            espacios={espacios}
          />
        </div>

        {/* Solicitudes Pendientes - TODAS LAS SEMANAS */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Solicitudes Pendientes ({pendientes})
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Mostrando todas las solicitudes pendientes de cualquier semana
          </p>
          
          {loading ? (
            <p className="text-gray-500">Cargando solicitudes...</p>
          ) : solicitudesPendientes.length === 0 ? (
            <p className="text-gray-500">No hay solicitudes pendientes</p>
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

        {/* Solicitudes Aprobadas - SOLO SEMANA SELECCIONADA */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            Solicitudes Aprobadas ({aprobadas})
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Mostrando solicitudes de: {formatearSemana(semanaActual)}
          </p>
          
          {solicitudesSemana.filter(s => s.estado === 'aprobada').length === 0 ? (
            <p className="text-gray-500">No hay solicitudes aprobadas para esta semana</p>
          ) : (
            <div className="space-y-4">
              {solicitudesSemana
                .filter(s => s.estado === 'aprobada')
                .map(solicitud => (
                  <div key={solicitud.id} className="border-l-4 border-green-500 pl-4 py-3 bg-green-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{solicitud.profesorName}</p>
                        <p className="text-sm text-gray-600">
                          {solicitud.dia} {solicitud.horaInicio} - {solicitud.horaFin} | 
                          Clase {solicitud.tipoClase} | 
                          <span className="font-semibold text-green-600"> Espacio {solicitud.espacioAsignado}</span>
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
    </div>
  );
}

// Componente para cada solicitud pendiente
function SolicitudCard({ solicitud, espacios, solicitudesAprobadas, onAprobar, onRechazar }) {
  const [espacioSeleccionado, setEspacioSeleccionado] = useState('');

  const espacioTieneConflicto = (espacio) => {
    // Verificar conflictos solo en la MISMA semana de la solicitud
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

  const formatearSemanaInfo = () => {
    if (!solicitud.semanaInicio) return '';
    
    try {
      let fecha;
      if (solicitud.semanaInicio.toDate) {
        fecha = solicitud.semanaInicio.toDate();
      } else {
        fecha = new Date(solicitud.semanaInicio);
      }
      
      return fecha.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch (err) {
      return '';
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-yellow-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {solicitud.profesorName || 'Nombre no disponible'}
          </h3>
          
          <div className="space-y-2 text-gray-700">
            {solicitud.semanaInicio && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                <p className="text-sm font-semibold text-blue-800">
                  📅 Semana solicitada:
                </p>
                <p className="text-blue-900 font-bold">
                  {formatearSemanaInfo()}
                </p>
              </div>
            )}
            
            <p><strong>Día:</strong> {solicitud.dia}</p>
            <p><strong>Horario:</strong> {solicitud.horaInicio} - {solicitud.horaFin}</p>
            <p><strong>Tipo:</strong> <span className="capitalize">{solicitud.tipoClase}</span></p>
            
            {solicitud.observaciones && (
              <div className="mt-3 p-3 bg-gray-100 rounded">
                <p className="text-sm font-semibold text-gray-700">Observaciones:</p>
                <p className="text-sm text-gray-600 mt-1">{solicitud.observaciones}</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-900">
            Asignar Espacio:
          </label>
          <select
            value={espacioSeleccionado}
            onChange={(e) => setEspacioSeleccionado(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-gray-900 bg-white"
          >
            <option value="">Seleccionar espacio</option>
            {espacios.map(espacio => {
              const conflicto = espacioTieneConflicto(espacio);
              return (
                <option 
                  key={espacio} 
                  value={espacio}
                  className={conflicto ? 'text-red-600 bg-red-50' : ''}
                >
                  {espacio} {conflicto ? '⚠️ OCUPADO' : '✓'}
                </option>
              );
            })}
          </select>

          {espacioSeleccionado && espacioTieneConflicto(espacioSeleccionado) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              ⚠️ Este espacio tiene conflicto de horario en esa semana
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
              onClick={() => onRechazar(solicitud.id)}
            >
              ✗ Rechazar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}