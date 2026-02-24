"use client"

import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';

export default function NavBar({ user }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('user');
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      router.push('/login');
    }
  };

  // Navegación según el rol
  const navItems = user?.role === 'master' 
    ? [
        { label: '📊 Dashboard', href: '/dashboard/master' },
        { label: '🏫 Espacios', href: '/espacios' },
        { label: '👥 Profesores', href: '/profesores' },
      ]
    : [
        { label: '📊 Mi Dashboard', href: '/dashboard/profesor' },
      ];

  // Texto del rol
  const rolTexto = user?.role === 'master' ? 'Administrador' : 'Profesor';

  return (
    <header className="bg-white shadow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎼</span>
            <div>
              <p className="font-bold text-gray-900 leading-tight">Orquesta Sinfónica</p>
              <p className="text-xs text-gray-500 leading-tight">de Mérida</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map(item => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pathname === item.href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Usuario y Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{rolTexto}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex gap-2 pb-3 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}