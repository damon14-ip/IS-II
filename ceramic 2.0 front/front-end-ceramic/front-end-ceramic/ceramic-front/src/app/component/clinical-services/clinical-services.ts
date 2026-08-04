import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-clinical-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clinical-services.html',
  styleUrls: ['./clinical-services.css']
})
export class ClinicalServicesComponent {
  
  // Lista de Tratamientos
  tratamientos = [
    { icon: 'fas fa-teeth', title: 'Prótesis', desc: 'Reemplazo de dientes perdidos para recuperar tu función masticatoria y estética.' },
    { icon: 'fas fa-anchor', title: 'Implantes', desc: 'Raíces artificiales de titanio que ofrecen una solución fija y permanente.' },
    { icon: 'fas fa-archway', title: 'Puentes de Zirconio', desc: 'Estructuras fijas de alta resistencia y estética natural sin metal visible.' },
    { icon: 'fas fa-smile-beam', title: 'Ortodoncia', desc: 'Corrección de la posición de los dientes para una mordida y sonrisa perfectas.' },
    { icon: 'fas fa-magic', title: 'Blanqueamientos', desc: 'Tratamiento seguro para aclarar varios tonos el color de tu esmalte dental.' },
    { icon: 'fas fa-shield-alt', title: 'Curaciones', desc: 'Eliminación de caries y restauración con resinas estéticas de alta calidad.' },
    { icon: 'fas fa-crown', title: 'Coronas', desc: 'Fundas completas para reforzar y embellecer dientes muy dañados.' },
    { icon: 'far fa-gem', title: 'Zirconio', desc: 'Material biocompatible de máxima durabilidad y apariencia 100% natural.' },
    { icon: 'fas fa-paint-brush', title: 'Carillas', desc: 'Láminas finas para diseñar tu sonrisa ideal corrigiendo forma y color.' },
    { icon: 'fas fa-puzzle-piece', title: 'Prótesis Parcial', desc: 'Soluciones removibles y cómodas para reponer múltiples piezas dentales.' },
    { icon: 'fas fa-user-md', title: 'Odontología General', desc: 'Evaluación integral, limpiezas y prevención para mantener tu salud bucal.' }
  ];
}