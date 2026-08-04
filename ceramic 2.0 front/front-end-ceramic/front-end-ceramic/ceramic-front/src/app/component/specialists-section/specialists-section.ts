import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-specialists-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './specialists-section.html',
  styleUrls: ['./specialists-section.css']
})
export class SpecialistsSectionComponent {
  
  // Lista de Doctores (Puedes cambiar las fotos por archivos reales en assets/img/)
  doctores = [
    {
      nombre: 'Dra. Olga',
      especialidad: 'Ortodoncia',
      foto: 'https://img.freepik.com/foto-gratis/mujer-doctora-vistiendo-bata-laboratorio-estetoscopio-aislado_1303-29791.jpg' 
    },
    {
      nombre: 'Dr. Carlos Ruiz',
      especialidad: 'Rehabilitación Oral',
      foto: 'https://img.freepik.com/foto-gratis/retrato-sonriente-doctor-varon-batos-medicos_171337-5079.jpg' 
    }
  ];
}