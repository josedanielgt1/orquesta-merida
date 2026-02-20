"use client"

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Si ya está logueado, redirigir
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'master') {
        router.push('/dashboard/master');
      } else {
        router.push('/dashboard/profesor');
      }
    }
  }, [router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎼</span>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">Orquesta Sinfónica</h1>
              <p className="text-xs text-gray-600 leading-tight">de Mérida</p>
            </div>
          </div>
          
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-white text-blue-600 rounded-full font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Iniciar Sesión
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-20">
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <div className="text-8xl mb-4 animate-bounce">🎼</div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Sistema de Gestión
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              de Espacios
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Administra los espacios de la Orquesta Sinfónica de Mérida de forma eficiente y profesional
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Comenzar →
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Solicitudes Inteligentes
            </h3>
            <p className="text-gray-600">
              Crea solicitudes por rango de fechas y múltiples días. El sistema valida conflictos automáticamente.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="text-5xl mb-4">📧</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Notificaciones por Email
            </h3>
            <p className="text-gray-600">
              Recibe emails cuando tus solicitudes sean aprobadas o rechazadas. Mantente siempre informado.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Visualización Clara
            </h3>
            <p className="text-gray-600">
              Calendarios semanales, ocupación de espacios en tiempo real y exportación a PDF.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="text-5xl mb-4">🏫</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              45+ Espacios
            </h3>
            <p className="text-gray-600">
              Gestiona todos los espacios de la orquesta desde un solo lugar. Búsqueda y filtrado avanzado.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Gestión de Usuarios
            </h3>
            <p className="text-gray-600">
              Invita profesores por email con registro seguro. Activa o inactiva usuarios fácilmente.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              PWA Instalable
            </h3>
            <p className="text-gray-600">
              Instala la app en tu celular o computadora. Funciona como una aplicación nativa.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white shadow-2xl">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para optimizar tu gestión de espacios?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Únete a la Orquesta Sinfónica de Mérida en la era digital
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-10 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            Iniciar Sesión →
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
            <div className="text-gray-600">
          <p className="text-sm font-semibold">
            © 2026 Orquesta Sinfónica de Mérida - Sistema de Gestión de Espacios
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Desarrollado con ❤️ para la música
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Creado por Josedaniel Guerrero
            <br />
            <a
            href="josedanielgt1@gmail.com"
             className="text-blue-600 hover:text-blue-800"
             >
              josedanielgt1@gmail.com
             </a>
          </p>
        </div>
       </div>
      </div>  
      </footer>
    </div>
  );
}