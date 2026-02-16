import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generarPDFHorarios(solicitudes, semana, nombreArchivo = 'horarios.pdf') {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Orquesta Sinfónica de Mérida', 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('Horarios Aprobados', 105, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Semana: ${semana}`, 105, 32, { align: 'center' });
  
  // Línea separadora
  doc.line(20, 35, 190, 35);
  
  // Filtrar solo aprobadas
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada');
  
  if (aprobadas.length === 0) {
    doc.setFontSize(12);
    doc.text('No hay solicitudes aprobadas para esta semana', 105, 50, { align: 'center' });
  } else {
    // Preparar datos para la tabla
    const datos = aprobadas.map(s => [
      s.profesorName || 'Sin nombre',
      s.dia || '-',
      s.horaInicio || '-',
      s.horaFin || '-',
      s.espacioAsignado || '-',
      s.tipoClase || '-'
    ]);
    
    // Crear tabla - CAMBIO AQUÍ
    autoTable(doc, {
      startY: 40,
      head: [['Profesor', 'Día', 'Inicio', 'Fin', 'Espacio', 'Tipo']],
      body: datos,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      }
    });
    
    // Resumen al final
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total de clases: ${aprobadas.length}`, 20, finalY);
    
    const espaciosUnicos = new Set(aprobadas.map(s => s.espacioAsignado));
    doc.text(`Espacios utilizados: ${espaciosUnicos.size}`, 20, finalY + 7);
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString('es-ES')}`,
      105,
      285,
      { align: 'center' }
    );
  }
  
  doc.save(nombreArchivo);
}

export function generarPDFPorProfesor(solicitudes, profesorName, semana) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Orquesta Sinfónica de Mérida', 105, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`Horario de ${profesorName}`, 105, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Semana: ${semana}`, 105, 32, { align: 'center' });
  
  doc.line(20, 35, 190, 35);
  
  const aprobadas = solicitudes.filter(s => s.estado === 'aprobada');
  
  if (aprobadas.length === 0) {
    doc.setFontSize(12);
    doc.text('No tienes horarios aprobados esta semana', 105, 50, { align: 'center' });
  } else {
    const datos = aprobadas.map(s => [
      s.dia || '-',
      s.horaInicio || '-',
      s.horaFin || '-',
      s.espacioAsignado || '-',
      s.tipoClase || '-'
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [['Día', 'Hora Inicio', 'Hora Fin', 'Espacio', 'Tipo de Clase']],
      body: datos,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total de clases: ${aprobadas.length}`, 20, finalY);
    
    const horasTotales = aprobadas.reduce((total, s) => {
      const inicio = parseInt(s.horaInicio.split(':')[0]);
      const fin = parseInt(s.horaFin.split(':')[0]);
      return total + (fin - inicio);
    }, 0);
    
    doc.text(`Horas semanales: ${horasTotales}h`, 20, finalY + 7);
  }
  
  doc.setFontSize(8);
  doc.text(
    `Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
    105,
    285,
    { align: 'center' }
  );
  
  doc.save(`horario_${profesorName.replace(/\s+/g, '_')}.pdf`);
}