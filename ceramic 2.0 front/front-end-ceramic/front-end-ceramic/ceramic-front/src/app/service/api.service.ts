import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators'; 

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // Asegúrate de que este puerto coincida con tu Backend (3000 o 4000)
  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) { }

  // ==========================================
  // --- MIDDLEWARE FRONTEND (JWT) ---
  // ==========================================
  private getAuthOptions(extraParams?: HttpParams): { headers: HttpHeaders, params?: HttpParams } {
    const token = localStorage.getItem('token_ceramic_dent');
    let headers = new HttpHeaders();
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    const options: any = { headers };
    if (extraParams) {
      options.params = extraParams;
    }
    
    return options;
  }

  // ==========================================
  // 1. ZONA PACIENTE (Públicas - Sin Token)
  // ==========================================
  
  // Consultar estado de cita por DNI (RU019)
  consultarEstadoCita(dni: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/citas/estado/${dni}`);
  }
  
  // Endpoint clásico (Solo JSON)
  crearCita(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/citas`, data);
  }

  // === NUEVO ENDPOINT: ZERO-LOCK CON VOUCHER ===
  // Recibe un FormData que contiene el MultipartFile (imagen) y el JSON (datos)
  crearCitaConComprobante(formData: FormData): Observable<any> {
    // Apuntaremos a una nueva ruta en Spring Boot para no romper el endpoint original
    return this.http.post(`${this.apiUrl}/citas/con-comprobante`, formData);
  }
  
  // Alias para compatibilidad
  agendarCita(data: any): Observable<any> {
    return this.crearCita(data);
  }

  listarServicios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/servicios`);
  }

  consultarReniec(dni: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reniec`, { dni });
  }

  // ==========================================
  // 2. ZONA ADMINISTRADOR (Protegidas con JWT)
  // ==========================================

  // Login del Doctor 
  loginDoctor(usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { usuario, contrasena: clave }).pipe(
      tap((res: any) => {
        if (res.success && res.token) {
          localStorage.setItem('token_ceramic_dent', res.token);
        }
      })
    );
  }

  // Filtrado para el Calendario Visual
  getCitasRango(fechaInicio: string, fechaFin: string): Observable<any[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    return this.http.get<any[]>(`${this.apiUrl}/citas`, this.getAuthOptions(params));
  }

  getBloqueos(fechaInicio: string, fechaFin: string): Observable<any[]> {
    let params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    return this.http.get<any[]>(`${this.apiUrl}/bloqueos`, this.getAuthOptions(params));
  }

  // Listar todas las citas 
  listarCitas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas`, this.getAuthOptions());
  }

  // Listar solo confirmadas 
  listarConfirmadas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas`, this.getAuthOptions()); 
  }

  // Confirmar Cita 
  confirmarCita(id: number, fechaHoraFin?: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/citas/${id}`, { 
        estado: 'Confirmada',
        fechaHoraFin: fechaHoraFin 
    }, this.getAuthOptions());
  }

  // === NUEVO ENDPOINT: ESTADO "LIMBO / OBSERVADO" ===
  observarCita(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/citas/${id}`, { 
        estado: 'Observado' 
    }, this.getAuthOptions());
  }

  // Eliminar/Cancelar Cita 
  eliminarCita(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/citas/${id}`, { estado: 'Cancelada' }, this.getAuthOptions());
  }

  // Crear un Bloqueo 
  bloquearHorario(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bloqueos`, {
      fechaInicio,
      fechaFin,
      motivo: 'Bloqueo Administrativo',
      idPersonaDoctor: null 
    }, this.getAuthOptions());
  }

  // Eliminar un Bloqueo
  eliminarBloqueo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bloqueos/${id}`, this.getAuthOptions());
  }

  // Generar reporte de citas 
  generarReporte(inicio: string, fin: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/citas/reporte?inicio=${inicio}&fin=${fin}`, this.getAuthOptions());
  }

  // Listar pacientes 
  listarPacientes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/personas/pacientes`, this.getAuthOptions());
  }

  // Obtener historial completo de un paciente 
  getHistorialPaciente(dni: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/citas/historial/${dni}`, this.getAuthOptions());
  }
}