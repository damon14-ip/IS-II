import { Component, OnInit, AfterViewInit, inject, HostListener } from '@angular/core'; 
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { AdminCalendarService } from './admin-calendar.service'; 
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg } from '@fullcalendar/core'; 
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { forkJoin } from 'rxjs'; 
import Swal from 'sweetalert2'; 
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PacientesListComponent } from '../../component/pacientes-list/pacientes-list';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts'; 
import { ChartConfiguration, ChartOptions } from 'chart.js'; 

declare var bootstrap: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule, PacientesListComponent, BaseChartDirective],
  providers: [
    DatePipe, 
    AdminCalendarService,
    provideCharts(withDefaultRegisterables()) 
  ], 
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {

  vistaActual: any = 'inicio';
  citas: any[] = [];
  
  fechaInicioFiltro: string = '';
  fechaFinFiltro: string = '';
  filtroEstado: string = 'Todos'; 

  totalCitasDashboard: number = 0;
  atendidasDashboard: number = 0;
  pendientesDashboard: number = 0;
  canceladasDashboard: number = 0;
  tasaEfectividad: number = 0;
  tratamientoEstrella: string = 'Procesando...';

  public doughnutChartOptions: ChartOptions<'doughnut'> = { responsive: true, maintainAspectRatio: false };
  public doughnutChartData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };

  public barChartOptions: ChartOptions<'bar'> = { 
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { legend: { display: false } } 
  };
  public barChartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  listaBloqueos: any[] = [];
  nuevoBloqueo = { inicio: '', fin: '', motivo: '' };
  
  private api = inject(ApiService);
  private router = inject(Router);
  private calendarService = inject(AdminCalendarService); 
  private datePipe = inject(DatePipe); 

  @HostListener('window:pageshow', ['$event'])
  onPageShow(event: any) {
    if (event.persisted) {
      const token = localStorage.getItem('token_ceramic_dent');
      if (!token) window.location.reload();
    }
  }

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    timeZone: 'local',
    initialView: 'timeGridWeek',
    locale: esLocale,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    allDaySlot: false,
    selectable: true, 
    selectMirror: true, 
    select: this.handleDateSelect.bind(this), 
    events: [],
    eventClick: this.handleEventClick.bind(this),
    height: 'auto',
    expandRows: true,
    nowIndicator: true,
  };

  ngOnInit() { 
    const hoy = new Date();
    this.fechaInicioFiltro = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    this.fechaFinFiltro = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    this.cargarDatos(); 
  }

  ngAfterViewInit() {
    this.inicializarTooltips();
  }

  inicializarTooltips() {
    setTimeout(() => {
      const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.map(function (tooltipTriggerEl: any) {
        const instance = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (instance) { instance.dispose(); }
        return new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }, 300);
  }

  get citasFiltradas() {
    return this.citas.filter(c => {
      const fechaCita = c.fechaHora.split(' ')[0];
      const pasaEstado = this.filtroEstado === 'Todos' || c.estado === this.filtroEstado;
      const pasaFecha = fechaCita >= this.fechaInicioFiltro && fechaCita <= this.fechaFinFiltro;
      return pasaEstado && pasaFecha;
    });
  }

  onFiltroChange() {
    this.procesarMetricasDashboard();
  }

  procesarMetricasDashboard() {
    const data = this.citasFiltradas;
    
    this.totalCitasDashboard = data.length;
    this.atendidasDashboard = data.filter(c => c.estado === 'Confirmada').length;
    // El Limbo ('Observado') cuenta momentáneamente como Pendiente en las métricas
    this.pendientesDashboard = data.filter(c => c.estado === 'Pendiente' || c.estado === 'Observado').length;
    this.canceladasDashboard = data.filter(c => c.estado === 'Cancelada').length;

    if (this.totalCitasDashboard > 0) {
      this.tasaEfectividad = Math.round(((this.atendidasDashboard + this.pendientesDashboard) / this.totalCitasDashboard) * 100);
    } else {
      this.tasaEfectividad = 0;
    }

    const conteoServicios: { [key: string]: number } = {};
    data.forEach(c => {
      const s = c.nombreServicio || c.tratamiento || 'General';
      conteoServicios[s] = (conteoServicios[s] || 0) + 1;
    });

    if (Object.keys(conteoServicios).length > 0) {
      this.tratamientoEstrella = Object.keys(conteoServicios).reduce((a, b) => conteoServicios[a] > conteoServicios[b] ? a : b);
    } else {
      this.tratamientoEstrella = 'Sin datos';
    }

    this.actualizarGraficos(data, conteoServicios);
    this.inicializarTooltips();
  }

  actualizarGraficos(data: any[], conteoServicios: any) {
    this.doughnutChartData = {
      labels: Object.keys(conteoServicios),
      datasets: [{
        data: Object.values(conteoServicios),
        backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#0dcaf0'],
        borderWidth: 0
      }]
    };

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const conteoDias: { [key: string]: number } = { 'Lunes': 0, 'Martes': 0, 'Miércoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sábado': 0, 'Domingo': 0 };

    data.forEach(c => {
      const fecha = new Date(c.fechaHora);
      let dia = fecha.getDay(); 
      dia = dia === 0 ? 6 : dia - 1; 
      conteoDias[diasSemana[dia]]++;
    });

    this.barChartData = {
      labels: diasSemana,
      datasets: [{
        label: 'Citas',
        data: Object.values(conteoDias),
        backgroundColor: '#0d6efd',
        borderRadius: 6
      }]
    };
  }

  cargarDatos() {
    this.api.listarCitas().subscribe({
      next: (data) => {
        this.citas = data;
        this.procesarMetricasDashboard(); 
      },
      error: () => this.calendarService.mostrarError('Error al cargar tabla')
    });

    const currentYear = new Date().getFullYear();
    const inicio = `${currentYear}-01-01`; 
    const fin = `${currentYear + 1}-12-31`; 

    forkJoin({
      citas: this.api.listarConfirmadas(),
      bloqueos: this.api.getBloqueos(inicio, fin)
    }).subscribe({
      next: (res) => {
        const eventosCombinados = this.calendarService.formatearEventos(res.citas, res.bloqueos);
        this.calendarOptions = { ...this.calendarOptions, events: eventosCombinados };
        this.listaBloqueos = res.bloqueos;
      },
      error: (err) => console.error(err)
    });
  }

// === MODERNO VISOR DE VOUCHER (UX/UI SENIOR) ===
  verVoucher(cita: any) {
    if (!cita.comprobantePago) {
        Swal.fire({
            icon: 'info',
            title: 'Sin Comprobante',
            text: 'Esta cita fue registrada sin adjuntar imagen.',
            confirmButtonColor: '#0d6efd'
        });
        return;
    }

    const urlImagen = cita.comprobantePago.startsWith('data:image') 
                      ? cita.comprobantePago 
                      : `http://localhost:3000/uploads/${cita.comprobantePago}`;

    Swal.fire({
      title: `<span class="fw-bold text-dark fs-5"><i class="fas fa-receipt text-primary me-2"></i>Validación de Voucher</span>`,
      html: `
        <div class="text-center">
            <!-- Contenedor Estilo Tarjeta con Sombra y Bordes Suaves -->
            <div class="p-2 bg-light border rounded-4 shadow-sm mb-3 d-inline-block overflow-hidden position-relative">
                <img src="${urlImagen}" alt="Voucher Yape" class="img-fluid rounded-3" style="max-height: 350px; object-fit: contain; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
            </div>

            <!-- Píldoras de Información (UX Limpia) -->
            <div class="d-flex justify-content-center gap-2 flex-wrap mb-1">
                <span class="badge bg-white text-dark border px-3 py-2 shadow-sm rounded-pill fw-medium">
                    <i class="far fa-id-card text-primary me-1"></i> DNI: <b>${cita.dni || '---'}</b>
                </span>
                <span class="badge bg-white text-dark border px-3 py-2 shadow-sm rounded-pill fw-medium">
                    <i class="fas fa-user-injured text-success me-1"></i> Paciente: <b>${cita.paciente}</b>
                </span>
            </div>
            <small class="text-muted d-block mt-2" style="font-size: 0.8rem;">
                <i class="fas fa-info-circle me-1"></i> Pasa el cursor sobre la imagen para hacer zoom automático.
            </small>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: '<i class="fas fa-check me-1"></i> Cerrar Visor',
      confirmButtonColor: '#0d6efd',
      width: '520px',
      customClass: {
        popup: 'rounded-5 shadow-lg border-0 p-4'
      }
    });
  }

  // === NUEVO: MANDAR AL LIMBO (5 MIN) ===
  mandarALimbo(cita: any) {
    Swal.fire({
      title: '¿Mandar a Observación?',
      html: `El paciente tendrá <b>5 minutos</b> para enviar el voucher correcto por WhatsApp antes de perder su reserva.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, Observar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ffc107',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.observarCita(cita.idCita).subscribe({
          next: () => {
            this.cargarDatos();
            this.calendarService.mostrarExito('En Observación', 'El horario estará bloqueado solo por 5 min más.');
            
            if (cita.telefono) {
              const msg = `Hola ${cita.paciente}, hemos tenido un problema validando tu captura de Yape/Plin.%0A%0ATienes *5 minutos* para enviarnos la foto correcta por este chat, caso contrario tu reserva se liberará automáticamente.`;
              window.open(`https://wa.me/51${cita.telefono}?text=${msg}`, '_blank');
            }
          },
          error: () => this.calendarService.mostrarError('Error al cambiar de estado')
        });
      }
    });
  }

  crearBloqueoAdmin() {
    const fechaInicio = new Date(this.nuevoBloqueo.inicio);
    const fechaFin = new Date(this.nuevoBloqueo.fin);
    const ahora = new Date();

    if (!this.nuevoBloqueo.inicio || !this.nuevoBloqueo.fin) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Debes seleccionar fecha de inicio y fin.', confirmButtonColor: '#0d6efd' });
      return;
    }

    if (fechaInicio < ahora) {
      Swal.fire({ icon: 'error', title: 'Fecha inválida', text: 'No puedes bloquear fechas pasadas.', confirmButtonColor: '#dc3545' });
      return;
    }

    if (fechaInicio >= fechaFin) {
      Swal.fire({ icon: 'error', title: 'Error de rango', text: 'La fecha final debe ser posterior a la de inicio.', confirmButtonColor: '#dc3545' });
      return;
    }

    this.api.bloquearHorario(this.nuevoBloqueo.inicio, this.nuevoBloqueo.fin).subscribe({
      next: () => {
        Swal.fire('Bloqueado', 'El feriado ha sido creado.', 'success');
        this.cargarDatos(); 
        this.nuevoBloqueo = { inicio: '', fin: '', motivo: '' }; 
      },
      error: () => Swal.fire('Error', 'No se pudo crear el bloqueo', 'error')
    });
  }

  borrarBloqueo(id: number) {
    Swal.fire({
      title: '¿Eliminar Feriado?',
      text: "El horario volverá a estar disponible.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.eliminarBloqueo(id).subscribe({
          next: () => {
            this.cargarDatos();
            Swal.fire('Eliminado', 'Bloqueo removido.', 'success');
          },
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  async handleDateSelect(selectInfo: DateSelectArg) {
    const calendarApi = selectInfo.view.calendar;
    const confirmado = await this.calendarService.confirmarBloqueoVisual(selectInfo.start, selectInfo.end);

    if (confirmado) {
      const inicio = this.formatoFechaLocal(selectInfo.start);
      const fin = this.formatoFechaLocal(selectInfo.end);

      this.api.bloquearHorario(inicio, fin).subscribe({
        next: () => {
          this.calendarService.mostrarExito('Bloqueado', 'El horario ha sido cerrado.');
          this.cargarDatos(); 
        },
        error: () => this.calendarService.mostrarError('No se pudo bloquear')
      });
    }
    calendarApi.unselect();
  }

  async bloquearHorario() {
     const rango = await this.calendarService.solicitarRangoBloqueo();
     if (rango) {
       this.api.bloquearHorario(rango.inicio, rango.fin).subscribe({
         next: () => {
           this.cargarDatos();
           this.calendarService.mostrarExito('Bloqueado', 'Horario cerrado manualmente');
         },
         error: () => this.calendarService.mostrarError('Error al bloquear')
       });
     }
  }

  formatoFechaLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  async handleEventClick(info: any) {
    const props = info.event.extendedProps;

    if (props.tipo === 'bloqueo') {
      const confirmar = await this.calendarService.confirmarDesbloqueo();
      if (confirmar) {
        this.api.eliminarBloqueo(Number(info.event.id)).subscribe(() => {
          info.event.remove();
          this.calendarService.mostrarExito('Liberado', 'Horario disponible nuevamente');
        });
      }
    } else {
      this.calendarService.mostrarDetalleCita(props);
    }
  }

// === ACTUALIZADO: CONFIRMACIÓN CON BLOQUEO DINÁMICO DE RANGOS ===
  async confirmar(cita: any) {
    // 1. Extraemos la hora exacta en la que empieza la cita
    const inicioStr = cita.fechaHora.replace(' ', 'T');
    const fechaInicio = new Date(inicioStr);

    // 2. Mostramos un SweetAlert premium pidiendo la duración del tratamiento
    const { value: duracionMinutos } = await Swal.fire({
      title: '<i class="fas fa-calendar-check text-success me-2"></i>Confirmar y Bloquear Agenda',
      html: `¿Cuánto tiempo tomará el tratamiento de <b>${cita.paciente}</b>?<br><small class="text-muted mt-2 d-block">El calendario se bloqueará automáticamente durante este lapso para evitar cruces.</small>`,
      input: 'select',
      inputOptions: {
        '30': '⏱️ 30 Minutos (1 bloque estándar)',
        '60': '⏳ 1 Hora (2 bloques)',
        '90': '🕰️ 1 Hora y Media (3 bloques)',
        '120': '⌛ 2 Horas (4 bloques)',
        '180': '📅 3 Horas (Medio Turno)'
      },
      inputPlaceholder: 'Selecciona la duración...',
      showCancelButton: true,
      confirmButtonText: 'Confirmar y Bloquear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#198754',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes elegir la duración del tratamiento para bloquear la agenda';
        }
        return null;
      }
    });

    // 3. Si la Dra. elige una opción, hacemos los cálculos matemáticos
    if (duracionMinutos) {
      // Calculamos la hora de fin sumando los milisegundos
      const milisegundosExtra = parseInt(duracionMinutos) * 60000;
      const fechaFin = new Date(fechaInicio.getTime() + milisegundosExtra);

      // Formateamos la hora fin estrictamente para MySQL (YYYY-MM-DD HH:mm:ss)
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fechaHoraFinStr = `${fechaFin.getFullYear()}-${pad(fechaFin.getMonth() + 1)}-${pad(fechaFin.getDate())} ${pad(fechaFin.getHours())}:${pad(fechaFin.getMinutes())}:00`;

      // 4. Enviamos al backend el rango completo
      this.api.confirmarCita(cita.idCita, fechaHoraFinStr).subscribe({
        next: () => {
          this.cargarDatos();
          
          // Formateamos la hora de salida para que se vea bonita en WhatsApp (Ej. "11:30 AM")
          const horaFinBonita = this.datePipe.transform(fechaFin, 'shortTime') || '';
          
          this.calendarService.mostrarExito('Cita Confirmada', `La agenda se bloqueó por ${duracionMinutos} minutos.`);
          this.calendarService.enviarWhatsApp(cita, horaFinBonita, 'Confirmada');
        },
        error: () => this.calendarService.mostrarError('Error de red al intentar confirmar la cita')
      });
    }
  }

  async terminarCita(id: number) {
    const citaCompleta = this.citas.find(c => c.idCita === id);
    const confirmado = await this.calendarService.confirmarEliminacion();
    
    if (confirmado) {
      this.api.eliminarCita(id).subscribe({
        next: () => {
          this.cargarDatos();
          this.calendarService.mostrarExito('Cancelada', 'La cita ha sido anulada');
          if(citaCompleta) {
             this.calendarService.enviarWhatsApp(citaCompleta, null, 'Cancelada');
          }
        },
        error: () => this.calendarService.mostrarError('Error al eliminar')
      });
    }
  }

  logout() { 
    localStorage.removeItem('token_ceramic_dent'); 
    localStorage.removeItem('usuario'); 
    this.router.navigate(['/'], { replaceUrl: true }).then(() => {
        window.location.reload();
    });
  }

  async exportarExcel() {
    if (this.citasFiltradas.length === 0) {
      Swal.fire('Sin datos', 'No hay citas para exportar con el filtro actual.', 'info');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ceramic Dent Admin';
    const worksheet = workbook.addWorksheet('Reporte de Citas');

    worksheet.columns = [
      { header: 'N°', key: 'id', width: 6 },
      { header: 'Paciente', key: 'paciente', width: 35 },
      { header: 'Tratamiento', key: 'tratamiento', width: 25 },
      { header: 'Día', key: 'dia', width: 12 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Hora', key: 'hora', width: 12 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Teléfono', key: 'telefono', width: 15 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 25;

    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    worksheet.autoFilter = 'A1:H1';

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    this.citasFiltradas.forEach((cita, index) => {
      const fechaObj = new Date(cita.fechaHora);
      const partesFecha = cita.fechaHora.split(' ');
      
      const fechaSolo = partesFecha[0]; 
      const horaSolo = partesFecha[1] ? this.datePipe.transform(cita.fechaHora, 'hh:mm a') : '---'; 
      const nombreDia = dias[fechaObj.getDay()];

      worksheet.addRow({
        id: index + 1,
        paciente: cita.paciente || cita.nombrePaciente,
        tratamiento: cita.nombreServicio || cita.tratamiento || 'No especificado',
        dia: nombreDia,
        fecha: fechaSolo,
        hora: horaSolo,
        estado: cita.estado,
        telefono: cita.telefono || 'No registrado'
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { 
        row.getCell('id').alignment = { horizontal: 'center' };
        row.getCell('fecha').alignment = { horizontal: 'center' };
        row.getCell('hora').alignment = { horizontal: 'center' };

        const estadoCell = row.getCell('estado');
        if (estadoCell.value === 'Confirmada') {
          estadoCell.font = { color: { argb: 'FF198754' }, bold: true }; 
        } else if (estadoCell.value === 'Cancelada') {
          estadoCell.font = { color: { argb: 'FFDC3545' }, bold: true }; 
        } else if (estadoCell.value === 'Pendiente') {
          estadoCell.font = { color: { argb: 'FFF59E0B' }, bold: true }; 
        } else if (estadoCell.value === 'Observado') {
          estadoCell.font = { color: { argb: 'FF0DCAF0' }, bold: true }; // Info (Celeste)
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fechaActual = new Date().toISOString().split('T')[0];
    saveAs(blob, `Reporte_Inteligente_CeramicDent_${fechaActual}.xlsx`);
  }
}