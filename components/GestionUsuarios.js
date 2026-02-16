"use client"

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '@/app/firebase';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

export default function GestionUsuarios() {
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nuevoProfesor, setNuevoProfesor] = useState({
    name: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    cargarProfesores();
  }, []);

  const cargarProfesores = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const profes = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.role === 'profesor') {
          profes.push({ id: doc.id, ...data });
        }
      });
      setProfesores(profes);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const crearProfesor = async (e) => {
    e.preventDefault();
    
    const confirmar = window.confirm(
      '⚠️ IMPORTANTE:\n\n' +
      'Para crear un nuevo profesor, tu sesión se cerrará temporalmente.\n' +
      'Después de crear el profesor, tendrás que volver a iniciar sesión.\n\n' +
      '¿Continuar?'
    );
    
    if (!confirmar) return;
    
    setLoading(true);

    try {
      // Guardar credenciales del master actual
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const masterEmail = currentUser.email;
      
      // Cerrar sesión del master
      await signOut(auth);
      localStorage.removeItem('user');
      
      // Crear nuevo usuario
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        nuevoProfesor.email,
        nuevoProfesor.password
      );

      const uid = userCredential.user.uid;

      // Crear documento en Firestore
      await setDoc(doc(db, 'users', uid), {
        email: nuevoProfesor.email,
        name: nuevoProfesor.name,
        role: 'profesor',
        activo: true,
        fechaCreacion: new Date()
      });

      // Cerrar sesión del nuevo usuario
      await signOut(auth);

      alert(
        '✅ Profesor creado exitosamente\n\n' +
        `Nombre: ${nuevoProfesor.name}\n` +
        `Email: ${nuevoProfesor.email}\n\n` +
        'Ahora debes iniciar sesión nuevamente como administrador.'
      );
      
      // Redirigir al login
      window.location.href = '/login';

    } catch (err) {
      console.error('Error:', err);
      if (err.code === 'auth/email-already-in-use') {
        alert('❌ Este email ya está registrado');
      } else {
        alert('❌ Error al crear profesor: ' + err.message);
      }
      
      // Si hubo error, redirigir al login de todos modos
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (profesorId, activoActual) => {
    const confirmar = window.confirm(
      activoActual 
        ? '¿Desactivar este profesor? No podrá iniciar sesión.'
        : '¿Reactivar este profesor?'
    );

    if (!confirmar) return;

    try {
      await updateDoc(doc(db, 'users', profesorId), {
        activo: !activoActual
      });
      
      alert(activoActual ? 'Profesor desactivado' : 'Profesor reactivado');
      cargarProfesores();
    } catch (err) {
      console.error('Error:', err);
      alert('Error al actualizar profesor');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Profesores</h2>
        <Button 
          variant="primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : '+ Nuevo Profesor'}
        </Button>
      </div>

      {/* Formulario nuevo profesor */}
      {showForm && (
        <Card title="Crear Nuevo Profesor">
          <form onSubmit={crearProfesor} className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Nota importante:</strong> Al crear un nuevo profesor, tu sesión se cerrará 
                automáticamente y tendrás que volver a iniciar sesión como administrador.
              </p>
            </div>

            <Input
              label="Nombre completo"
              type="text"
              value={nuevoProfesor.name}
              onChange={(e) => setNuevoProfesor({...nuevoProfesor, name: e.target.value})}
              placeholder="Ej: María García"
              required
            />

            <Input
              label="Email"
              type="email"
              value={nuevoProfesor.email}
              onChange={(e) => setNuevoProfesor({...nuevoProfesor, email: e.target.value})}
              placeholder="profesor@orquesta.com"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              value={nuevoProfesor.password}
              onChange={(e) => setNuevoProfesor({...nuevoProfesor, password: e.target.value})}
              placeholder="Mínimo 6 caracteres"
              required
            />

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Profesor'}
            </Button>
          </form>
        </Card>
      )}

      {/* Lista de profesores */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Profesores Registrados ({profesores.length})
        </h3>

        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : profesores.length === 0 ? (
          <p className="text-gray-500">No hay profesores registrados</p>
        ) : (
          <div className="space-y-3">
            {profesores.map(profesor => (
              <div 
                key={profesor.id}
                className={`border rounded-lg p-4 flex justify-between items-center ${
                  profesor.activo === false ? 'bg-gray-100 opacity-60' : 'bg-white'
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {profesor.name}
                    {profesor.activo === false && (
                      <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        DESACTIVADO
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">{profesor.email}</p>
                  {profesor.fechaCreacion && (
                    <p className="text-xs text-gray-500 mt-1">
                      Creado: {new Date(profesor.fechaCreacion.seconds * 1000).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>

                <Button
                  variant={profesor.activo === false ? 'primary' : 'secondary'}
                  onClick={() => toggleActivo(profesor.id, profesor.activo !== false)}
                >
                  {profesor.activo === false ? 'Reactivar' : 'Desactivar'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}