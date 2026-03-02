"use client"

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { obtenerInicioSemana, obtenerNumeroSemana, formatearSemana } from '@/utils/fechas';
import NavBar from '@/components/NavBar';
import Loading from '@/components/ui/Loading';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

export default function EspacioDetallePage() {
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActual, setSemanaActual] = useState(obtenerInicioSemana(new Date()));
  const router = useRouter();
  const params = useParams();
  const espacio = params.espacio;

  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const horas = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`);
  
  useSessionTimeout(30);
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
   // if (parsedUser.role !== 'master') {
      //router.push('/dashboard/profesor');
      //return;
   // }

    setUser(parsedUser);

    const unsubscribe = onSnapshot(
      collection(db, 'requests'),
      (snapshot) => {
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setSolicitudes(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  const semanaAnterior = () => {
    const nueva = new Date(semanaActual);
    nueva.setDate(nueva.getDate() - 7);
    setSemanaActual(nueva);
  };

  const semanaSiguiente = () => {
    const nueva = new Date(semanaActual);
    nueva.setDate(nueva.getDate() + 7);
    setSemanaActual(nueva);
  };

  const semanaHoy = () => {
    setSemanaActual(obtenerInicioSemana(new Date()));
  };

  if (!user) return <Loading message="Cargando espacio..." />;

  const semanaId = obtenerNumeroSemana(semanaActual);
  const solicitudesEspacio = solicitudes.filter(s =>
    s.espacioAsignado === espacio &&
    s.estado === 'aprobada' &&
    s.semanaId === semanaId
  );

  // Función para obtener clase en un día/hora específico
  const getClase = (dia, hora) => {
    return solicitudesEspacio.find(s => {
      if (s.dia !== dia) return false;
      const horaNum = parseInt(hora.split(':')[0]);
      const inicioNum = parseInt(s.horaInicio.split(':')[0]);
      const finNum = parseInt(s.horaFin.split(':')[0]);
      return horaNum >= inicioNum && horaNum < finNum;
    });
  };

  // Calcular estadísticas
  const totalHoras = solicitudesEspacio.reduce((total, s) => {
    const inicio = parseInt(s.horaInicio.split(':')[0]);
    const fin = parseInt(s.horaFin.split(':')[0]);
    return total + (fin - inicio);
  }, 0);

  const totalClases = solicitudesEspacio.length;

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/espacios')}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              ← Volver a Espacios
            </button>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏫 Espacio {espacio}
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Clases esta semana</p>
              <p className="text-3xl font-bold text-blue-600">{totalClases}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Horas ocupadas</p>
              <p className="text-3xl font-bold text-green-600">{totalHoras}h</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Horas disponibles</p>
              <p className="text-3xl font-bold text-purple-600">{60 - totalHoras}h</p>
            </div>
          </div>
        </div>

        {/* Navegación de semana */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={semanaAnterior}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold text-blue-600"
            >
              ← Semana anterior
            </button>

            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">
                {formatearSemana(semanaActual)}
              </p>
              <button
                onClick={semanaHoy}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Ir a esta semana
              </button>
            </div>

            <button
              onClick={semanaSiguiente}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold text-blue-600"
            >
              Semana siguiente →
            </button>
          </div>
        </div>

        {/* Calendario del espacio */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-4 py-3 text-left font-semibold w-20">Hora</th>
                  {dias.map(dia => (
                    <th key={dia} className="px-4 py-3 text-center font-semibold">
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {horas.map((hora, idx) => (
                  <tr key={hora} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-sm">
                      {hora}
                    </td>
                    {dias.map(dia => {
                      const clase = getClase(dia, hora);
                      return (
                        <td key={dia} className="px-2 py-2 text-center">
                          {clase ? (
                            <div className="bg-blue-100 border border-blue-300 rounded p-2">
                              <p className="text-xs font-bold text-blue-900">
                                {clase.profesorName}
                              </p>
                              <p className="text-xs text-blue-700">
                                {clase.horaInicio}-{clase.horaFin}
                              </p>
                              <p className="text-xs text-blue-600 capitalize">
                                {clase.tipoClase}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-green-50 rounded p-2 text-xs text-green-600">
                              Libre
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de clases */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Clases Programadas
          </h2>

          {solicitudesEspacio.length === 0 ? (
            <p className="text-gray-500">No hay clases programadas para esta semana</p>
          ) : (
            <div className="space-y-3">
              {solicitudesEspacio
                .sort((a, b) => {
                  const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  return diasOrden.indexOf(a.dia) - diasOrden.indexOf(b.dia);
                })
                .map(clase => (
                  <div
                    key={clase.id}
                    className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50"
                  >
                    <p className="font-bold text-gray-900">{clase.profesorName}</p>
                    <p className="text-sm text-gray-600">
                      {clase.dia} · {clase.horaInicio} - {clase.horaFin} · 
                      <span className="capitalize"> {clase.tipoClase}</span>
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}