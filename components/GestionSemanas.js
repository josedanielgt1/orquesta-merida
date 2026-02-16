"use client"

import { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { obtenerNumeroSemana, formatearSemana, obtenerInicioSemana } from '@/utils/fechas';
import Button from './ui/Button';

export default function GestionSemanas({ semanaActual, onActualizar }) {
  const [loading, setLoading] = useState(false);

  const compararSemanas = async () => {
    setLoading(true);

    try {
      // Obtener semana anterior
      const semanaAnterior = new Date(semanaActual);
      semanaAnterior.setDate(semanaAnterior.getDate() - 7);
      const semanaAnteriorId = obtenerNumeroSemana(semanaAnterior);
      const semanaActualId = obtenerNumeroSemana(semanaActual);

      // Solicitudes semana anterior (aprobadas)
      const qAnterior = query(
        collection(db, 'requests'),
        where('semanaId', '==', semanaAnteriorId),
        where('estado', '==', 'aprobada')
      );
      const snapshotAnterior = await getDocs(qAnterior);

      // Solicitudes semana actual (aprobadas)
      const qActual = query(
        collection(db, 'requests'),
        where('semanaId', '==', semanaActualId),
        where('estado', '==', 'aprobada')
      );
      const snapshotActual = await getDocs(qActual);

      const totalAnterior = snapshotAnterior.size;
      const totalActual = snapshotActual.size;

      // Analizar qué espacios/horarios están disponibles para copiar
      let disponiblesCopiar = 0;
      const solicitudesActuales = [];
      snapshotActual.forEach(doc => solicitudesActuales.push(doc.data()));

      snapshotAnterior.forEach(doc => {
        const solicitud = doc.data();
        
        // Verificar si tiene conflicto
        const conflicto = solicitudesActuales.some(existente => {
          if (existente.espacioAsignado !== solicitud.espacioAsignado) return false;
          if (existente.dia !== solicitud.dia) return false;
          
          return (
            (solicitud.horaInicio >= existente.horaInicio && solicitud.horaInicio < existente.horaFin) ||
            (solicitud.horaFin > existente.horaInicio && solicitud.horaFin <= existente.horaFin) ||
            (solicitud.horaInicio <= existente.horaInicio && solicitud.horaFin >= existente.horaFin)
          );
        });

        if (!conflicto) disponiblesCopiar++;
      });

      const bloqueadas = totalAnterior - disponiblesCopiar;

      let mensaje = `📊 COMPARACIÓN DE SEMANAS\n\n`;
      mensaje += `Semana anterior: ${totalAnterior} solicitudes aprobadas\n`;
      mensaje += `Semana actual: ${totalActual} solicitudes aprobadas\n\n`;
      mensaje += `Si copiaras la semana anterior ahora:\n`;
      mensaje += `✓ Se copiarían: ${disponiblesCopiar} solicitudes\n`;
      mensaje += `⚠️ Se omitirían: ${bloqueadas} (por conflictos)\n\n`;
      
      if (bloqueadas === 0) {
        mensaje += `✅ No hay conflictos. Puedes copiar toda la semana anterior.`;
      } else {
        mensaje += `⚠️ Hay ${bloqueadas} espacios/horarios que ya están ocupados en la semana actual.`;
      }

      alert(mensaje);

    } catch (err) {
      console.error('Error:', err);
      alert('Error al comparar semanas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarSemanaAnterior = async () => {
    const confirmar = window.confirm(
      `¿Deseas copiar las solicitudes aprobadas de la semana anterior?\n\n` +
      `El sistema verificará conflictos y solo copiará lo que esté disponible.`
    );

    if (!confirmar) return;

    setLoading(true);

    try {
      // Obtener semana anterior
      const semanaAnterior = new Date(semanaActual);
      semanaAnterior.setDate(semanaAnterior.getDate() - 7);
      const semanaAnteriorId = obtenerNumeroSemana(semanaAnterior);
      const semanaActualId = obtenerNumeroSemana(semanaActual);

      // Buscar solicitudes aprobadas de semana anterior
      const qAnterior = query(
        collection(db, 'requests'),
        where('semanaId', '==', semanaAnteriorId),
        where('estado', '==', 'aprobada')
      );

      const snapshotAnterior = await getDocs(qAnterior);
      
      if (snapshotAnterior.empty) {
        alert('No hay solicitudes aprobadas en la semana anterior para copiar');
        setLoading(false);
        return;
      }

      // Buscar solicitudes YA existentes en semana actual
      const qActual = query(
        collection(db, 'requests'),
        where('semanaId', '==', semanaActualId)
      );

      const snapshotActual = await getDocs(qActual);
      const solicitudesExistentes = [];
      snapshotActual.forEach(doc => {
        const data = doc.data();
        if (data.estado === 'aprobada') {
          solicitudesExistentes.push(data);
        }
      });

      // Función para verificar conflicto
      const tieneConflicto = (solicitud) => {
        return solicitudesExistentes.some(existente => {
          // Mismo espacio y día
          if (existente.espacioAsignado !== solicitud.espacioAsignado) return false;
          if (existente.dia !== solicitud.dia) return false;
          
          // Verificar solapamiento de horarios
          return (
            (solicitud.horaInicio >= existente.horaInicio && solicitud.horaInicio < existente.horaFin) ||
            (solicitud.horaFin > existente.horaInicio && solicitud.horaFin <= existente.horaFin) ||
            (solicitud.horaInicio <= existente.horaInicio && solicitud.horaFin >= existente.horaFin)
          );
        });
      };

      let copiadas = 0;
      let omitidas = 0;
      const conflictos = [];

      // Procesar cada solicitud
      for (const docSnap of snapshotAnterior.docs) {
        const solicitud = docSnap.data();
        
        // Verificar conflicto
        if (tieneConflicto(solicitud)) {
          omitidas++;
          conflictos.push({
            profesor: solicitud.profesorName,
            dia: solicitud.dia,
            horario: `${solicitud.horaInicio}-${solicitud.horaFin}`,
            espacio: solicitud.espacioAsignado
          });
          continue; // Saltar esta solicitud
        }

        // Si no hay conflicto, copiar
        await addDoc(collection(db, 'requests'), {
          profesorId: solicitud.profesorId,
          profesorName: solicitud.profesorName,
          dia: solicitud.dia,
          horaInicio: solicitud.horaInicio,
          horaFin: solicitud.horaFin,
          tipoClase: solicitud.tipoClase,
          observaciones: `Copiado de semana anterior${solicitud.observaciones ? ' - ' + solicitud.observaciones : ''}`,
          estado: 'aprobada',
          espacioAsignado: solicitud.espacioAsignado,
          fechaSolicitud: serverTimestamp(),
          fechaAprobacion: serverTimestamp(),
          notasAdmin: 'Copiado automáticamente de semana anterior',
          semanaInicio: semanaActual,
          semanaId: semanaActualId
        });

        copiadas++;
      }

      // Mostrar resultado detallado
      let mensaje = `✅ PROCESO COMPLETADO\n\n`;
      mensaje += `✓ Copiadas: ${copiadas} solicitudes\n`;
      
      if (omitidas > 0) {
        mensaje += `⚠️ Omitidas: ${omitidas} (tenían conflictos)\n\n`;
        mensaje += `CONFLICTOS DETECTADOS:\n`;
        mensaje += `(Estas solicitudes NO se copiaron porque el espacio ya está ocupado)\n\n`;
        
        conflictos.forEach((c, idx) => {
          mensaje += `${idx + 1}. ${c.profesor}\n`;
          mensaje += `   ${c.dia} ${c.horario} - ${c.espacio}\n\n`;
        });
      }

      alert(mensaje);
      
      if (onActualizar) onActualizar();

    } catch (err) {
      console.error('Error:', err);
      alert('Error al copiar semana: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const limpiarSemana = async () => {
    const confirmar = window.confirm(
      `⚠️ ¿ESTÁS SEGURO?\n\n` +
      `Esto ELIMINARÁ todas las solicitudes de la semana:\n` +
      `${formatearSemana(semanaActual)}\n\n` +
      `Esta acción NO se puede deshacer.`
    );

    if (!confirmar) return;

    const segundaConfirmacion = window.confirm(
      `Segunda confirmación: ¿Realmente deseas eliminar TODAS las solicitudes de esta semana?`
    );

    if (!segundaConfirmacion) return;

    setLoading(true);

    try {
      const q = query(
        collection(db, 'requests'),
        where('semanaId', '==', obtenerNumeroSemana(semanaActual))
      );

      const snapshot = await getDocs(q);
      
      let eliminadas = 0;

      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
        eliminadas++;
      }

      alert(`✅ Se eliminaron ${eliminadas} solicitudes`);
      
      if (onActualizar) onActualizar();

    } catch (err) {
      console.error('Error:', err);
      alert('Error al limpiar semana: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        🔄 Gestión de Semanas
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Comparar Semanas */}
        <div className="bg-white rounded p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Comparar Semanas
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Analiza cuántas solicitudes se pueden copiar sin conflictos.
            No modifica nada, solo muestra información.
          </p>
          <Button 
            variant="secondary" 
            onClick={compararSemanas}
            disabled={loading}
          >
            {loading ? 'Analizando...' : '📊 Comparar'}
          </Button>
        </div>

        {/* Copiar Semana Anterior */}
        <div className="bg-white rounded p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Copiar Semana Anterior
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Copia todas las solicitudes disponibles. 
            Omite automáticamente las que tengan conflictos.
          </p>
          <Button 
            variant="primary" 
            onClick={copiarSemanaAnterior}
            disabled={loading}
          >
            {loading ? 'Copiando...' : '📋 Copiar'}
          </Button>
        </div>

        {/* Limpiar Semana Actual */}
        <div className="bg-white rounded p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Limpiar Semana Actual
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Elimina TODAS las solicitudes de esta semana. 
            Útil para empezar de cero.
          </p>
          <Button 
            variant="danger" 
            onClick={limpiarSemana}
            disabled={loading}
          >
            {loading ? 'Limpiando...' : '🗑️ Limpiar'}
          </Button>
        </div>
      </div>
    </div>
  );
}