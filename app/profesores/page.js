"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import NavBar from '@/components/NavBar';
import Loading from '@/components/ui/Loading';
import GestionUsuarios from '@/components/GestionUsuarios';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';


export default function ProfesoresPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  useSessionTimeout(60);

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
  }, [router]);

  if (!user) return <Loading message="Cargando profesores..." />;

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            👥 Gestión de Profesores
          </h1>
          <p className="text-gray-600">
            Administra los profesores registrados en el sistema
          </p>
        </div>

        <GestionUsuarios />
      </main>
    </div>
  );
}