"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/app/firebase';
import { obtenerInicioSemana, obtenerNumeroSemana, formatearSemana } from '@/utils/fechas';
import { generarPDFHorarios } from '@/utils/pdfGenerator';
import { emailSolicitudAprobada, emailSolicitudRechazada } from '@/utils/emailTemplates';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Modal from '@/components/ui/Modal';
import OcupacionEspacios from '@/components/OcupacionEspacios';
import BuscadorEspacios from '@/components/BuscadorEspacios';
import SelectorSemana from '@/components/SelectorSemana';
import GestionSemanas from '@/components/GestionSemanas';
import NavBar from '@/components/NavBar';
import EstadisticasTorta from '@/components/EstadisticasTorta';

export default function MasterDashboard() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semanaActual, setSemanaActual] = useState(obtenerInicioSemana(new Date()));
  const [rechazarData, setRechazarData] = useState(null);
  const [modalBloqueo, setModalBloqueo] = useState(false);
  const [formBloqueo, setFormBloqueo] = useState({
    espacio: '',
    fechaInicio: '',
    fechaFin: '',
    dias: [],
    horaInicio: '',
    horaFin: '',
    motivo: ''
  });
  const [previewBloqueos, setPreviewBloqueos] = useState([]);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const router = useRouter();

  useSessionTimeout(30);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'master') {
      router.push('/dashboard/profesor');
      return;
    }

    setUser(parsedUser);

    const espaciosList = [];
    for (let i = 1; i <= 46; i++) {
      if ([35, 37, 38, 39, 40].includes(i)) continue;
      espaciosList.push(`E${i}`);
    }
    espaciosList.push('E11A', 'E25A', 'E25B', 'E25C');
    
    espaciosList.sort((a, b) => {
      const numA = parseInt(a.substring(1));
      const numB = parseInt(b.substring(1));
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
    
    setEspacios(espaciosList);

    const unsubscribe = onSnapshot(
      collection(db, 'requests'),
      (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setSolicitudes(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error:', error);
        if (error.code === 'permission-denied') {
          localStorage.removeItem('user');
          router.push('/login');
        }
      }
    );

    return () => unsubscribe();
  }, [router, mounted]);

  const aprobarSolicitud = async (solicitud, espacio) => {
    if (!espacio) {
      setModal({
        isOpen: true,
        title: 'Espacio requerido',
        message: 'Debes seleccionar un espacio antes de aprobar la solicitud.',
        type: 'warning'
      });
      return;
    }

    const aprobadas = solicitudes.filter(s =>
      s.estado === 'aprobada' &&
      s.semanaId === solicitud.semanaId
    );

    const hayConflicto = aprobadas.some(s => {
      if (s.espacioAsignado !== espacio) return false;
      if (s.dia !== solicitud.dia) return false;
      return (
        (solicitud.horaInicio >= s.horaInicio && solicitud.horaInicio < s.horaFin) ||
        (solicitud.horaFin > s.horaInicio && solicitud.horaFin <= s.horaFin) ||
        (solicitud.horaInicio <= s.horaInicio && solicitud.horaFin >= s.horaFin)
      );
    });

    if (hayConflicto) {
      const conflicto = aprobadas.find(s =>
        s.espacioAsignado === espacio &&
        s.dia === solicitud.dia &&
        (
          (solicitud.horaInicio >= s.horaInicio && solicitud.horaInicio < s.horaFin) ||
          (solicitud.horaFin > s.horaInicio && solicitud.horaFin <= s.horaFin) ||
          (solicitud.horaInicio <= s.horaInicio && solicitud.horaFin >= s.horaFin)
        )
      );
      
      setModal({
        isOpen: true,
        title: '⚠️ Conflicto de horario',
        message: `El espacio ${espacio} ya está ocupado el ${solicitud.dia} en esa semana por ${conflicto.profesorName} de ${conflicto.horaInicio} a ${conflicto.horaFin}.\n\nPor favor selecciona otro espacio.`,
        type: 'error'
      });
      return;
    }

    const especificaciones = window.prompt(
      `Aprobar solicitud de ${solicitud.profesorName}\n\n` +
      `${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}\n` +
      `Espacio: ${espacio}\n\n` +
      `¿Deseas agregar alguna especificación o nota? (Opcional)`
    );

    if (especificaciones === null) return;

    try {
      await updateDoc(doc(db, 'requests', solicitud.id), {
        estado: 'aprobada',
        espacioAsignado: espacio,
        especificacionesAdmin: especificaciones || '',
        fechaAprobacion: serverTimestamp()
      });

      const solicitudActualizada = {
        ...solicitud,
        espacioAsignado: espacio,
        especificacionesAdmin: especificaciones
      };

      const htmlEmail = emailSolicitudAprobada(
        { name: solicitud.profesorName },
        solicitudActualizada
      );

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: solicitud.profesorEmail || solicitud.email,
          subject: `✅ Solicitud Aprobada - ${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}`,
          html: htmlEmail
        })
      }).catch(err => console.error('Error enviando email:', err));

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'admin@nucleomerida.com',
          subject: `[COPIA] Solicitud Aprobada - ${solicitud.profesorName}`,
          html: htmlEmail
        })
      }).catch(err => console.error('Error enviando CC:', err));
      
      setModal({
        isOpen: true,
        title: '✅ Solicitud aprobada',
        message: `La solicitud de ${solicitud.profesorName} para el ${solicitud.dia} ha sido aprobada en el espacio ${espacio}.\n\nSe ha enviado un email de notificación al profesor${especificaciones ? ' con las especificaciones indicadas' : ''}.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error al aprobar',
        message: 'Ocurrió un error al aprobar la solicitud. Por favor intenta de nuevo.',
        type: 'error'
      });
    }
  };

  const rechazarSolicitud = async (solicitudId, solicitud) => {
    setRechazarData({ solicitudId, solicitud });
  };

  const confirmarRechazo = async (motivo) => {
    if (!rechazarData) return;
    
    const { solicitudId, solicitud } = rechazarData;
    
    setRechazarData(null);
    
    try {
      await updateDoc(doc(db, 'requests', solicitudId), {
        estado: 'rechazada',
        notasAdmin: motivo || 'Sin motivo especificado',
        fechaAprobacion: serverTimestamp()
      });

      const htmlEmail = emailSolicitudRechazada(
        { name: solicitud.profesorName },
        solicitud,
        motivo || 'Sin motivo especificado'
      );

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: solicitud.profesorEmail || solicitud.email,
          subject: `❌ Solicitud Rechazada - ${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}`,
          html: htmlEmail
        })
      }).catch(err => console.error('Error enviando email:', err));

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'admin@nucleomerida.com',
          subject: `[COPIA] Solicitud Rechazada - ${solicitud.profesorName}`,
          html: htmlEmail
        })
      }).catch(err => console.error('Error enviando CC:', err));
      
      setModal({
        isOpen: true,
        title: 'Solicitud rechazada',
        message: 'La solicitud ha sido rechazada correctamente.\n\nSe ha enviado un email de notificación al profesor.',
        type: 'info',
        showCancel: false,
        onConfirm: null
      });

    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'Ocurrió un error al rechazar la solicitud.',
        type: 'error',
        showCancel: false,
        onConfirm: null
      });
    }
  };

  const cancelarSolicitudAprobada = async (solicitud) => {
    const motivo = window.prompt(
      `Cancelar clase aprobada:\n\n` +
      `Profesor: ${solicitud.profesorName}\n` +
      `${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}\n` +
      `Espacio: ${solicitud.espacioAsignado}\n\n` +
      `Por favor indica el motivo de la cancelación:`
    );
    
    if (motivo === null) return;
    
    setModal({
      isOpen: true,
      title: '⚠️ ¿Confirmar cancelación?',
      message: `¿Estás seguro de cancelar esta clase?\n\nMotivo: ${motivo || 'No especificado'}`,
      type: 'warning',
      showCancel: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'requests', solicitud.id));
          
          const emailCancelacion = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0;">🗑️ Clase Cancelada</h1>
                </div>
                
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    Hola <strong>${solicitud.profesorName}</strong>,
                  </p>
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    La administración ha cancelado tu clase aprobada:
                  </p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <p style="margin: 5px 0;"><strong>Día:</strong> ${solicitud.dia}</p>
                    <p style="margin: 5px 0;"><strong>Horario:</strong> ${solicitud.horaInicio} - ${solicitud.horaFin}</p>
                    <p style="margin: 5px 0;"><strong>Espacio:</strong> ${solicitud.espacioAsignado}</p>
                  </div>
                  
                  <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #ef4444;">
                    <p style="margin: 0; font-weight: 600; color: #991b1b;">Motivo:</p>
                    <p style="margin: 10px 0 0 0; color: #333;">${motivo || 'No especificado'}</p>
                  </div>
                  
                  <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    Si tienes dudas, contacta a la administración.
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                  <p>El Sistema Núcleo Mérida</p>
                </div>
              </div>
            </body>
            </html>
          `;
          
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: solicitud.profesorEmail || solicitud.email,
              subject: `🗑️ Clase Cancelada - ${solicitud.dia}`,
              html: emailCancelacion
            })
          }).catch(err => console.error('Error enviando email:', err));
          
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: 'admin@nucleomerida.com',
              subject: `[COPIA] Clase Cancelada - ${solicitud.profesorName}`,
              html: emailCancelacion
            })
          }).catch(err => console.error('Error enviando CC:', err));
          
          setModal({
            isOpen: true,
            title: '✅ Clase cancelada',
            message: 'La clase ha sido cancelada.\n\nSe ha notificado al profesor.',
            type: 'success',
            showCancel: false,
            onConfirm: null
          });
        } catch (err) {
          console.error('Error:', err);
          setModal({
            isOpen: true,
            title: 'Error',
            message: 'No se pudo cancelar la clase.',
            type: 'error',
            showCancel: false,
            onConfirm: null
          });
        }
      }
    });
  };

  const reasignarSolicitud = async (solicitud) => {
    const nuevoEspacio = window.prompt(
      `Reasignar clase de ${solicitud.profesorName}:\n\n` +
      `${solicitud.dia} ${solicitud.horaInicio}-${solicitud.horaFin}\n` +
      `Espacio actual: ${solicitud.espacioAsignado}\n\n` +
      `Ingresa el NUEVO espacio (ej: E15):`
    );
    
    if (!nuevoEspacio) return;
    
    const espacioValido = espacios.includes(nuevoEspacio.toUpperCase());
    if (!espacioValido) {
      setModal({
        isOpen: true,
        title: 'Espacio inválido',
        message: `El espacio "${nuevoEspacio}" no existe.\n\nEspacios válidos: E1-E46, E11A, E25A, E25B, E25C`,
        type: 'error'
      });
      return;
    }
    
    const aprobadas = solicitudes.filter(s =>
      s.estado === 'aprobada' &&
      s.semanaId === solicitud.semanaId &&
      s.id !== solicitud.id
    );
    
    const hayConflicto = aprobadas.some(s => {
      if (s.espacioAsignado !== nuevoEspacio.toUpperCase()) return false;
      if (s.dia !== solicitud.dia) return false;
      return (
        (solicitud.horaInicio >= s.horaInicio && solicitud.horaInicio < s.horaFin) ||
        (solicitud.horaFin > s.horaInicio && solicitud.horaFin <= s.horaFin) ||
        (solicitud.horaInicio <= s.horaInicio && solicitud.horaFin >= s.horaFin)
      );
    });
    
    if (hayConflicto) {
      setModal({
        isOpen: true,
        title: '⚠️ Conflicto de horario',
        message: `El espacio ${nuevoEspacio.toUpperCase()} ya está ocupado en ese horario.`,
        type: 'error'
      });
      return;
    }
    
    const especificaciones = window.prompt(
      `Nuevo espacio: ${nuevoEspacio.toUpperCase()}\n\n` +
      `¿Deseas agregar especificaciones o motivo del cambio? (Opcional)`
    );
    
    if (especificaciones === null) return;
    
    try {
      await updateDoc(doc(db, 'requests', solicitud.id), {
        espacioAsignado: nuevoEspacio.toUpperCase(),
        especificacionesAdmin: especificaciones || solicitud.especificacionesAdmin || '',
        fechaModificacion: serverTimestamp()
      });
      
      const emailReasignacion = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">🔄 Cambio de Espacio</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">
                Hola <strong>${solicitud.profesorName}</strong>,
              </p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Se ha realizado un cambio en tu clase:
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 5px 0;"><strong>Día:</strong> ${solicitud.dia}</p>
                <p style="margin: 5px 0;"><strong>Horario:</strong> ${solicitud.horaInicio} - ${solicitud.horaFin}</p>
                <p style="margin: 15px 0 5px 0;"><strong>Espacio anterior:</strong> <span style="text-decoration: line-through; color: #999;">${solicitud.espacioAsignado}</span></p>
                <p style="margin: 5px 0;"><strong>Espacio nuevo:</strong> <span style="color: #f59e0b; font-weight: bold; font-size: 18px;">${nuevoEspacio.toUpperCase()}</span></p>
              </div>
              
              ${especificaciones ? `
              <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-weight: 600; color: #1e40af;">📋 Especificaciones:</p>
                <p style="margin: 10px 0 0 0; color: #333;">${especificaciones}</p>
              </div>
              ` : ''}
              
              <p style="margin-top: 20px; color: #666; font-size: 14px;">
                Por favor toma nota del nuevo espacio asignado.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>El Sistema Núcleo Mérida</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: solicitud.profesorEmail || solicitud.email,
          subject: `🔄 Cambio de Espacio - ${solicitud.dia}`,
          html: emailReasignacion
        })
      }).catch(err => console.error('Error enviando email:', err));
      
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'admin@nucleomerida.com',
          subject: `[COPIA] Cambio de Espacio - ${solicitud.profesorName}`,
          html: emailReasignacion
        })
      }).catch(err => console.error('Error enviando CC:', err));
      
      setModal({
        isOpen: true,
        title: '✅ Espacio reasignado',
        message: `El espacio ha sido cambiado de ${solicitud.espacioAsignado} a ${nuevoEspacio.toUpperCase()}.\n\nSe ha notificado al profesor.`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error:', err);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo reasignar el espacio.',
        type: 'error'
      });
    }
  };

  const bloquearEspacio = () => {
    setFormBloqueo({
      espacio: '',
      fechaInicio: '',
      fechaFin: '',
      dias: [],
      horaInicio: '',
      horaFin: '',
      motivo: ''
    });
    setPreviewBloqueos([]);
    setMostrarPreview(false);
    setModalBloqueo(true);
  };

  const toggleDia = (dia) => {
    setFormBloqueo(prev => ({
      ...prev,
      dias: prev.dias.includes(dia)
        ? prev.dias.filter(d => d !== dia)
        : [...prev.dias, dia]
    }));
  };

  const generarPreviewBloqueos = () => {
    const { espacio, fechaInicio, fechaFin, dias, horaInicio, horaFin, motivo } = formBloqueo;

    if (!espacio || !fechaInicio || !fechaFin || dias.length === 0 || !horaInicio || !horaFin) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (horaInicio >= horaFin) {
      alert('La hora de fin debe ser mayor que la hora de inicio');
      return;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (inicio > fin) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const bloqueosGenerados = [];

    let fechaActual = new Date(inicio);
    while (fechaActual <= fin) {
      const diaSemana = diasSemana[fechaActual.getDay()];
      
      if (dias.includes(diaSemana)) {
        const semanaInicio = obtenerInicioSemana(fechaActual);
        const semanaId = obtenerNumeroSemana(semanaInicio);
        
        bloqueosGenerados.push({
          espacio,
          dia: diaSemana,
          fecha: new Date(fechaActual),
          horaInicio,
          horaFin,
          motivo: motivo || 'Espacio bloqueado por administración',
          semanaId,
          semanaInicio
        });
      }
      
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    if (bloqueosGenerados.length === 0) {
      alert('No se generaron bloqueos. Verifica que los días seleccionados estén dentro del rango de fechas.');
      return;
    }

    setPreviewBloqueos(bloqueosGenerados);
    setMostrarPreview(true);
  };

  const confirmarBloqueos = async () => {
    try {
      for (const bloqueo of previewBloqueos) {
        const aprobadas = solicitudes.filter(s =>
          s.estado === 'aprobada' &&
          s.semanaId === bloqueo.semanaId
        );

        const hayConflicto = aprobadas.some(s => {
          if (s.espacioAsignado !== bloqueo.espacio) return false;
          if (s.dia !== bloqueo.dia) return false;
          return (
            (bloqueo.horaInicio >= s.horaInicio && bloqueo.horaInicio < s.horaFin) ||
            (bloqueo.horaFin > s.horaInicio && bloqueo.horaFin <= s.horaFin) ||
            (bloqueo.horaInicio <= s.horaInicio && bloqueo.horaFin >= s.horaFin)
          );
        });

        if (hayConflicto) {
          const conf = aprobadas.find(s =>
            s.espacioAsignado === bloqueo.espacio &&
            s.dia === bloqueo.dia &&
            (
              (bloqueo.horaInicio >= s.horaInicio && bloqueo.horaInicio < s.horaFin) ||
              (bloqueo.horaFin > s.horaInicio && bloqueo.horaFin <= s.horaFin) ||
              (bloqueo.horaInicio <= s.horaInicio && bloqueo.horaFin >= s.horaFin)
            )
          );

          alert(
            `⚠️ Conflicto detectado:\n\n` +
            `${bloqueo.espacio} - ${bloqueo.dia}\n` +
            `Ya ocupado por ${conf.profesorName}\n` +
            `${conf.horaInicio}-${conf.horaFin}\n\n` +
            `No se crearán los bloqueos.`
          );
          return;
        }

        await addDoc(collection(db, 'requests'), {
          profesorId: user.uid,
          profesorName: 'ADMINISTRACIÓN',
          profesorEmail: 'admin@nucleomerida.com',
          dia: bloqueo.dia,
          horaInicio: bloqueo.horaInicio,
          horaFin: bloqueo.horaFin,
          tipoClase: 'Bloqueo administrativo',
          observaciones: bloqueo.motivo,
          estado: 'aprobada',
          espacioAsignado: bloqueo.espacio,
          esBloqueoAdmin: true,
          esSolicitudGrupo: previewBloqueos.length > 1,
          semanaId: bloqueo.semanaId,
          semanaInicio: bloqueo.semanaInicio,
          fechaSolicitud: serverTimestamp(),
          fechaAprobacion: serverTimestamp()
        });
      }

      setModalBloqueo(false);
      setModal({
        isOpen: true,
        title: '✅ Espacios bloqueados',
        message: `Se han creado ${previewBloqueos.length} bloqueo${previewBloqueos.length > 1 ? 's' : ''} correctamente.\n\nEspacio: ${formBloqueo.espacio}`,
        type: 'success'
      });
    } catch (err) {
      console.error('Error:', err);
      alert('Error al crear los bloqueos');
    }
  };

  const exportarPDF = () => {
    const semanaId = obtenerNumeroSemana(semanaActual);
    const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);
    generarPDFHorarios(
      solicitudesSemana,
      formatearSemana(semanaActual),
      `horarios_${formatearSemana(semanaActual).replace(/\//g, '-')}.pdf`
    );
  };

  if (!mounted || !user) return <Loading message="Cargando panel..." />;

  const semanaId = obtenerNumeroSemana(semanaActual);
  const solicitudesSemana = solicitudes.filter(s => s.semanaId === semanaId);
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const pendientes = solicitudesPendientes.length;
  const aprobadas = solicitudesSemana.filter(s => s.estado === 'aprobada').length;
  const espaciosOcupados = new Set(
    solicitudesSemana
      .filter(s => s.estado === 'aprobada' && s.espacioAsignado)
      .map(s => s.espacioAsignado)
  ).size;

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Gráfico de Estadísticas */}
        <div className="mb-8">
          <EstadisticasTorta solicitudes={solicitudes} />
        </div>

        {/* Botón Bloquear Espacio */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                🔒 Bloquear Espacio
              </h2>
              <p className="text-gray-600 text-sm">
                Reservar espacios para mantenimiento o eventos especiales
              </p>
            </div>
            <Button variant="primary" onClick={bloquearEspacio}>
              🔒 Bloquear Espacio
            </Button>
          </div>
        </div>

        {/* Exportar PDF */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                📄 Exportar Horarios
              </h2>
              <p className="text-gray-600 text-sm">
                Descarga los horarios aprobados de la semana seleccionada
              </p>
            </div>
            <Button variant="primary" onClick={exportarPDF}>
              ⬇️ Descargar PDF
            </Button>
          </div>
        </div>

        {/* Selector de Semana */}
        <SelectorSemana
          semanaActual={semanaActual}
          onCambiarSemana={setSemanaActual}
        />

        {/* Gestión de Semanas */}
        <GestionSemanas
          semanaActual={semanaActual}
          onActualizar={() => setSemanaActual(new Date(semanaActual))}
        />

        {/* Buscador de Espacios */}
        <div className="mb-8">
          <BuscadorEspacios
            solicitudes={solicitudes}
            espacios={espacios}
          />
        </div>

        {/* Solicitudes Pendientes */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            Solicitudes Pendientes ({pendientes})
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Mostrando todas las solicitudes pendientes de cualquier semana
          </p>

          {loading ? (
            <p className="text-gray-500">Cargando solicitudes...</p>
          ) : solicitudesPendientes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-500 font-semibold">
                No hay solicitudes pendientes
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {solicitudesPendientes.map(solicitud => (
                <SolicitudCard
                  key={solicitud.id}
                  solicitud={solicitud}
                  espacios={espacios}
                  solicitudesAprobadas={solicitudes.filter(s => s.estado === 'aprobada')}
                  onAprobar={aprobarSolicitud}
                  onRechazar={rechazarSolicitud}
                />
              ))}
            </div>
          )}
        </div>

        {/* Solicitudes Aprobadas */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">
            Solicitudes Aprobadas ({aprobadas})
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Semana: {formatearSemana(semanaActual)}
          </p>

          {solicitudesSemana.filter(s => s.estado === 'aprobada').length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-gray-500">
                No hay solicitudes aprobadas para esta semana
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {solicitudesSemana
                .filter(s => s.estado === 'aprobada')
                .sort((a, b) => {
                  const diasOrden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  return diasOrden.indexOf(a.dia) - diasOrden.indexOf(b.dia);
                })
                .map(solicitud => (
                  <div
                    key={solicitud.id}
                    className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {solicitud.esBloqueoAdmin && (
                          <span className="inline-block text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded mb-1 font-semibold">
                            🔒 BLOQUEO ADMINISTRATIVO
                          </span>
                        )}
                        {solicitud.esSolicitudGrupo && !solicitud.esBloqueoAdmin && (
                          <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mb-1 font-semibold">
                            📅 Solicitud por rango
                          </span>
                        )}
                        <p className="font-semibold text-gray-900">
                          {solicitud.profesorName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {solicitud.dia} · {solicitud.horaInicio} - {solicitud.horaFin} ·
                          <span className="capitalize"> {solicitud.tipoClase}</span> ·
                          <span className="font-semibold text-green-700"> {solicitud.espacioAsignado}</span>
                        </p>
                        {solicitud.especificacionesAdmin && (
                          <p className="text-xs text-blue-600 mt-1">
                            📋 {solicitud.especificacionesAdmin}
                          </p>
                        )}
                      </div>
                      
                      {!solicitud.esBloqueoAdmin && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => reasignarSolicitud(solicitud)}
                            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-200 transition-all"
                            title="Reasignar espacio"
                          >
                            🔄 Reasignar
                          </button>
                          <button
                            onClick={() => cancelarSolicitudAprobada(solicitud)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all"
                            title="Cancelar clase"
                          >
                            🗑️ Cancelar
                          </button>
                        </div>
                      )}
                      
                      {solicitud.esBloqueoAdmin && (
                        <button
                          onClick={() => cancelarSolicitudAprobada(solicitud)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all ml-4"
                          title="Desbloquear espacio"
                        >
                          🗑️ Desbloquear
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Ocupación de Espacios */}
        <div className="mb-8">
          <OcupacionEspacios
            solicitudes={solicitudesSemana}
            espacios={espacios}
          />
        </div>

      </main>

      {/* Modal de rechazo */}
      {rechazarData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ⚠️ Rechazar solicitud
            </h3>
            
            <p className="text-gray-700 mb-4">
              ¿Motivo del rechazo? (opcional)
            </p>
            
            <textarea
              id="motivoRechazo"
              rows="3"
              placeholder="Ej: Espacio no disponible, conflicto de horario..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setRechazarData(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const motivo = document.getElementById('motivoRechazo').value;
                  confirmarRechazo(motivo);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de bloqueo */}
      {modalBloqueo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            
            {!mostrarPreview ? (
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  🔒 Bloquear Espacio por Rango de Fechas
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Espacio *
                    </label>
                    <select
                      value={formBloqueo.espacio}
                      onChange={(e) => setFormBloqueo({ ...formBloqueo, espacio: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Seleccionar espacio</option>
                      {espacios.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha Inicio *
                      </label>
                      <input
                        type="date"
                        value={formBloqueo.fechaInicio}
                        onChange={(e) => setFormBloqueo({ ...formBloqueo, fechaInicio: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha Fin *
                      </label>
                      <input
                        type="date"
                        value={formBloqueo.fechaFin}
                        onChange={(e) => setFormBloqueo({ ...formBloqueo, fechaFin: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Días de la semana a bloquear *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(dia => (
                        <button
                          key={dia}
                          type="button"
                          onClick={() => toggleDia(dia)}
                          className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                            formBloqueo.dias.includes(dia)
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {dia}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Hora Inicio *
                      </label>
                      <select
                        value={formBloqueo.horaInicio}
                        onChange={(e) => setFormBloqueo({ ...formBloqueo, horaInicio: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Seleccionar</option>
                        {Array.from({ length: 44 }, (_, i) => {
                          const hora = Math.floor(8 + i / 4);
                          const minutos = (i % 4) * 15;
                          return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
                        }).map(hora => (
                          <option key={hora} value={hora}>{hora}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Hora Fin *
                      </label>
                      <select
                        value={formBloqueo.horaFin}
                        onChange={(e) => setFormBloqueo({ ...formBloqueo, horaFin: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Seleccionar</option>
                        {Array.from({ length: 44 }, (_, i) => {
                          const hora = Math.floor(8 + i / 4);
                          const minutos = (i % 4) * 15;
                          return `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
                        }).map(hora => (
                          <option key={hora} value={hora}>{hora}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Motivo (opcional)
                    </label>
                    <textarea
                      value={formBloqueo.motivo}
                      onChange={(e) => setFormBloqueo({ ...formBloqueo, motivo: e.target.value })}
                      placeholder="Ej: Mantenimiento preventivo, evento especial..."
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setModalBloqueo(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={generarPreviewBloqueos}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all"
                  >
                    👁️ Ver Preview
                  </button>
                </div>
              </div>

            ) : (
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  👁️ Preview de Bloqueos
                </h3>
                <p className="text-gray-600 mb-6">
                  Se crearán <strong>{previewBloqueos.length}</strong> bloqueo{previewBloqueos.length > 1 ? 's' : ''}
                </p>

                <div className="max-h-96 overflow-y-auto mb-6 space-y-3">
                  {previewBloqueos.map((bloqueo, idx) => (
                    <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900">
                            {bloqueo.espacio} - {bloqueo.dia}
                          </p>
                          <p className="text-sm text-gray-600">
                            {bloqueo.fecha.toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {bloqueo.horaInicio} - {bloqueo.horaFin}
                          </p>
                          {bloqueo.motivo && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              💬 {bloqueo.motivo}
                            </p>
                          )}
                        </div>
                        <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                          🔒 Bloqueo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setMostrarPreview(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
                  >
                    ← Volver a editar
                  </button>
                  <button
                    onClick={confirmarBloqueos}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all"
                  >
                    ✅ Confirmar Bloqueos
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        type={modal.type}
        showCancel={modal.showCancel}
        onConfirm={modal.onConfirm}
      >
        {modal.message}
      </Modal>

    </div>
  );
}

function SolicitudCard({ solicitud, espacios, solicitudesAprobadas, onAprobar, onRechazar }) {
  const [espacioSeleccionado, setEspacioSeleccionado] = useState('');

  const verificarConflicto = (espacio) => {
    return solicitudesAprobadas.some(s => {
      if (s.espacioAsignado !== espacio) return false;
      if (s.dia !== solicitud.dia) return false;
      if (s.semanaId !== solicitud.semanaId) return false;
      return (
        (solicitud.horaInicio >= s.horaInicio && solicitud.horaInicio < s.horaFin) ||
        (solicitud.horaFin > s.horaInicio && solicitud.horaFin <= s.horaFin) ||
        (solicitud.horaInicio <= s.horaInicio && solicitud.horaFin >= s.horaFin)
      );
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {solicitud.esSolicitudGrupo && (
        <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mb-2 font-semibold">
          📅 Solicitud por rango
        </span>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-bold text-lg text-gray-900">{solicitud.profesorName}</p>
          <p className="text-gray-600">
            {solicitud.dia} · {solicitud.horaInicio} - {solicitud.horaFin}
          </p>
          <p className="text-sm text-gray-500 capitalize">
            {solicitud.tipoClase}
          </p>
          {solicitud.observaciones && (
            <p className="text-sm text-gray-500 mt-2 italic">
              💬 {solicitud.observaciones}
            </p>
          )}
        </div>
        
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
          ⏳ Pendiente
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Asignar espacio:
          </label>
          <select
            value={espacioSeleccionado}
            onChange={(e) => setEspacioSeleccionado(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar espacio...</option>
            {espacios.map(espacio => {
              const tieneConflicto = verificarConflicto(espacio);
              return (
                <option
                  key={espacio}
                  value={espacio}
                  disabled={tieneConflicto}
                >
                  {espacio} {tieneConflicto ? '⚠️ Ocupado' : '✓ Disponible'}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onAprobar(solicitud, espacioSeleccionado)}
            disabled={!espacioSeleccionado}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            ✅ Aprobar
          </button>
          <button
            onClick={() => onRechazar(solicitud.id, solicitud)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
          >
            ❌ Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}