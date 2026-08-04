import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LaboratorySection } from './laboratory-section';

describe('LaboratorySection', () => {
  let component: LaboratorySection;
  let fixture: ComponentFixture<LaboratorySection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LaboratorySection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LaboratorySection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
