"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/app/firebase';
import { obtenerInicioSemana, formatearSemana } from '@/utils/fechas';
import { generarPDFPorProfesor } from '@/utils/pdfGenerator';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import SolicitudForm from '@/components/SolicitudForm';
import CalendarioSemanal from '@/components/CalendarioSemanal';

export default function ProfesorDashboard() {
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
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

    // Escuchar solicitudes del profesor
    const q = query(
      collection(db, 'requests'),
      where('profesorId', '==', parsedUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Solicitudes recibidas:', snapshot.size);
      const solicitudesData = [];
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        console.log('📄 Solicitud:', data);
        solicitudesData.push(data);
      });
      setSolicitudes(solicitudesData);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error cargando solicitudes:', error);
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

  if (!user) return <Loading message="Cargando panel..." />;

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada').length;
  const horasSemanales = solicitudes
    .filter(s => s.estado === 'aprobada')
    .reduce((total, s) => {
      const inicio = parseInt(s.horaInicio.split(':')[0]);
      const fin = parseInt(s.horaFin.split(':')[0]);
      return total + (fin - inicio);
    }, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Panel</h1>
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
            <p className="text-4xl font-bold text-yellow-600">{pendientes}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Horarios Aprobados
            </h3>
            <p className="text-4xl font-bold text-green-600">{aprobadas}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-semibold mb-2">
              Horas Semanales
            </h3>
            <p className="text-4xl font-bold text-blue-600">{horasSemanales}h</p>
          </div>
        </div>

        {/* Exportar PDF */}
        {aprobadas > 0 && (
          <div className="bg-green-50 rounded-lg shadow p-4 mb-8 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Mi Horario en PDF</h3>
              <p className="text-sm text-gray-600">Descarga tu horario semanal</p>
            </div>
            <Button variant="primary" onClick={exportarMiHorario}>
              📄 Descargar Mi Horario
            </Button>
          </div>
        )}

        {/* Botón Nueva Solicitud */}
        <div className="mb-8">
          <Button 
            variant="primary" 
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : '+ Nueva Solicitud de Horario'}
          </Button>
        </div>

        {/* Formulario de solicitud */}
        {showForm && (
          <div className="mb-8">
            <SolicitudForm 
              userId={user.uid}
              userName={user.name}
              onSuccess={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Mis Solicitudes */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Mis Solicitudes</h2>
          
          {loading ? (
            <p className="text-gray-500">Cargando solicitudes...</p>
          ) : solicitudes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No tienes solicitudes aún. ¡Crea una!</p>
              <Button variant="primary" onClick={() => setShowForm(true)}>
                + Nueva Solicitud
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {solicitudes.map(solicitud => {
                // Formatear fecha de semana
                let semanaTexto = '';
                if (solicitud.semanaInicio) {
                  try {
                    let fecha;
                    if (solicitud.semanaInicio.toDate) {
                      fecha = solicitud.semanaInicio.toDate();
                    } else {
                      fecha = new Date(solicitud.semanaInicio);
                    }
                    semanaTexto = fecha.toLocaleDateString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    });
                  } catch (err) {
                    console.error('Error formateando fecha:', err);
                  }
                }

                return (
                  <div 
                    key={solicitud.id}
                    className={`border-l-4 pl-4 py-3 ${
                      solicitud.estado === 'pendiente' ? 'border-yellow-500 bg-yellow-50' :
                      solicitud.estado === 'aprobada' ? 'border-green-500 bg-green-50' :
                      'border-red-500 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {/* Semana */}
                        {semanaTexto && (
                          <p className="text-xs text-gray-500 mb-1">
                            📅 Semana del {semanaTexto}
                          </p>
                        )}
                        
                        {/* Día y Horario */}
                        <p className="font-semibold text-lg text-gray-900">
                          {solicitud.dia} {solicitud.horaInicio} - {solicitud.horaFin}
                        </p>
                        
                        {/* Tipo de clase */}
                        <p className="text-sm text-gray-600 capitalize">
                          Clase {solicitud.tipoClase}
                        </p>
                        
                        {/* Observaciones */}
                        {solicitud.observaciones && (
                          <p className="text-sm text-gray-500 mt-1">
                            📝 {solicitud.observaciones}
                          </p>
                        )}
                        
                        {/* Estado */}
                        <p className={`text-sm font-semibold mt-2 ${
                          solicitud.estado === 'pendiente' ? 'text-yellow-600' :
                          solicitud.estado === 'aprobada' ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {solicitud.estado === 'pendiente' && '⏳ Pendiente de aprobación'}
                          {solicitud.estado === 'aprobada' && `✓ Aprobada - Espacio ${solicitud.espacioAsignado}`}
                          {solicitud.estado === 'rechazada' && `✗ Rechazada${solicitud.notasAdmin ? ` - ${solicitud.notasAdmin}` : ''}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Calendario Semanal */}
        {aprobadas > 0 && (
          <div className="mt-8">
            <CalendarioSemanal 
              solicitudes={solicitudes}
              profesorView={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}
