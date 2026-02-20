"use client"

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/app/firebase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function RegistroPage() {
  const [invitacion, setInvitacion] = useState(null);
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
        collection(db, 'invitations'),
        where('token', '==', token)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Invitación no válida o expirada.');
        setLoading(false);
        return;
      }

      const invData = snapshot.docs[0].data();
      const invId = snapshot.docs[0].id;

      // Verificar si ya fue usada
      if (invData.usado) {
        setError('Esta invitación ya fue utilizada.');
        setLoading(false);
        return;
      }

      // Verificar si expiró
      const ahora = new Date();
      const expira = invData.expira.toDate();
      
      if (ahora > expira) {
        setError('Esta invitación ha expirado.');
        setLoading(false);
        return;
      }

      setInvitacion({ ...invData, id: invId });
      setLoading(false);

    } catch (err) {
      console.error('Error:', err);
      setError('Error al verificar la invitación.');
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
      // Crear usuario en Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        invitacion.email,
        password
      );

      const uid = userCredential.user.uid;

      // Crear documento en Firestore
      await setDoc(doc(db, 'users', uid), {
        email: invitacion.email,
        name: invitacion.name,
        role: 'profesor',
        activo: true,
        fechaCreacion: new Date()
      });

      // Marcar invitación como usada
      await updateDoc(doc(db, 'invitations', invitacion.id), {
        usado: true,
        fechaUso: new Date()
      });

      setModal({
        isOpen: true,
        title: '✅ Cuenta creada exitosamente',
        message: 'Tu cuenta ha sido creada. Serás redirigido al inicio de sesión.',
        type: 'success'
      });

      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err) {
      console.error('Error:', err);
      
      let errorMessage = 'Error al crear la cuenta.';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado.';
      }

      setModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
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
          <p className="text-gray-600">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitación no válida</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button variant="primary" onClick={() => router.push('/login')}>
            Ir al inicio de sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎼</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenido a la Orquesta
          </h1>
          <p className="text-gray-600">Completa tu registro</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Nombre:</strong> {invitacion.name}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Email:</strong> {invitacion.email}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Crear contraseña <span className="text-red-500">*</span>
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
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({...modal, isOpen: false})}
        title={modal.title}
        type={modal.type}
      >
        <p>{modal.message}</p>
      </Modal>
    </div>
  );
}