import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressBarComponent } from './progress-bar.component';

describe('ProgressBarComponent', () => {
  let fixture: ComponentFixture<ProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressBarComponent);
    fixture.componentInstance.remaining = 40;
    fixture.componentInstance.total = 100;
    fixture.detectChanges();
  });

  it('should expose an accessible progressbar with meaningful state attributes', () => {
    const progress = fixture.nativeElement.querySelector('[role="progressbar"]');
    expect(progress).not.toBeNull();
    expect(progress.getAttribute('aria-valuenow')).toBe('40');
    expect(progress.getAttribute('aria-valuemin')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('100');
    expect(progress.getAttribute('aria-label')).toBeTruthy();
  });

  it('should support two-way vertical mode changes', () => {
    let emittedMode: boolean | undefined;
    fixture.componentInstance.verticalMode.subscribe(mode => emittedMode = mode);

    fixture.componentInstance.verticalMode.set(true);
    fixture.detectChanges();

    expect(emittedMode).toBe(true);
    expect(fixture.nativeElement.querySelector('.bar-container.flex-column')).not.toBeNull();
  });
});
