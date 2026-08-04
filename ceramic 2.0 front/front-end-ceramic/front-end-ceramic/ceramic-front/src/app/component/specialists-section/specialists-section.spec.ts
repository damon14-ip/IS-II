import { ComponentFixture, TestBed } from '@angular/core/testing';

// 1. CORREGIR EL NOMBRE EN EL IMPORT (Agregar 'Component')
import { SpecialistsSectionComponent } from './specialists-section';

describe('SpecialistsSectionComponent', () => {
  // 2. CORREGIR EL TIPO DE VARIABLE
  let component: SpecialistsSectionComponent;
  let fixture: ComponentFixture<SpecialistsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // 3. CORREGIR EN LOS IMPORTS DEL TESTBED
      imports: [SpecialistsSectionComponent]
    })
    .compileComponents();

    // 4. CORREGIR EN LA CREACIÓN DEL COMPONENTE
    fixture = TestBed.createComponent(SpecialistsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});