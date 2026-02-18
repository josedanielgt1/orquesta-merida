"use client"

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { obtenerInicioSemana, obtenerNumeroSemana, formatearSemana } from '@/utils/fechas';
import Button from './ui/Button';
import Card from './ui/Card';
import Modal from './ui/Modal';

export default function GestionSemanas({ semanaActual, onActualizar }) {
  const [loading, setLoading] = useState(false);
  const [comparacion, setComparacion] = useState(null);
  const [showComparacion, setShowComparacion] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    onConfirm: null
  });

  const semanaAnterior = new Date(semanaActual);
  semanaAnterior.setDate(semanaAnterior.getDate() - 7);
  const semanaAnteriorId = obtenerNumeroSemana(semanaAnterior);
  const semanaActualId = obtenerNumeroSemana(semanaActual);

  const compararSemanas = async () => {
    setLoading(true);
    try {
      const qAnterior = query(
        collection(db, 'requests'),
        where('semanaId', '==', semanaAnteriorId),
        where('estado', '==', 'aprobada')
      );

      const qActual = query(
        collection(db, 'requests'),
        where('semanaId', '==', semanaActualId)
      );

      const [snapshotAnterior, snapshotActual] = await Promise.all([
        getDocs(qAnterior),
        getDocs(qActual)
      ]);

      const solicitudesAnterior = [];
      snapshotAnterior.forEach(doc => {
        solicitudesAnterior.push({ id: doc.id, ...doc.data() });
      });

      const solicitudesActual = [];
      snapshotActual.forEach(doc => {
        solicitudesActual.push({ id: doc.id, ...doc.data() });
      });

      const conflictos = [];
      const copiables = solicitudesAnterior.filter(anterior => {
        const tieneConflicto = solicitudesActual.some(actual => {
          if (actual.dia !== anterior.dia) return false;
          if (actual.espacioAsignado !== anterior.espacioAsignado) return false;

          return (
            (anterior.horaInicio >= actual.horaInicio && anterior.horaInicio < actual.horaFin) ||
            (anterior.horaFin > actual.horaInicio && anterior.horaFin <= actual.horaFin) ||
            (anterior.horaInicio <= actual.horaInicio && anterior.horaFin >= actual.horaFin)
          );
        });

        if (tieneConflicto) {
          conflictos.push(anterior);
        }

        return !tieneConflicto;
      });

      setComparacion({
        anterior: solicitudesAnterior.length,
        actual: solicitudesActual.length,
        copiables: copiables.length,
        conflictos: conflictos.length,
        detalleCopiables: copiables,
        detalleConflictos: conflictos
      });

      setShowComparacion(true);

    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Error al comparar semanas. Por favor intenta de nuevo.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    } finally {
      setLoading(false);
    }
  };

  const copiarSemana = async () => {
    if (!comparacion || comparacion.copiables === 0) {
      setModal({
        isOpen: true,
        title: 'No hay solicitudes para copiar',
        message: 'No hay solicitudes sin conflictos que se puedan copiar a esta semana.',
        type: 'warning',
        showCancel: false,
        onConfirm: null
      });
      return;
    }

    setModal({
      isOpen: true,
      title: '¿Confirmar copia de semana?',
      message: `Se copiarán ${comparacion.copiables} solicitudes de la semana anterior a esta semana.\n\n${comparacion.conflictos > 0 ? `⚠️ ${comparacion.conflictos} solicitudes se omitirán por conflictos.` : ''}`,
      type: 'confirm',
      showCancel: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const promesas = comparacion.detalleCopiables.map(solicitud =>
            addDoc(collection(db, 'requests'), {
              profesorId: solicitud.profesorId,
              profesorName: solicitud.profesorName,
              dia: solicitud.dia,
              horaInicio: solicitud.horaInicio,
              horaFin: solicitud.horaFin,
              tipoClase: solicitud.tipoClase,
              observaciones: solicitud.observaciones || '',
              estado: 'aprobada',
              espacioAsignado: solicitud.espacioAsignado,
              fechaSolicitud: serverTimestamp(),
              fechaAprobacion: serverTimestamp(),
              semanaId: semanaActualId,
              semanaInicio: semanaActual,
              copiadaDeSemana: semanaAnteriorId
            })
          );

          await Promise.all(promesas);

          setModal({
            isOpen: true,
            title: '✅ Semana copiada exitosamente',
            message: `Se copiaron ${comparacion.copiables} solicitudes.\n${comparacion.conflictos > 0 ? `\n${comparacion.conflictos} solicitudes se omitieron por conflictos.` : ''}`,
            type: 'success',
            showCancel: false,
            onConfirm: () => {
              setShowComparacion(false);
              setComparacion(null);
              if (onActualizar) onActualizar();
            }
          });

        } catch (err) {
          console.error('Error:', err);
          setModal({
            isOpen: true,
            title: 'Error al copiar',
            message: 'Ocurrió un error al copiar la semana. Por favor intenta de nuevo.',
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const limpiarSemana = async () => {
    setModal({
      isOpen: true,
      title: '⚠️ ¿Limpiar toda la semana?',
      message: 'Esta acción eliminará TODAS las solicitudes aprobadas de esta semana. Esta acción no se puede deshacer.',
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const q = query(
            collection(db, 'requests'),
            where('semanaId', '==', semanaActualId)
          );

          const snapshot = await getDocs(q);
          const promesas = [];
          
          snapshot.forEach(doc => {
            promesas.push(doc.ref.delete());
          });

          await Promise.all(promesas);

          setModal({
            isOpen: true,
            title: '✅ Semana limpiada',
            message: 'Se eliminaron todas las solicitudes de esta semana.',
            type: 'success',
            showCancel: false,
            onConfirm: () => {
              if (onActualizar) onActualizar();
            }
          });

        } catch (err) {
          console.error('Error:', err);
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'Error al limpiar la semana. Por favor intenta de nuevo.',
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <>
      <Card title="Gestión de Semanas">
        <div className="space-y-4">
          
          {/* Comparar semanas */}
          <div>
            <Button
              variant="secondary"
              onClick={compararSemanas}
              disabled={loading}
            >
              {loading ? 'Cargando...' : '📊 Comparar Semanas'}
            </Button>
            <p className="text-sm text-gray-600 mt-2">
              Compara la semana anterior con la actual para ver qué se puede copiar
            </p>
          </div>

          {/* Resultados de comparación */}
          {showComparacion && comparacion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <h3 className="font-bold text-blue-900 mb-3">📋 COMPARACIÓN DE SEMANAS</h3>
              
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  <strong>Semana anterior:</strong> {comparacion.anterior} solicitudes aprobadas
                </p>
                <p className="text-gray-700">
                  <strong>Semana actual:</strong> {comparacion.actual} solicitudes aprobadas
                </p>
                <hr className="my-3 border-blue-200" />
                <p className="text-green-700 font-semibold">
                  ✅ Se copiarían: {comparacion.copiables} solicitudes
                </p>
                {comparacion.conflictos > 0 && (
                  <p className="text-yellow-700 font-semibold">
                    ⚠️ Se omitirían: {comparacion.conflictos} (por conflictos)
                  </p>
                )}
              </div>

              {comparacion.conflictos === 0 && comparacion.copiables > 0 && (
                <div className="bg-green-100 border border-green-300 rounded p-3 mt-3">
                  <p className="text-sm text-green-800 font-semibold">
                    ✅ No hay conflictos. Puedes copiar toda la semana anterior
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                {comparacion.copiables > 0 && (
                  <Button variant="primary" onClick={copiarSemana} disabled={loading}>
                    Copiar Semana Anterior
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => setShowComparacion(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}

          {/* Limpiar semana */}
          <div className="pt-4 border-t">
            <Button
              variant="danger"
              onClick={limpiarSemana}
              disabled={loading}
            >
              🗑️ Limpiar Semana
            </Button>
            <p className="text-sm text-red-600 mt-2">
              Elimina TODAS las solicitudes de esta semana (no se puede deshacer)
            </p>
          </div>

        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({...modal, isOpen: false})}
        title={modal.title}
        type={modal.type}
        showCancel={modal.showCancel}
        onConfirm={modal.onConfirm}
      >
        <p className="whitespace-pre-line">{modal.message}</p>
      </Modal>
    </>
  );
}