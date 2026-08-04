import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2'; 
import { ApiService } from '../../service/api.service'; // <-- 1. IMPORTAMOS TU SERVICIO

@Component({
  selector: 'app-pacientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe], 
  templateUrl: './pacientes-list.html',
  styleUrls: ['./pacientes-list.css']
})
export class PacientesListComponent implements OnInit {
  
  // DATOS
  pacientesOriginales: any[] = [];
  pacientesFiltrados: any[] = [];
  pacientesPaginados: any[] = [];

  // VARIABLES PARA HISTORIAL
  historialSeleccionado: any[] = [];
  pacienteActual: any = null;

  // PAGINACIÓN Y BÚSQUEDA
  busquedaDNI: string = '';
  paginaActual: number = 1;
  itemsPorPagina: number = 10;
  totalPaginas: number = 1;

  private datePipe = inject(DatePipe); 
  private api = inject(ApiService); // <-- 2. INYECTAMOS EL SERVICIO (El que tiene el Token)

  ngOnInit(): void {
    this.cargarPacientes();
  }

  cargarPacientes() {
    // 3. USAMOS EL SERVICIO EN LUGAR DE HTTP DIRECTO
    this.api.listarPacientes()
      .subscribe({
        next: (data) => {
          // PASO 1: Ordenar TODO alfabéticamente (A - Z)
          data.sort((a, b) => a.nombre.localeCompare(b.nombre));
          
          // Guardamos la lista completa
          this.pacientesOriginales = data;

          // PASO 2: Aplicar el filtro del "Último Mes"
          const haceUnMes = new Date();
          haceUnMes.setMonth(haceUnMes.getMonth() - 1);

          this.pacientesFiltrados = this.pacientesOriginales.filter(p => 
              new Date(p.fechaRegistro) >= haceUnMes
          );
          
          this.calcularPaginacion();
        },
        error: (err) => console.error("Error al cargar pacientes:", err)
      });
  }

  // --- BUSCADOR ---
  onBuscarCambio() {
    this.paginaActual = 1; 
    
    if (this.busquedaDNI.trim() === '') {
      const haceUnMes = new Date();
      haceUnMes.setMonth(haceUnMes.getMonth() - 1);
      this.pacientesFiltrados = this.pacientesOriginales.filter(p => new Date(p.fechaRegistro) >= haceUnMes);
    } else {
      this.pacientesFiltrados = this.pacientesOriginales.filter(p => 
        p.dni && p.dni.includes(this.busquedaDNI)
      );
    }
    this.calcularPaginacion();
  }

  // --- PAGINACIÓN ---
  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.pacientesFiltrados.length / this.itemsPorPagina);
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    this.pacientesPaginados = this.pacientesFiltrados.slice(inicio, fin);
  }

  cambiarPagina(delta: number) {
    const nuevaPagina = this.paginaActual + delta;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
      this.calcularPaginacion();
    }
  }

// --- REQUISITO RU022: EXPEDIENTE CLÍNICO AVANZADO + EXPORTACIÓN ---
  verHistorial(paciente: any) {
    this.pacienteActual = paciente;
    
    Swal.fire({ title: 'Cargando expediente clínico...', didOpen: () => { Swal.showLoading(); } });

    // 4. USAMOS EL SERVICIO PARA PEDIR EL HISTORIAL CON TOKEN
    this.api.getHistorialPaciente(paciente.dni)
      .subscribe({
        next: (res) => {
          if (res.success) {
            const historial = res.historial;
            this.historialSeleccionado = historial;

            if (historial.length === 0) {
              Swal.fire({
                icon: 'info',
                title: 'Expediente Vacío',
                text: `${paciente.nombre} no tiene atenciones previas registradas.`,
                confirmButtonColor: '#00b4d8',
                customClass: { popup: 'rounded-4' }
              });
              return;
            }

            const headerHtml = `
              <div class="d-flex align-items-center bg-light p-3 rounded-4 shadow-sm mb-4 border">
                <div class="me-3">
                   <div class="text-white rounded-circle d-flex justify-content-center align-items-center fw-bold shadow-sm" style="width:70px; height:70px; font-size: 2.2rem; background-color: #0d6efd;">
                      ${paciente.nombre.charAt(0)}
                   </div>
                </div>
                <div class="flex-grow-1 text-start">
                    <h5 class="fw-bold m-0 text-dark mb-2" style="font-size: 1.25rem;">${paciente.nombre}</h5>
                    <div class="d-flex flex-wrap gap-2">
                        <span class="badge bg-white text-secondary border shadow-sm"><i class="far fa-id-card me-1 text-primary"></i> DNI: ${paciente.dni}</span>
                        <span class="badge bg-white text-secondary border shadow-sm"><i class="fab fa-whatsapp me-1 text-success"></i> ${paciente.telefono || 'Sin registro'}</span>
                        <span class="badge bg-danger text-white shadow-sm"><i class="fas fa-notes-medical me-1"></i> Sin Alergias Conocidas</span>
                    </div>
                </div>
                <div>
                    <button id="btn-imprimir" class="btn btn-outline-primary btn-sm shadow-sm rounded-3 px-3 py-2" title="Imprimir / Exportar a PDF">
                        <i class="fas fa-print me-1"></i> PDF
                    </button>
                </div>
              </div>
            `;

            let timelineHtml = `<div class="text-start mt-2 px-2" style="max-height: 400px; overflow-y: auto;">`;

            historial.forEach((cita: any) => {
              const fecha = this.datePipe.transform(cita.fechaHora, 'dd MMM yyyy') || '';
              const hora = this.datePipe.transform(cita.fechaHora, 'hh:mm a') || '';

              let colorBorder = '#adb5bd'; 
              let icon = 'fas fa-circle text-secondary';
              let bgBadge = 'bg-secondary';
              let textoClinico = 'Pendiente de evaluación en consultorio.';

              if (cita.estado === 'Confirmada') {
                  colorBorder = '#198754'; 
                  icon = 'fas fa-check-circle text-success'; 
                  bgBadge = 'bg-success';
                  textoClinico = `Se completó el procedimiento de <strong>${cita.nombreServicio.toLowerCase()}</strong>. Paciente evolucionó favorablemente sin complicaciones durante la sesión.`;
              } else if (cita.estado === 'Cancelada') {
                  colorBorder = '#dc3545'; 
                  icon = 'fas fa-times-circle text-danger'; 
                  bgBadge = 'bg-danger';
                  textoClinico = 'La cita fue anulada. No se realizó intervención clínica en esta fecha.';
              } else if (cita.estado === 'Pendiente') {
                  colorBorder = '#ffc107'; 
                  icon = 'fas fa-clock text-warning'; 
                  bgBadge = 'bg-warning text-dark';
              }

              timelineHtml += `
                <div class="position-relative mb-4" style="padding-left: 30px; border-left: 2px solid ${colorBorder}; margin-left: 10px;">
                  <div class="position-absolute bg-white d-flex align-items-center justify-content-center" style="width: 28px; height: 28px; left: -15px; top: -3px; border-radius: 50%;">
                      <i class="${icon} fs-5"></i>
                  </div>
                  <div class="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                      <div class="card-header bg-white border-bottom-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                          <div class="text-primary fw-bold" style="font-size: 1.05rem;">
                              <i class="fas fa-tooth me-2"></i> ${cita.nombreServicio}
                          </div>
                          <span class="badge ${bgBadge} rounded-pill px-3 py-2 shadow-sm">${cita.estado}</span>
                      </div>
                      
                      <div class="card-body pt-1 pb-3">
                          <div class="d-flex text-muted small mb-3 border-bottom pb-2 gap-4">
                              <span><i class="far fa-calendar-alt me-1"></i> ${fecha}</span>
                              <span><i class="far fa-clock me-1"></i> ${hora}</span>
                              <span><i class="fas fa-user-md me-1"></i> Dr(a). Olga</span>
                          </div>
                          
                          <div class="p-3 rounded-3" style="background-color: #f8f9fa; border-left: 3px solid ${colorBorder};">
                              <small class="text-uppercase fw-bold text-muted d-block mb-1" style="font-size: 0.7rem; letter-spacing: 0.5px;">Evolución / Observaciones</small>
                              <span class="text-secondary small" style="line-height: 1.5;">${textoClinico}</span>
                          </div>
                      </div>
                  </div>
                </div>
              `;
            });
            timelineHtml += `</div>`;

            Swal.fire({
              title: `<div class="fw-bold text-dark fs-4 mb-2"><i class="fas fa-folder-open text-primary me-2"></i> Historial Clínico Integral</div>`,
              html: headerHtml + timelineHtml,
              showCloseButton: true,
              showConfirmButton: false, 
              width: '700px', 
              padding: '2rem',
              customClass: { popup: 'rounded-4 bg-light' },
              didOpen: () => {
                const btnPrint = document.getElementById('btn-imprimir');
                if (btnPrint) {
                  btnPrint.addEventListener('click', () => {
                    this.generarImpresionPDF(paciente, historial);
                  });
                }
              }
            });
          }
        },
        error: (e) => {
          console.error("Error cargando historial", e);
          Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
        }
      });
  }

  // --- NUEVA FUNCIÓN: GENERADOR DE PDF NATIVO ---
  generarImpresionPDF(paciente: any, historial: any[]) {
    const ventana = window.open('', '_blank');
    if (!ventana) {
        Swal.fire('Atención', 'Por favor permite las ventanas emergentes (pop-ups) para imprimir el reporte.', 'warning');
        return;
    }

    let filas = '';
    historial.forEach(cita => {
        const fechaObj = new Date(cita.fechaHora);
        const fecha = this.datePipe.transform(fechaObj, 'dd/MM/yyyy') || '';
        const hora = this.datePipe.transform(fechaObj, 'hh:mm a') || '';
        filas += `
            <tr>
                <td>${fecha}</td>
                <td>${hora}</td>
                <td><strong>${cita.nombreServicio}</strong></td>
                <td>${cita.estado}</td>
            </tr>
        `;
    });

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Expediente - ${paciente.nombre}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; margin: 0; }
                .header { text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #0d6efd; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;}
                .header p { margin: 5px 0 0 0; color: #6c757d; font-size: 14px; }
                
                .patient-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
                .patient-card h2 { margin: 0 0 15px 0; color: #212529; font-size: 20px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
                th, td { border: 1px solid #dee2e6; padding: 12px; text-align: left; }
                th { background-color: #0d6efd; color: white; text-transform: uppercase; font-size: 12px; }
                tr:nth-child(even) { background-color: #f8f9fa; }
                
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #adb5bd; }
                .signature { margin-top: 70px; display: flex; justify-content: flex-end; }
                .signature-line { border-top: 1px solid #333; width: 250px; text-align: center; padding-top: 10px; font-size: 14px; }
                
                @media print {
                    body { padding: 0; }
                    .patient-card { border: none; border-left: 4px solid #0d6efd; border-radius: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Ceramic Dent</h1>
                <p>Reporte Oficial de Historial Clínico</p>
                <p>Fecha de emisión: ${this.datePipe.transform(new Date(), 'dd/MM/yyyy - hh:mm a')}</p>
            </div>

            <div class="patient-card">
                <h2>${paciente.nombre}</h2>
                <div class="info-grid">
                    <div><strong>Documento (DNI):</strong> ${paciente.dni}</div>
                    <div><strong>Teléfono de Contacto:</strong> ${paciente.telefono || 'No registrado'}</div>
                    <div><strong>Alergias:</strong> Ninguna conocida</div>
                    <div><strong>Total de Atenciones:</strong> ${historial.length}</div>
                </div>
            </div>

            <h3 style="color: #495057; font-size: 16px; margin-bottom: 15px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Registro de Atenciones</h3>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Fecha</th>
                        <th style="width: 15%;">Hora</th>
                        <th style="width: 45%;">Tratamiento</th>
                        <th style="width: 25%;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>

            <div class="signature">
                <div class="signature-line">
                    <strong>Firma del Especialista</strong><br>
                    Ceramic Dent D&O
                </div>
            </div>

            <div class="footer">
                Documento generado automáticamente por el Sistema de Gestión Clínica Ceramic Dent.
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

  // --- VALIDACIÓN FRONTEND (UX) ---
  soloNumeros(event: KeyboardEvent) {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault(); 
    }
  }
}