import { WorkingDayService } from './working-day.service';

describe('WorkingDayService', () => {
  let service: WorkingDayService;

  beforeEach(() => {
    service = new WorkingDayService();
  });

  it('returns false for weekends', () => {
    expect(service.isWorkingDay(new Date('2026-09-19'))).toBeFalse();
    expect(service.isWorkingDay(new Date('2026-09-20'))).toBeFalse();
  });

  it('returns false for federal holidays on weekdays', () => {
    expect(service.isWorkingDay(new Date('2026-01-01'))).toBeFalse();
    expect(service.isWorkingDay(new Date('2026-11-26'))).toBeFalse();
  });

  it('returns true for normal weekdays that are not holidays', () => {
    expect(service.isWorkingDay(new Date('2026-09-21'))).toBeTrue();
    expect(service.isWorkingDay(new Date('2026-09-22'))).toBeTrue();
  });
});
