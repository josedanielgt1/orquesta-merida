"use client"

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { auth, db } from '@/app/firebase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function ResetPasswordPage() {
  const [resetData, setResetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  useEffect(() => {
    verificarToken();
  }, [token]);

  const verificarToken = async () => {
    try {
      const q = query(
        collection(db, 'password_resets'),
        where('token', '==', token)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Enlace de recuperación no válido o expirado.');
        setLoading(false);
        return;
      }

      const resetDoc = snapshot.docs[0];
      const data = resetDoc.data();

      // Verificar si ya fue usado
      if (data.usado) {
        setError('Este enlace ya fue utilizado.');
        setLoading(false);
        return;
      }

      // Verificar si expiró
      const ahora = new Date();
      const expira = data.expiresAt.toDate();
      
      if (ahora > expira) {
        setError('Este enlace ha expirado. Solicita uno nuevo.');
        setLoading(false);
        return;
      }

      setResetData({ id: resetDoc.id, ...data });
      setLoading(false);

    } catch (err) {
      console.error('Error:', err);
      setError('Error al verificar el enlace.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setModal({
        isOpen: true,
        title: 'Contraseña muy corta',
        message: 'La contraseña debe tener al menos 6 caracteres.',
        type: 'warning'
      });
      return;
    }

    if (password !== confirmPassword) {
      setModal({
        isOpen: true,
        title: 'Contraseñas no coinciden',
        message: 'Las contraseñas ingresadas no coinciden.',
        type: 'warning'
      });
      return;
    }

    setLoading(true);

    try {
      // Obtener datos del usuario
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', resetData.email)
      );

      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        throw new Error('Usuario no encontrado');
      }

      const userData = usersSnapshot.docs[0].data();

      // Necesitamos autenticar temporalmente al usuario para cambiar su contraseña
      // Firebase requiere que el usuario esté autenticado para cambiar su contraseña
      
      // Usar la API de Firebase Admin (requiere configuración adicional)
      // Por ahora, usaremos el método de Firebase Auth directamente
      
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetData.email,
          newPassword: password
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      // Marcar token como usado
      await updateDoc(doc(db, 'password_resets', resetData.id), {
        usado: true,
        fechaUso: new Date()
      });

      setModal({
        isOpen: true,
        title: '✅ Contraseña actualizada',
        message: 'Tu contraseña ha sido cambiada exitosamente.\n\nSerás redirigido al inicio de sesión.',
        type: 'success'
      });

      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo cambiar la contraseña. Intenta de nuevo.',
        type: 'error'
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Enlace no válido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button variant="primary" onClick={() => router.push('/forgot-password')}>
            Solicitar nuevo enlace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Nueva Contraseña
          </h1>
          <p className="text-gray-600">
            Crea una nueva contraseña para tu cuenta
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Email:</strong> {resetData.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nueva contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirmar contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Cambiando contraseña...' : '🔑 Cambiar Contraseña'}
          </Button>
        </form>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({...modal, isOpen: false})}
        title={modal.title}
        type={modal.type}
      >
        <p className="whitespace-pre-line">{modal.message}</p>
      </Modal>
    </div>
  );
}