"use client"

import { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/app/firebase';

export function useLogoutOnClose() {
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Cerrar sesión al cerrar ventana
      localStorage.removeItem('user');
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Error:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}