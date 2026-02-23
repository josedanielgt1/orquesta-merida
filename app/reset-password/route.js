import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Inicializar Firebase Admin (solo si no está inicializado)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      })
    });
  } catch (error) {
    console.log('Firebase admin initialization error', error);
  }
}

export async function POST(request) {
  try {
    const { email, newPassword } = await request.json();

    // Obtener el usuario por email
    const user = await admin.auth().getUserByEmail(email);

    // Actualizar contraseña
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}