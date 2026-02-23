"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/app/firebase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setModal({
        isOpen: true,
        title: 'Email requerido',
        message: 'Por favor ingresa tu email.',
        type: 'warning'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModal({
        isOpen: true,
        title: 'Email inválido',
        message: 'Por favor ingresa un email válido.',
        type: 'warning'
      });
      return;
    }

    setLoading(true);

    try {
      // Usar el método nativo de Firebase
      await sendPasswordResetEmail(auth, email);

      setModal({
        isOpen: true,
        title: '✅ Email enviado',
        message: `Se ha enviado un enlace de recuperación a ${email}.\n\nRevisa tu bandeja de entrada (y spam) y sigue las instrucciones de Firebase.`,
        type: 'success'
      });
      
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err) {
      console.error('Error:', err);
      
      let errorMessage = 'No se pudo enviar el email de recuperación.';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No existe un usuario con este email.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intenta más tarde.';
      }
      
      setModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Recuperar Contraseña
          </h1>
          <p className="text-gray-600">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Enviando...' : '📧 Enviar Enlace de Recuperación'}
          </Button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full py-2 text-gray-600 text-sm hover:text-gray-800 font-semibold"
          >
            ← Volver al inicio de sesión
          </button>
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