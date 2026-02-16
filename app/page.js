"use client"

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">
          🎵 Sistema Orquesta Sinfónica de Mérida
        </h1>
        <p className="text-2xl mb-8">
          Gestión de Espacios y Horarios
        </p>
        
        <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <p className="text-xl mb-4">Características:</p>
          <ul className="text-lg space-y-2">
            <li>✓ Solicitud de horarios por profesores</li>
            <li>✓ Aprobación y asignación de espacios</li>
            <li>✓ Calendario semanal visual</li>
            <li>✓ Control de conflictos automático</li>
          </ul>
        </div>
        
        <Button 
          variant="primary"
          onClick={() => router.push('/login')}
        >
          Iniciar Sesión
        </Button>
      </div>
    </main>
  );
}

