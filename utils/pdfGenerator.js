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

export function generarPDFPorProfesor(solicitudes, nombreProfesor, tituloSemana) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(`Horario de ${nombreProfesor}`, 14, 20);

  // Filtrar solo aprobadas y ordenar por semana y día
  const aprobadas = solicitudes
    .filter(s => s.estado === 'aprobada')
    .sort((a, b) => {
      // Primero por semana
      if (a.semanaId && b.semanaId) {
        const compareSemana = a.semanaId.localeCompare(b.semanaId);
        if (compareSemana !== 0) return compareSemana;
      }
      
      // Luego por día
      const diasOrden = {
        'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
        'Jueves': 4, 'Viernes': 5, 'Sábado': 6
      };
      const diaA = diasOrden[a.dia] || 0;
      const diaB = diasOrden[b.dia] || 0;
      if (diaA !== diaB) return diaA - diaB;
      
      // Finalmente por hora
      return a.horaInicio.localeCompare(b.horaInicio);
    });

  if (aprobadas.length === 0) {
    doc.setFontSize(12);
    doc.text('No hay clases aprobadas', 14, 40);
    doc.save(`horario_${nombreProfesor.replace(/\s/g, '_')}.pdf`);
    return;
  }

  // Agrupar por semana
  const porSemana = {};
  aprobadas.forEach(s => {
    const semanaKey = s.semanaId || 'Sin fecha';
    if (!porSemana[semanaKey]) {
      porSemana[semanaKey] = [];
    }
    porSemana[semanaKey].push(s);
  });

  let startY = 30;

  // Generar tabla por cada semana
  Object.keys(porSemana).sort().forEach((semanaKey, idx) => {
    const clasesSemana = porSemana[semanaKey];
    
    // Formatear fecha de la semana
    let semanaTexto = semanaKey;
    if (clasesSemana[0].semanaInicio) {
      try {
        const fecha = clasesSemana[0].semanaInicio.toDate 
          ? clasesSemana[0].semanaInicio.toDate()
          : new Date(clasesSemana[0].semanaInicio);
        semanaTexto = `Semana del ${fecha.toLocaleDateString('es-ES', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        })}`;
      } catch {}
    }

    // Nueva página para cada semana (excepto la primera)
    if (idx > 0) {
      doc.addPage();
      startY = 20;
    }

    // Título de la semana
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(semanaTexto, 14, startY);
    startY += 10;

    // Preparar datos de la tabla
    const tableData = clasesSemana.map(s => [
      s.dia,
      `${s.horaInicio} - ${s.horaFin}`,
      s.espacioAsignado || 'Sin asignar',
      s.tipoClase || 'Individual'
    ]);

    // Generar tabla
    autoTable(doc, {
      startY: startY,
      head: [['Día', 'Horario', 'Espacio', 'Tipo']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    });

    startY = doc.lastAutoTable.finalY + 15;
  });

  // Guardar
  const filename = `horario_${nombreProfesor.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(filename);
}