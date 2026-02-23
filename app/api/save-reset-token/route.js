import { NextResponse } from 'next/server';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';

export async function POST(request) {
  try {
    const data = await request.json();

    await addDoc(collection(db, 'password_resets'), data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving reset token:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}