"use client"

import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';
import { useRouter } from 'next/navigation';

export function useSessionTimeout(timeoutMinutes = 30) {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      router.push('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const resetTimeout = () => {
    lastActivityRef.current = Date.now();
    
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Crear nuevo timeout
    timeoutRef.current = setTimeout(() => {
      alert('Tu sesión ha expirado por inactividad');
      logout();
    }, timeoutMinutes * 60 * 1000); // Convertir minutos a milisegundos
  };

  useEffect(() => {
    // Eventos que resetean el timeout
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimeout();
    };

    // Iniciar timeout
    resetTimeout();

    // Escuchar eventos de actividad
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMinutes]);

  // Cerrar sesión al cerrar ventana/pestaña
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Guardar timestamp de última actividad
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Usuario cambió de pestaña o minimizó
        localStorage.setItem('lastActivity', Date.now().toString());
      } else {
        // Usuario volvió a la pestaña
        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity);
          const minutesElapsed = elapsed / (1000 * 60);
          
          // Si pasaron más de X minutos, cerrar sesión
          if (minutesElapsed > timeoutMinutes) {
            alert('Tu sesión ha expirado');
            logout();
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timeoutMinutes]);
}