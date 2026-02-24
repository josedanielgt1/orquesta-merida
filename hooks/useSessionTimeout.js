"use client"

import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';
import { useRouter } from 'next/navigation';

export function useSessionTimeout(timeoutMinutes = 30) {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isLoggingOutRef = useRef(false);

  const logout = async () => {
    // Evitar múltiples logouts simultáneos
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      await signOut(auth);
      localStorage.removeItem('user');
      localStorage.removeItem('lastActivity');
      router.push('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const resetTimeout = () => {
    lastActivityRef.current = Date.now();
    localStorage.setItem('lastActivity', Date.now().toString());
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const userData = localStorage.getItem('user');
      // Solo cerrar sesión si realmente hay usuario logueado
      if (userData) {
        alert('Tu sesión ha expirado por inactividad');
        logout();
      }
    }, timeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    // Verificar si hay usuario logueado
    const userData = localStorage.getItem('user');
    if (!userData) {
      return; // No hacer nada si no hay sesión
    }

    // Eventos que resetean el timeout
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimeout();
    };

    // Al montar, verificar última actividad
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity);
      const minutesElapsed = elapsed / (1000 * 60);
      
      if (minutesElapsed > timeoutMinutes) {
        // Sesión expirada
        alert('Tu sesión ha expirado');
        logout();
        return;
      }
    }

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

  // Manejar cambio de pestaña/visibilidad
  useEffect(() => {
    const handleVisibilityChange = () => {
      const userData = localStorage.getItem('user');
      if (!userData) return;

      if (document.hidden) {
        // Usuario cambió de pestaña
        localStorage.getItem('lastActivity', Date.now().toString());
      } else {
        // Usuario volvió a la pestaña
        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity);
          const minutesElapsed = elapsed / (1000 * 60);
          
          if (minutesElapsed > timeoutMinutes) {
            alert('Tu sesión ha expirado');
            logout();
          } else {
            resetTimeout();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timeoutMinutes]);
}