import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicalServices } from './clinical-services';

describe('ClinicalServices', () => {
  let component: ClinicalServices;
  let fixture: ComponentFixture<ClinicalServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClinicalServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClinicalServices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
