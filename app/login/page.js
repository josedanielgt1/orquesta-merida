"use client"

import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Obtener información del usuario de Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'profesor' && userData.activo === false) {
          await signOut (auth);
          setError('Tu cuenta ha sido desactivada. Contacta al administrador');
          
          setLoading (false);
          return;

        }
        
        // 3. Guardar datos en localStorage
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: userData.name,
          role: userData.role
        }));

        // 4. Redirigir según el rol
        if (userData.role === 'master') {
          router.push('/dashboard/master');
        } else if (userData.role === 'profesor') {
          router.push('/dashboard/profesor');
        }
      } else {
        setError('Usuario no encontrado en la base de datos');
      }

    } catch (err) {
      console.error('Error:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('Email o contraseña incorrectos');
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuario no encontrado');
      } else if (err.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta');
      } else {
        setError('Error al iniciar sesión: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <Card title="Sistema Orquesta Sinfónica">
        <form onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <Input
            label="Correo Electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@orquesta.com"
            required
          />
          
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div className="mb-6 text-sm text-gray-600">
            <p>Usuarios de prueba:</p>
            <p>Master: master@orquesta.com / Master123</p>
            <p>Profesor: profesor@orquesta.com / Profesor123</p>
          </div>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        </form>
      </Card>
    </div>
  );
}