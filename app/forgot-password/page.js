"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
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
      // Verificar si el usuario existe
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );

      const snapshot = await getDocs(usersQuery);

      if (snapshot.empty) {
        setModal({
          isOpen: true,
          title: 'Email no encontrado',
          message: 'No existe un usuario registrado con este email.',
          type: 'error'
        });
        setLoading(false);
        return;
      }

      const userData = snapshot.docs[0].data();

      // Generar token único
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Guardar token en Firestore
      const resetDoc = {
        email: email,
        token: token,
        usado: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
      };

      await fetch('/api/save-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetDoc)
      });

      // Enviar email
      const enlaceReset = `${window.location.origin}/reset-password/${token}`;

      const htmlEmail = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔑 Recuperar Contraseña</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; margin-top: 0;">Hola <strong>${userData.name}</strong>,</p>
            
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en el sistema de gestión de espacios de la <strong>Orquesta Sinfónica de Mérida</strong>.</p>
            
            <p>Para crear una nueva contraseña, haz click en el siguiente botón:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${enlaceReset}" 
                 style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Restablecer Contraseña
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">O copia y pega este enlace en tu navegador:</p>
            <p style="font-size: 12px; background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
              ${enlaceReset}
            </p>
            
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #991b1b;">
                ⚠️ <strong>Importante:</strong> Este enlace expira en 1 hora.
              </p>
            </div>
            
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 0; font-size: 14px; color: #1e40af;">
                💡 Si no solicitaste este cambio, ignora este email. Tu contraseña permanecerá sin cambios.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              🎼 Orquesta Sinfónica de Mérida<br>
              Sistema de Gestión de Espacios
            </p>
          </div>
        </body>
        </html>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: '🔑 Recuperar Contraseña - Orquesta Sinfónica de Mérida',
          html: htmlEmail
        })
      });

      const result = await response.json();

      if (result.success) {
        setModal({
          isOpen: true,
          title: '✅ Email enviado',
          message: `Se ha enviado un enlace de recuperación a ${email}.\n\nRevisa tu bandeja de entrada y sigue las instrucciones.`,
          type: 'success'
        });
        
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        throw new Error(result.error);
      }

    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo enviar el email de recuperación. Intenta de nuevo.',
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