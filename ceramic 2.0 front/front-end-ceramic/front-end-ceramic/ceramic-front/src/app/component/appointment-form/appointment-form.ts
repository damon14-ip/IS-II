import { Component, inject, OnInit, LOCALE_ID } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; 
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ApiService } from '../../service/api.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs'; 

// Configuración de idioma Español
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
registerLocaleData(localeEs);

declare var bootstrap: any; 

// === VALIDADOR ESTRICTO DE TELÉFONO ===
export const phoneMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const tel = control.get('telefono');
  const conf = control.get('confirmarTelefono');
  return tel && conf && tel.value !== conf.value ? { phoneMismatch: true } : null;
};

@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [
    DatePipe, 
    { provide: LOCALE_ID, useValue: 'es' } 
  ],
  templateUrl: './appointment-form.html',
  styleUrls: ['./appointment-form.css']
})
export class AppointmentFormComponent implements OnInit {
  
  citaForm: FormGroup;
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private datePipe = inject(DatePipe);

  // Variables del calendario
  diasSemana: any[] = [];
  horasDia: string[] = [];
  fechaInicioSemana: Date = new Date();
  celdaSeleccionada: { fecha: string, hora: string } | null = null;

  // Variables de Estado (Para pintar colores)
  listaCitas: any[] = [];    
  listaBloqueos: any[] = []; 

  listaServicios: any[] = [];
  seleccionTexto: string = "Seleccionar Horario";

  // Variable para el Voucher
  archivoVoucher: File | null = null;

  constructor() {
    this.citaForm = this.fb.group({
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      nombre: ['', Validators.required], 
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]],
      confirmarTelefono: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]],
      idServicio: ['', Validators.required],
      fechaHora: ['', Validators.required]
    }, { validators: phoneMatchValidator }); 
  }

  ngOnInit() {
    this.generarHoras();
    this.calcularInicioSemana(new Date());
    this.cargarServicios(); 
  }

  onArchivoSeleccionado(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoVoucher = file;
    } else {
      this.archivoVoucher = null;
    }
  }

  formato12Horas(hora24: string): string {
    const [h, m] = hora24.split(':');
    let hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; 
    return `${hour}:${m} ${ampm}`;
  }

  abrirModalCalendario() {
    const modalElement = document.getElementById('calendarModal');
    if (modalElement) {
        document.body.appendChild(modalElement);
    }
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

  confirmarSeleccionModal() {
    if (this.celdaSeleccionada) {
       const fechaBonita = this.datePipe.transform(this.celdaSeleccionada.fecha, 'EEEE d MMMM', 'es');
       const horaBonita = this.formato12Horas(this.celdaSeleccionada.hora);
       
       const fechaFinal = fechaBonita?.replace(/^\w/, (c) => c.toUpperCase());
       
       this.seleccionTexto = `${fechaFinal} - ${horaBonita}`;
       
       const btnClose = document.getElementById('btnCloseModal');
       btnClose?.click();
    }
  }

  cargarServicios() {
    this.api.listarServicios().subscribe({
      next: (data) => this.listaServicios = data,
      error: (e: any) => console.error('Error cargando servicios', e)
    });
  }

  buscarDni() {
    const dni = this.citaForm.get('dni')?.value;
    if (dni && dni.length === 8) {
      Swal.fire({ title: 'Verificando...', didOpen: () => Swal.showLoading() });
      this.api.consultarReniec(dni).subscribe({
        next: (res: any) => {
          Swal.close();
          if (res.success && res.nombreCompleto) {
            this.citaForm.patchValue({ nombre: res.nombreCompleto });
            this.toast('success', 'Identidad confirmada');
          } else {
            this.manejarDniInvalido('DNI no encontrado');
          }
        },
        error: (err: any) => { 
            Swal.close(); 
            this.manejarDniInvalido('Error de conexión'); 
        }
      });
    } else {
      this.citaForm.patchValue({ nombre: '' });
    }
  }

  manejarDniInvalido(mensaje: string) {
    this.citaForm.patchValue({ nombre: '' });
    Swal.fire({ icon: 'error', title: 'Error', text: mensaje, confirmButtonColor: '#0d6efd' });
  }

  toast(icon: any, title: string) {
    Swal.fire({ toast: true, position: 'top-end', icon: icon, title: title, showConfirmButton: false, timer: 2000 });
  }

  generarHoras() {
    let hora = 8; let min = 0;
    while (hora < 20) { 
      const h = hora.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      this.horasDia.push(`${h}:${m}`);
      min += 30;
      if (min === 60) { min = 0; hora++; }
    }
  }

  calcularInicioSemana(fecha: Date) {
    const dia = fecha.getDay(); 
    const diff = fecha.getDate() - dia + (dia === 0 ? -6 : 1);
    this.fechaInicioSemana = new Date(fecha.setDate(diff));
    
    this.diasSemana = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.fechaInicioSemana);
      d.setDate(this.fechaInicioSemana.getDate() + i);
      this.diasSemana.push({
        nombre: d, 
        fecha: this.datePipe.transform(d, 'yyyy-MM-dd'),
        fechaVisual: d 
      });
    }
    this.cargarDisponibilidad();
  }

  cargarDisponibilidad() {
    const inicio = this.diasSemana[0].fecha;
    const fin = this.diasSemana[6].fecha;

    forkJoin({
      citas: this.api.getCitasRango(inicio, fin),
      bloqueos: this.api.getBloqueos(inicio, fin)
    }).subscribe({
      next: (res: any) => {
        this.listaCitas = res.citas || [];
        this.listaBloqueos = res.bloqueos || [];
      },
      error: () => console.error("Error cargando disponibilidad")
    });
  }

  obtenerEstadoSlot(fecha: string, hora: string): string {
    const fechaHoraStr = `${fecha}T${hora}:00`; 
    const slotDate = new Date(fechaHoraStr);
    const ahora = new Date();

    if (slotDate < ahora) return 'PASADO';

    const bloqueado = this.listaBloqueos.some(b => {
        let strInicio = b.inicio || b.fechaInicio;
        let strFin = b.fin || b.fechaFin;
        if (!strInicio || !strFin) return false;
        strInicio = strInicio.replace(' ', 'T');
        strFin = strFin.replace(' ', 'T');
        const inicio = new Date(strInicio).getTime();
        const fin = new Date(strFin).getTime();
        const slotInicio = slotDate.getTime();
        const slotFin = slotInicio + 1800000;
        if (inicio >= fin) return false;
        return (slotInicio < fin && slotFin > inicio);
    });
    
    if (bloqueado) return 'BLOQUEADO';

    const ocupado = this.listaCitas.some(c => {
        let strCitaInicio = c.fechaHora || '';
        strCitaInicio = strCitaInicio.replace(' ', 'T');
        const citaInicio = new Date(strCitaInicio).getTime();
        
        const slotInicioMilis = slotDate.getTime();

        let citaFin = citaInicio + 1800000; 
        if (c.fechaHoraFin) {
            let strCitaFin = c.fechaHoraFin.replace(' ', 'T');
            citaFin = new Date(strCitaFin).getTime();
        }

        const caeEnRango = slotInicioMilis >= citaInicio && slotInicioMilis < citaFin;
        const estaActiva = c.estado !== 'Cancelada' && c.estado !== 'NoAsistio';
        
        return caeEnRango && estaActiva;
    });
    
    if (ocupado) return 'OCUPADO';

    return 'LIBRE';
  }

  seleccionarCelda(fecha: string, hora: string) {
    const estado = this.obtenerEstadoSlot(fecha, hora);
    if (estado !== 'LIBRE') return; 

    this.celdaSeleccionada = { fecha, hora };
    const fechaFormateada = `${fecha} ${hora}:00`;
    this.citaForm.patchValue({ fechaHora: fechaFormateada });
  }

  agendar() {
    if (this.citaForm.invalid || !this.celdaSeleccionada || !this.archivoVoucher) {
      if (!this.archivoVoucher) {
         Swal.fire('Atención', 'Debes adjuntar la captura de tu Yape/Plin para confirmar la reserva.', 'warning');
      }
      return;
    }
    
    const datosReserva = this.citaForm.value;
    const formData = new FormData();
    
    formData.append('comprobante', this.archivoVoucher, this.archivoVoucher.name);
    formData.append('cita', JSON.stringify(datosReserva));

    Swal.fire({ title: 'Procesando...', text: 'Subiendo comprobante...', didOpen: () => Swal.showLoading() });

    this.api.crearCitaConComprobante(formData).subscribe({ 
      next: () => {
        this.notificarDoctora(datosReserva);
      },
      error: (err: any) => {
          console.error("Error devuelto por el Backend:", err);
          if(err.status === 409) {
             Swal.fire('Lo sentimos', 'Alguien acaba de ganar este horario.', 'warning');
             this.cargarDisponibilidad();
          } else {
             Swal.fire('Error', 'No se pudo reservar. Revisa que tu imagen no sea muy pesada.', 'error');
          }
      }
    });
  }

  notificarDoctora(datos: any) {
    const fechaObj = new Date(datos.fechaHora);
    const fechaBonita = this.datePipe.transform(fechaObj, 'dd/MM/yyyy h:mm a');
    
    const numeroDoctora = '51951131970'; 
    const nombreDoctora = 'Olga'; 
    
    const mensaje = `Hola Dra. *${nombreDoctora}*, soy *${datos.nombre}*.%0A` + 
                    `Acabo de solicitar una cita vía web para el: *${fechaBonita}* y he adjuntado mi comprobante de Yape.%0A` +
                    `Por favor, ingrese al sistema para validarla. Gracias.`;

    Swal.fire({
        title: '¡Reserva Enviada!',
        html: `Tu cita está <b>pendiente de validación</b> de pago.<br>Tienes un máximo de 5 minutos para que la Dra. ${nombreDoctora} lo apruebe antes de que el sistema libere el horario.`,
        icon: 'success',
        confirmButtonText: 'Avisar por WhatsApp <i class="fab fa-whatsapp"></i>',
        confirmButtonColor: '#25D366',
        showCancelButton: true,
        cancelButtonText: 'Cerrar'
    }).then((result) => {
        if (result.isConfirmed) {
            window.open(`https://wa.me/${numeroDoctora}?text=${mensaje}`, '_blank');
        }
        
        this.citaForm.reset();
        this.celdaSeleccionada = null;
        this.seleccionTexto = "Seleccionar Horario"; 
        this.archivoVoucher = null; 
        
        const inputFile = document.getElementById('inputVoucher') as HTMLInputElement;
        if(inputFile) inputFile.value = '';

        this.cargarDisponibilidad();
    });
  }

  cambiarSemana(direccion: number) {
    const nuevaFecha = new Date(this.fechaInicioSemana);
    nuevaFecha.setDate(nuevaFecha.getDate() + (direccion * 7));
    this.calcularInicioSemana(nuevaFecha);
  }

  // === NUEVA CONSULTA DE ESTADO (UI PREMIUM) ===
  abrirConsultaEstado() {
    Swal.fire({
      html: `
        <div class="text-center mt-2 mb-4">
            <!-- Icono Superior Minimalista -->
            <div class="bg-primary bg-opacity-10 rounded-circle d-inline-flex justify-content-center align-items-center mb-3" style="width: 65px; height: 65px;">
                <i class="fas fa-id-card fa-2x text-primary"></i>
            </div>
            <h4 class="fw-bold text-dark mb-1">Consultar Reserva</h4>
            <p class="text-muted small px-3">Ingresa tu número de DNI para verificar el estado de tu cita médica.</p>
        </div>
        
        <!-- Input Group estilo Píldora Moderna -->
        <div class="input-group shadow-sm mb-2 rounded-pill overflow-hidden border border-secondary border-opacity-25" style="background: #f8f9fa;">
            <span class="input-group-text bg-transparent border-0 text-primary ps-4 pe-2">
                <i class="fas fa-fingerprint fa-lg"></i>
            </span>
            <input type="text" id="dni-consulta-input" class="form-control border-0 bg-transparent shadow-none fw-bold text-center fs-5 text-dark py-3" 
                   maxlength="8" placeholder="Ej. 71458899" 
                   oninput="this.value = this.value.replace(/[^0-9]/g, '')" autocomplete="off" 
                   style="outline: none; letter-spacing: 2px;">
            <span class="input-group-text bg-transparent border-0 pe-4"></span> <!-- Espaciador para centrar texto -->
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-search me-2"></i>Buscar Cita',
      cancelButtonText: 'Cancelar',
      buttonsStyling: false, // Apagamos los botones feos por defecto
      customClass: {
        popup: 'rounded-5 shadow-lg border-0 p-4',
        confirmButton: 'btn btn-primary rounded-pill px-4 py-2 shadow-sm fw-bold mx-2',
        cancelButton: 'btn btn-light rounded-pill px-4 py-2 shadow-sm text-secondary border mx-2'
      },
      showLoaderOnConfirm: true,
      preConfirm: () => {
        // Como usamos un input HTML personalizado, capturamos el valor manualmente por su ID
        const dni = (document.getElementById('dni-consulta-input') as HTMLInputElement).value;
        if (!dni || dni.length !== 8) {
          Swal.showValidationMessage('<i class="fas fa-exclamation-circle me-1"></i> Ingresa un DNI válido de 8 dígitos');
          return false;
        }
        return new Promise((resolve) => {
          this.api.consultarEstadoCita(dni).subscribe({
            next: (res) => resolve(res),
            error: (err) => {
              if (err.status === 404) resolve(null); 
              else { Swal.showValidationMessage('<i class="fas fa-wifi me-1"></i> Error al conectar con el servidor'); resolve(false); }
            }
          });
        });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {
        if (result.value && result.value.success) {
          const cita = result.value.cita;
          const fecha = this.datePipe.transform(cita.fechaHora, 'dd/MM/yyyy h:mm a');
          
          let color = 'bg-secondary';
          if(cita.estado === 'Confirmada') color = 'bg-success'; 
          if(cita.estado === 'Pendiente') color = 'bg-warning text-dark'; 
          if(cita.estado === 'Cancelada') color = 'bg-danger'; 
          if(cita.estado === 'Observado') color = 'bg-info text-dark'; 

          Swal.fire({
            title: '<i class="fas fa-ticket-alt text-primary me-2"></i>Ticket de Cita',
            html: `
              <div class="text-start mt-3">
                  <!-- Tarjeta de Información -->
                  <div class="bg-white border rounded-4 p-4 shadow-sm mb-3 position-relative overflow-hidden">
                      <div class="position-absolute top-0 start-0 h-100 bg-primary" style="width: 5px;"></div>

                      <div class="d-flex align-items-center mb-3">
                          <div class="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 border" style="width: 42px; height: 42px;">
                              <i class="fas fa-user-injured text-primary"></i>
                          </div>
                          <div>
                              <small class="text-muted fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Paciente</small>
                              <div class="fw-bold text-dark lh-1 mt-1">${cita.paciente}</div>
                          </div>
                      </div>

                      <div class="d-flex align-items-center mb-3">
                          <div class="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 border" style="width: 42px; height: 42px;">
                              <i class="fas fa-tooth text-primary"></i>
                          </div>
                          <div>
                              <small class="text-muted fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Tratamiento</small>
                              <div class="fw-bold text-dark lh-1 mt-1">${cita.nombreServicio}</div>
                          </div>
                      </div>

                      <div class="d-flex align-items-center">
                          <div class="bg-light rounded-circle d-flex justify-content-center align-items-center me-3 border" style="width: 42px; height: 42px;">
                              <i class="far fa-calendar-check text-primary"></i>
                          </div>
                          <div>
                              <small class="text-muted fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Fecha y Hora</small>
                              <div class="fw-bold text-dark lh-1 mt-1">${fecha}</div>
                          </div>
                      </div>
                  </div>

                  <!-- Tarjeta de Estado -->
                  <div class="d-flex justify-content-between align-items-center p-3 rounded-4 border bg-light">
                      <span class="fw-bold text-secondary"><i class="fas fa-clipboard-list me-1"></i> Estado:</span>
                      <span class="badge ${color} px-3 py-2 rounded-pill shadow-sm fs-6">${cita.estado}</span>
                  </div>

                  <!-- Alerta de Observación -->
                  ${cita.estado === 'Observado' ? `
                  <div class="alert alert-warning mt-3 mb-0 rounded-4 border-warning d-flex align-items-center shadow-sm">
                      <i class="fas fa-exclamation-triangle fa-2x me-3 text-warning"></i>
                      <div class="small text-dark lh-sm">
                          <b>Comprobante Observado:</b><br>
                          Comunícate con recepción rápidamente antes de que tu horario sea liberado.
                      </div>
                  </div>` : ''}
              </div>
            `,
            confirmButtonText: '<i class="fas fa-check me-1"></i> Entendido',
            confirmButtonColor: '#0d6efd',
            width: '480px',
            customClass: {
              popup: 'rounded-5 shadow-lg border-0 p-3'
            }
          });
        } else if (result.value === null) {
          Swal.fire({
            icon: 'info',
            title: 'No encontrada',
            text: 'No tienes ninguna cita registrada con este DNI.',
            confirmButtonColor: '#0d6efd',
            customClass: { popup: 'rounded-4 shadow-lg border-0' }
          });
        }
      }
    });
  }
}