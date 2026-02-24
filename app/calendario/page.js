"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { obtenerInicioSemana, obtenerNumeroSemana } from '@/utils/fechas';
import NavBar from '@/components/NavBar';
import Loading from '@/components/ui/Loading';
import CalendarioSemanal from '@/components/CalendarioSemanal';
import SelectorSemana from '@/components/SelectorSemana';

export default function CalendarioPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActual, setSemanaActual] = useState(obtenerInicioSemana(new Date()));
  const router = useRouter();

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
    setUser(parsedUser);

    const unsubscribe = onSnapshot(
      collection(db, 'requests'),
      (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setSolicitudes(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error:', error);
        if (error.code === 'permission-denied') {
          localStorage.removeItem('user');
          router.push('/login');
        }
      }
    );

    return () => unsubscribe();
  }, [router, mounted]);

  if (!mounted || !user) return <Loading message="Cargando calendario..." />;

  const semanaId = obtenerNumeroSemana(semanaActual);
  const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📅 Calendario</h1>
          <p className="text-gray-600">
            Visualiza todas las clases aprobadas de la semana
          </p>
        </div>

        <SelectorSemana
          semanaActual={semanaActual}
          onCambiarSemana={setSemanaActual}
        />

        {loading ? (
          <Loading message="Cargando horarios..." />
        ) : (
          <CalendarioSemanal
            solicitudes={solicitudesSemana}
            profesorView={user.role === 'profesor'}
          />
        )}
      </main>
    </div>
  );
}