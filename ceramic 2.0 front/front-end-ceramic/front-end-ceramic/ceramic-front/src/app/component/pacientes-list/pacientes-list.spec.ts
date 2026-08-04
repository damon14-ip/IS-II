import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PacientesList } from './pacientes-list';

describe('PacientesList', () => {
  let component: PacientesList;
  let fixture: ComponentFixture<PacientesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PacientesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PacientesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
