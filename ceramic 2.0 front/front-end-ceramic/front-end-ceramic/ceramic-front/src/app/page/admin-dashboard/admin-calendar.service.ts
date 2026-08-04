import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AdminCalendarService {

  constructor() { }

  // ==========================================
  // MENSAJES DEL SISTEMA
  // ==========================================
  mostrarError(mensaje: string) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: mensaje, confirmButtonColor: '#0056b3' });
  }

  mostrarExito(titulo: string, mensaje: string) {
    Swal.fire({ icon: 'success', title: titulo, text: mensaje, timer: 2000, showConfirmButton: false });
  }

  // ==========================================
  // FORMATEADOR DE EVENTOS PARA EL CALENDARIO
  // ==========================================
  formatearEventos(citas: any[], bloqueos: any[]): any[] {
    const eventos: any[] = [];

    if (citas && citas.length > 0) {
      citas.forEach(cita => {
        eventos.push({
          id: cita.idCita,
          title: `${cita.paciente} - ${cita.nombreServicio}`,
          start: cita.fechaHora.replace(' ', 'T'),
          end: cita.fechaHoraFin ? cita.fechaHoraFin.replace(' ', 'T') : null,
          backgroundColor: cita.estado === 'Confirmada' ? '#28a745' : '#ffc107',
          borderColor: cita.estado === 'Confirmada' ? '#28a745' : '#ffc107',
          textColor: cita.estado === 'Confirmada' ? 'white' : 'black',
          extendedProps: { tipo: 'cita', ...cita }
        });
      });
    }

    if (bloqueos && bloqueos.length > 0) {
      bloqueos.forEach(bloqueo => {
        eventos.push({
          id: bloqueo.idBloqueo,
          title: 'Feriado / Bloqueado',
          start: bloqueo.fechaInicio.replace(' ', 'T'),
          end: bloqueo.fechaFin.replace(' ', 'T'),
          backgroundColor: '#dc3545',
          borderColor: '#dc3545',
          textColor: 'white',
          extendedProps: { tipo: 'bloqueo' }
        });
      });
    }

    return eventos;
  }

  // ==========================================
  // INTERACCIONES VISUALES (Swal2)
  // ==========================================
  async confirmarBloqueoVisual(start: Date, end: Date): Promise<boolean> {
    const result = await Swal.fire({
      title: 'Bloquear Horario', text: '¿Deseas cerrar este rango de horas para que nadie pueda agendar?',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, bloquear', cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
  }

  async confirmarDesbloqueo(): Promise<boolean> {
    const result = await Swal.fire({
      title: 'Desbloquear Horario', text: 'Este horario volverá a estar disponible para citas.',
      icon: 'question', showCancelButton: true, confirmButtonColor: '#28a745', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, liberar', cancelButtonText: 'Cancelar'
    });
    return result.isConfirmed;
  }

  async confirmarEliminacion(): Promise<boolean> {
    const result = await Swal.fire({
      title: '¿Cancelar cita?', text: 'El estado cambiará a cancelado pero no se borrará del historial.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar cita', cancelButtonText: 'No, mantener'
    });
    return result.isConfirmed;
  }

  // ==========================================
  // MODAL PREMIUM PARA BLOQUEO RÁPIDO
  // ==========================================
  async solicitarRangoBloqueo(): Promise<{inicio: string, fin: string} | null> {
    const { value: formValues } = await Swal.fire({
      title: '<i class="fas fa-calendar-times text-danger me-2"></i> Bloqueo Manual',
      html: `
        <!-- Botones de Acción Rápida (Heurística 6) -->
        <div class="d-flex justify-content-center gap-2 mt-2 mb-4">
            <button id="btn-hoy" class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm fw-bold">Bloquear Hoy</button>
            <button id="btn-manana" class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm fw-bold">Bloquear Mañana</button>
        </div>

        <div class="text-start mb-4">
          <label class="form-label small fw-bold text-secondary mb-1">Inicio del Bloqueo</label>
          <div class="input-group shadow-sm rounded-3 overflow-hidden">
              <span class="input-group-text bg-light border-secondary-subtle text-primary border-end-0">
                  <i class="fas fa-calendar-plus"></i>
              </span>
              <input type="datetime-local" id="swal-input1" class="form-control py-2 shadow-none border-secondary-subtle border-start-0 ps-0">
          </div>
        </div>
        <div class="text-start mb-2">
          <label class="form-label small fw-bold text-secondary mb-1">Fin del Bloqueo</label>
          <div class="input-group shadow-sm rounded-3 overflow-hidden">
              <span class="input-group-text bg-light border-secondary-subtle text-danger border-end-0">
                  <i class="fas fa-calendar-times"></i>
              </span>
              <input type="datetime-local" id="swal-input2" class="form-control py-2 shadow-none border-secondary-subtle border-start-0 ps-0">
          </div>
        </div>
      `,
      customClass: {
          popup: 'rounded-4 shadow-lg border-0',
          title: 'fs-4 fw-bold text-dark',
          confirmButton: 'btn btn-danger fw-bold px-4 rounded-pill shadow-sm mx-2',
          cancelButton: 'btn btn-light fw-bold px-4 rounded-pill text-secondary border shadow-sm mx-2'
      },
      buttonsStyling: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-lock me-1"></i> Bloquear Rango',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      
      // Lógica de llenado automático para los botones rápidos
      didOpen: () => {
        const inputInicio = document.getElementById('swal-input1') as HTMLInputElement;
        const inputFin = document.getElementById('swal-input2') as HTMLInputElement;
        
        const setFechas = (diasAumento: number) => {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + diasAumento);
            const base = fecha.toISOString().split('T')[0];
            inputInicio.value = `${base}T08:00`; // Abre a las 8 AM
            inputFin.value = `${base}T20:00`;    // Cierra a las 8 PM
        };

        document.getElementById('btn-hoy')?.addEventListener('click', () => setFechas(0));
        document.getElementById('btn-manana')?.addEventListener('click', () => setFechas(1));
      },

      preConfirm: () => {
        const i = (document.getElementById('swal-input1') as HTMLInputElement).value;
        const f = (document.getElementById('swal-input2') as HTMLInputElement).value;
        
        const fechaInicio = new Date(i);
        const fechaFin = new Date(f);
        const ahora = new Date();
        
        // 1. Validar que no estén vacíos
        if (!i || !f) { 
            Swal.showValidationMessage('Ambas fechas son obligatorias'); 
            return false; 
        }
        
        // 2. Validar que no sea una fecha pasada
        // Comparamos restando un minuto para dar margen al usuario si bloquea algo que acaba de pasar
        if (fechaInicio < ahora) { 
            Swal.showValidationMessage('<i class="fas fa-exclamation-triangle"></i> No puedes bloquear fechas pasadas o ya vencidas'); 
            return false; 
        }

        // 3. Validar Lógica de Tiempo (Inicio vs Fin)
        if (fechaInicio >= fechaFin) { 
            Swal.showValidationMessage('<i class="fas fa-exclamation-triangle"></i> La fecha final debe ser posterior a la inicial'); 
            return false; 
        }
        
        return { inicio: i.replace('T', ' '), fin: f.replace('T', ' ') };
      }
    });
    return formValues ? formValues : null;
  }

  // ==========================================
  // MODAL PREMIUM PARA CONFIRMAR CITA Y HORA FIN
  // ==========================================
  async solicitarHoraFin(cita: any): Promise<string | null> {
    const { value: horaFin } = await Swal.fire({
      title: '<i class="fas fa-check-circle text-success me-2"></i> Confirmar Atención',
      html: `
        <div class="text-start mt-3">
          <p class="text-secondary mb-3">Indica la hora aproximada en la que finalizará la cita de <strong class="text-dark">${cita.paciente || cita.nombre}</strong>.</p>
          <label class="form-label small fw-bold text-secondary mb-1">Hora de Finalización</label>
          <div class="input-group shadow-sm rounded-3 overflow-hidden mb-2">
              <span class="input-group-text bg-light border-secondary-subtle text-success border-end-0">
                  <i class="far fa-clock"></i>
              </span>
              <input type="time" id="swal-input-hora" class="form-control py-2 shadow-none border-secondary-subtle border-start-0 ps-0">
          </div>
        </div>
      `,
      customClass: {
          popup: 'rounded-4 shadow-lg border-0',
          title: 'fs-4 fw-bold text-dark',
          confirmButton: 'btn btn-success fw-bold px-4 rounded-pill shadow-sm mx-2',
          cancelButton: 'btn btn-light fw-bold px-4 rounded-pill text-secondary border shadow-sm mx-2'
      },
      buttonsStyling: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-calendar-check me-1"></i> Confirmar Cita',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const h = (document.getElementById('swal-input-hora') as HTMLInputElement).value;
        if (!h) {
            Swal.showValidationMessage('<i class="fas fa-exclamation-triangle"></i> Debes ingresar una hora de fin');
            return false;
        }
        return h;
      }
    });
    return horaFin ? horaFin : null;
  }

  // === DETALLE DE CITA CON BOTÓN LEGAL ===
  mostrarDetalleCita(cita: any) {
    Swal.fire({
      title: '<i class="fas fa-calendar-day text-primary me-2"></i> Detalle de la Cita',
      html: `
        <div class="text-start bg-light p-3 rounded-3 shadow-sm border mb-3">
          <p class="mb-2"><strong><i class="fas fa-user me-2 text-secondary"></i>Paciente:</strong> ${cita.paciente || cita.nombre}</p>
          <p class="mb-2"><strong><i class="fas fa-id-card me-2 text-secondary"></i>DNI:</strong> ${cita.dni || 'No registrado'}</p>
          <p class="mb-2"><strong><i class="fas fa-tooth me-2 text-secondary"></i>Servicio:</strong> ${cita.nombreServicio || 'Atención General'}</p>
          <p class="mb-2"><strong><i class="fas fa-clock me-2 text-secondary"></i>Fecha/Hora:</strong> ${cita.fechaHora}</p>
          <p class="mb-0"><strong><i class="fas fa-info-circle me-2 text-secondary"></i>Estado:</strong> <span class="badge bg-primary">${cita.estado}</span></p>
        </div>
        <div class="mt-2 text-center">
          <button id="btn-consentimiento" class="btn btn-outline-dark w-100 shadow-sm rounded-3 py-2 fw-bold" style="border-width: 2px;">
              <i class="fas fa-file-signature me-2"></i> Generar Consentimiento Legal
          </button>
        </div>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#0056b3',
      customClass: { popup: 'rounded-4' },
      didOpen: () => {
        const btnLegal = document.getElementById('btn-consentimiento');
        if (btnLegal) {
          btnLegal.addEventListener('click', () => {
            this.generarConsentimientoPDF(cita);
          });
        }
      }
    });
  }

  // ==========================================================
  // MOTOR DE NOTIFICACIONES WHATSAPP (Requisito RS009)
  // ==========================================================
  enviarWhatsApp(cita: any, horaFin: string | null, estado: string) {
    if (!cita.telefono) {
      Swal.fire({ icon: 'info', title: 'Sin Contacto', text: 'El paciente no tiene un número registrado.', confirmButtonColor: '#0056b3' });
      return;
    }
    let telefono = cita.telefono.replace(/\s+/g, '');
    if (telefono.length === 9 && !telefono.startsWith('+')) telefono = '51' + telefono; 
    else if (telefono.startsWith('+')) telefono = telefono.substring(1); 

    const fechaObj = new Date(cita.fechaHora);
    const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const fechaTexto = fechaObj.toLocaleDateString('es-ES', opcionesFecha);
    const opcionesHora: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const horaInicio = fechaObj.toLocaleTimeString('es-ES', opcionesHora);
    
    let mensaje = '';
    if (estado === 'Confirmada') {
        mensaje = `Hola *${cita.paciente || cita.nombre}* 👋,\n\nTe escribimos de *Ceramic Dent* para confirmarte tu cita odontológica.\n\n✅ *Estado:* CONFIRMADA\n🦷 *Tratamiento:* ${cita.nombreServicio || cita.servicio || 'Atención General'}\n📅 *Fecha:* ${fechaTexto}\n⏰ *Hora:* ${horaInicio}\n\n📍 Recuerda llegar 5 minutos antes. ¡Te esperamos para cuidar de tu sonrisa! ✨`;
    } else if (estado === 'Cancelada') {
        mensaje = `Hola *${cita.paciente || cita.nombre}* 👋,\n\nTe informamos desde *Ceramic Dent* que tu cita programada para el *${fechaTexto}* a las *${horaInicio}* ha sido ❌ *CANCELADA*.\n\nSi deseas reprogramarla, puedes responder a este mensaje o ingresar a nuestro portal web. ¡Que tengas un excelente día! ✨`;
    }
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    
    Swal.fire({
      title: 'Notificar al Paciente', html: `¿Deseas enviar el mensaje automático por WhatsApp a <strong>${cita.paciente || cita.nombre || 'el paciente'}</strong>?`,
      icon: 'question', showCancelButton: true, confirmButtonText: '<i class="fab fa-whatsapp me-2"></i> Abrir WhatsApp',
      cancelButtonText: 'No, omitir', confirmButtonColor: '#25D366', cancelButtonColor: '#6c757d', customClass: { popup: 'rounded-4' }
    }).then((result) => {
      if (result.isConfirmed) { window.open(url, '_blank'); }
    });
  }

  // ==========================================================
  // GENERADOR DE CONSENTIMIENTO INFORMADO (Requisito RS010)
  // ==========================================================
  generarConsentimientoPDF(cita: any) {
    const ventana = window.open('', '_blank');
    if (!ventana) {
        Swal.fire('Atención', 'Por favor permite las ventanas emergentes (pop-ups) para imprimir el documento.', 'warning');
        return;
    }

    const fechaObj = new Date(cita.fechaHora);
    const fechaTexto = fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const nombreTratamiento = cita.nombreServicio || 'Atención Odontológica General';
    const nombrePaciente = cita.paciente || cita.nombre || '__________________________';
    const dniPaciente = cita.dni || '________________';

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Consentimiento Informado - ${nombrePaciente}</title>
            <style>
                body { font-family: 'Times New Roman', serif; color: #000; padding: 40px; margin: 0; line-height: 1.6; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
                .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                .header h2 { margin: 5px 0 0 0; font-size: 18px; font-weight: normal; }
                
                .content { text-align: justify; font-size: 15px; }
                .content p { margin-bottom: 15px; }
                .highlight { font-weight: bold; text-decoration: underline; }
                
                .signatures { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; }
                .signature-box { text-align: center; width: 45%; }
                .line { border-top: 1px solid #000; width: 100%; margin-bottom: 5px; }
                
                .fingerprint-box { border: 1px solid #000; width: 60px; height: 80px; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 12px;}
                
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>CERAMIC DENT</h1>
                <h2>Documento de Consentimiento Informado Odontológico</h2>
            </div>

            <div class="content">
                <p>En la ciudad de Abancay, con fecha <strong>${fechaTexto}</strong>, yo, <strong>${nombrePaciente}</strong>, identificado(a) con DNI N° <strong>${dniPaciente}</strong>, actuando por mi propia voluntad y en pleno uso de mis facultades mentales, declaro lo siguiente:</p>
                
                <p>1. <strong>INFORMACIÓN DEL TRATAMIENTO:</strong> He sido informado(a) de manera clara, comprensible y suficiente por el/la Especialista Odontólogo(a) de la clínica Ceramic Dent acerca de mi diagnóstico y del plan de tratamiento propuesto, el cual consiste en: <span class="highlight">${nombreTratamiento.toUpperCase()}</span>.</p>
                
                <p>2. <strong>RIESGOS Y ALTERNATIVAS:</strong> Se me han explicado las molestias, riesgos previsibles y posibles complicaciones asociadas a este procedimiento, así como a la aplicación de anestesia local (si fuera el caso). Comprendo que la odontología no es una ciencia exacta, por lo que no se me pueden garantizar resultados infalibles, aunque sé que se utilizarán todos los medios técnicos y humanos adecuados.</p>
                
                <p>3. <strong>AUTORIZACIÓN:</strong> Doy mi consentimiento libre y voluntario para que el personal profesional de Ceramic Dent realice el tratamiento odontológico mencionado, autorizando también las modificaciones en el plan de tratamiento que el profesional considere clínicamente necesarias durante la intervención por mi salud y beneficio.</p>
                
                <p>4. <strong>COMPROMISO:</strong> Me comprometo a seguir estrictamente las indicaciones postoperatorias, asistir a las citas de control y mantener una higiene bucal adecuada para el éxito del tratamiento.</p>
            </div>

            <div class="signatures">
                <div class="signature-box">
                    <div class="fingerprint-box">Huella</div>
                    <div class="line"></div>
                    <strong>Firma del Paciente</strong><br>
                    DNI: ${dniPaciente}
                </div>
                
                <div class="signature-box">
                    <br><br><br><br><br>
                    <div class="line"></div>
                    <strong>Firma y Sello del Odontólogo(a)</strong><br>
                    Ceramic Dent D&O
                </div>
            </div>

            <script>
                window.onload = function() { 
                    setTimeout(function() {
                        window.print(); 
                        window.close();
                    }, 250); 
                }
            </script>
        </body>
        </html>
    `;

    ventana.document.write(html);
    ventana.document.close();
  }
}