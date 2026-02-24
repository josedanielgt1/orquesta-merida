"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { obtenerInicioSemana, obtenerNumeroSemana } from '@/utils/fechas';
import NavBar from '@/components/NavBar';
import Loading from '@/components/ui/Loading';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

export default function EspaciosPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActual] = useState(obtenerInicioSemana(new Date()));
  const router = useRouter();
  useSessionTimeout(60);
  // Generar lista de espacios ORDENADOS
  const espacios = [];
  for (let i = 1; i <= 46; i++) {
    if ([35, 37, 38, 39, 40].includes(i)) continue;
    espacios.push(`E${i}`);
  }
  espacios.push('E11A', 'E25A', 'E25B', 'E25C');
  
  // Ordenamiento natural
  espacios.sort((a, b) => {
    const numA = parseInt(a.substring(1));
    const numB = parseInt(b.substring(1));
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });

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
    if (parsedUser.role !== 'master') {
      router.push('/dashboard/profesor');
      return;
    }

    setUser(parsedUser);

    const unsubscribe = onSnapshot(
      collection(db, 'requests'),
      (snapshot) => {
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setSolicitudes(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error al escuchar solicitudes:', error);
        if (error.code === 'permission-denied') {
          localStorage.removeItem('user');
          router.push('/login');
        }
      }
    );

    return () => unsubscribe();
  }, [router, mounted]);

  if (!mounted || !user) return <Loading message="Cargando espacios..." />;

  // Calcular ocupación de cada espacio esta semana
  const semanaId = obtenerNumeroSemana(semanaActual);
  const aprobadas = solicitudes.filter(s => 
    s.estado === 'aprobada' && s.semanaId === semanaId
  );

  const getOcupacionEspacio = (espacio) => {
    return aprobadas.filter(s => s.espacioAsignado === espacio);
  };

  const getColorEspacio = (espacio) => {
    const ocupacion = getOcupacionEspacio(espacio).length;
    if (ocupacion === 0) return 'bg-green-50 border-green-300 hover:bg-green-100';
    if (ocupacion <= 2) return 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100';
    return 'bg-red-50 border-red-300 hover:bg-red-100';
  };

  const getTextColorEspacio = (espacio) => {
    const ocupacion = getOcupacionEspacio(espacio).length;
    if (ocupacion === 0) return 'text-green-800';
    if (ocupacion <= 2) return 'text-yellow-800';
    return 'text-red-800';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏫 Espacios</h1>
          <p className="text-gray-600">
            Click en un espacio para ver su horario completo
          </p>

          {/* Leyenda */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 rounded border border-green-400"></div>
              <span className="text-sm text-gray-600">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 rounded border border-yellow-400"></div>
              <span className="text-sm text-gray-600">Parcialmente ocupado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 rounded border border-red-400"></div>
              <span className="text-sm text-gray-600">Muy ocupado</span>
            </div>
          </div>
        </div>

        {/* Grid de espacios */}
        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {espacios.map(espacio => {
              const ocupacion = getOcupacionEspacio(espacio);
              
              return (
                <button
                  key={espacio}
                  onClick={() => router.push(`/espacios/${espacio}`)}
                  className={`border-2 rounded-lg p-3 text-center transition-all cursor-pointer ${getColorEspacio(espacio)}`}
                >
                  <p className={`font-bold text-lg ${getTextColorEspacio(espacio)}`}>
                    {espacio}
                  </p>
                  <p className={`text-xs mt-1 ${getTextColorEspacio(espacio)}`}>
                    {ocupacion.length === 0 ? 'Libre' : `${ocupacion.length} clase${ocupacion.length > 1 ? 's' : ''}`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}