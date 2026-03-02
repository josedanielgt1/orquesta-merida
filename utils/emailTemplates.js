export function emailSolicitudAprobada(profesor, solicitud) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">✅ Solicitud Aprobada</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; margin-top: 0;">Hola <strong>${profesor.name}</strong>,</p>
        
        <p>Tu solicitud ha sido <strong style="color: #10b981;">APROBADA</strong> 🎉</p>
        
        <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #059669;">Detalles de tu clase:</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">📅 Día:</td>
              <td style="padding: 8px 0; color: #333;">${solicitud.dia}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">⏰ Horario:</td>
              <td style="padding: 8px 0; color: #333;">${solicitud.horaInicio} - ${solicitud.horaFin}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">🏫 Espacio:</td>
              <td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">${solicitud.espacioAsignado}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">📚 Tipo:</td>
              <td style="padding: 8px 0; color: #333; text-transform: capitalize;">${solicitud.tipoClase}</td>
            </tr>
            ${solicitud.semanaInicio ? `
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">📆 Semana:</td>
              <td style="padding: 8px 0; color: #333;">${new Date(solicitud.semanaInicio.seconds * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
            </tr>
            ` : ''}
          </table>
          
          ${solicitud.observaciones ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>📝 Tus observaciones:</strong><br>
              ${solicitud.observaciones}
            </p>
          </div>
          ` : ''}
        </div>
        
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            💡 <strong>Recuerda:</strong> Llega 10 minutos antes para preparar el espacio.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://orquesta-merida.vercel.app'}/dashboard/profesor" 
             style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Ver Mi Horario Completo
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          🎼 El Sistema Núcleo Mérida <br>
          Sistema de Gestión de Espacios
        </p>
      </div>
    </body>
    </html>
  `;
}

export function emailSolicitudRechazada(profesor, solicitud, motivo) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">❌ Solicitud Rechazada</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px; margin-top: 0;">Hola <strong>${profesor.name}</strong>,</p>
        
        <p>Lamentamos informarte que tu solicitud ha sido <strong style="color: #ef4444;">rechazada</strong>.</p>
        
        <div style="background: white; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #dc2626;">Detalles de la solicitud:</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">📅 Día:</td>
              <td style="padding: 8px 0; color: #333;">${solicitud.dia}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">⏰ Horario:</td>
              <td style="padding: 8px 0; color: #333;">${solicitud.horaInicio} - ${solicitud.horaFin}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">📚 Tipo:</td>
              <td style="padding: 8px 0; color: #333; text-transform: capitalize;">${solicitud.tipoClase}</td>
            </tr>
            ${solicitud.semanaInicio ? `
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">📆 Semana:</td>
              <td style="padding: 8px 0; color: #333;">${new Date(solicitud.semanaInicio.seconds * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
            </tr>
            ` : ''}
          </table>
          
          ${motivo && motivo !== 'Sin motivo especificado' ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>💬 Motivo del rechazo:</strong><br>
              <span style="color: #dc2626;">${motivo}</span>
            </p>
          </div>
          ` : ''}
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            💡 <strong>Sugerencia:</strong> Puedes intentar solicitar otro horario o espacio diferente.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://orquesta-merida.vercel.app'}/dashboard/profesor" 
             style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Crear Nueva Solicitud
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
          🎼  El Sistema Núcleo Mérida<br>
          Sistema de Gestión de Espacios
        </p>
      </div>
    </body>
    </html>
  `;
}