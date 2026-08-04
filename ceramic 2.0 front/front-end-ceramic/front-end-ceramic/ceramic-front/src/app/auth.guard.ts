import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Buscamos ambas cosas
  const token = localStorage.getItem('token_ceramic_dent');
  const usuario = localStorage.getItem('usuario');

  // Si tiene el token O si tiene el usuario guardado, lo dejamos pasar
  if (token || usuario) {
    return true; 
  } else {
    // Si no tiene nada, lo rebotamos
    router.navigate(['/'], { replaceUrl: true }); 
    return false;
  }
};