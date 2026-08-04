import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { ApiService } from '../../service/api.service';
import Swal from 'sweetalert2';

import { AppointmentFormComponent } from '../../component/appointment-form/appointment-form';
import { ClinicalServicesComponent } from '../../component/clinical-services/clinical-services';
import { LaboratorySection } from '../../component/laboratory-section/laboratory-section';
import { SpecialistsSectionComponent } from '../../component/specialists-section/specialists-section';
import { Footer } from '../../component/footer/footer';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    AppointmentFormComponent,
    ClinicalServicesComponent, 
    LaboratorySection,
    SpecialistsSectionComponent,
    Footer
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {

  // Variables SOLO para el Login del Admin
  loginUser: string = '';
  loginPass: string = '';
  mostrarPassword: boolean = false; // <--- Variable para el ojito mágico

  constructor(private api: ApiService, private router: Router) {}

  // --- LÓGICA DE LOGIN ADMIN ---
  doLogin() {
    if (!this.loginUser || !this.loginPass) {
      Swal.fire('Atención', 'Ingrese usuario y contraseña', 'warning');
      return;
    }

    Swal.showLoading();

    this.api.loginDoctor(this.loginUser, this.loginPass).subscribe({
      next: (res) => {
        Swal.close();
        
        if (res.success) {
          // 1. Guardamos el token JWT para que el AuthGuard nos deje pasar
          if (res.token) {
             localStorage.setItem('token_ceramic_dent', res.token);
          }
          // 2. Guardamos el doctor por si tu Navbar/Header necesita mostrar su nombre
          localStorage.setItem('usuario', JSON.stringify(res.doctor));

          // 3. Cerrar el Modal de Bootstrap manualmente
          this.cerrarModalBootstrap();

          // 4. Redirigir al Dashboard
          this.router.navigate(['/admin']);
          
          Swal.fire({
            icon: 'success',
            title: `Bienvenido Dr(a). ${res.doctor.nombre}`,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire('Error', 'Credenciales incorrectas', 'error');
        }
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
      }
    });
  }

  // Función auxiliar para limpiar el modal y el fondo oscuro
  private cerrarModalBootstrap() {
    const modalEl = document.getElementById('loginModal');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    
    // Ocultar modal
    if (modalEl) {
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.removeAttribute('aria-modal');
      modalEl.removeAttribute('role');
    }

    // Quitar el fondo negro (backdrop)
    if (modalBackdrop) modalBackdrop.remove();

    // Reactivar scroll del body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}