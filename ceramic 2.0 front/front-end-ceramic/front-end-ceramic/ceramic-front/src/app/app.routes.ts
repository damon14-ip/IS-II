import { Routes } from '@angular/router';
import { HomeComponent } from './page/home/home';
import { AdminDashboardComponent } from './page/admin-dashboard/admin-dashboard';

// IMPORTACIÓN DEL GUARDIA DE SEGURIDAD
import { authGuard } from './auth.guard'; 

export const routes: Routes = [
    // Ruta por defecto (Landing Page)
    { path: '', component: HomeComponent },

    // ==========================================
    // RUTA DEL PANEL DE ADMINISTRACIÓN (BLINDADA)
    // ==========================================
    { 
      path: 'admin', 
      component: AdminDashboardComponent,
      canActivate: [authGuard] // <--- ESTE ES EL CANDADO
    },

    // Comodín: Cualquier ruta desconocida redirige al inicio
    { path: '**', redirectTo: '' }
];