import { EasternTimeService } from './eastern-time.service';

describe('EasternTimeService', () => {
  let service: EasternTimeService;

  beforeEach(() => {
    service = new EasternTimeService();
  });

  it('converts a winter date to Eastern Standard Time', () => {
    const utcDate = new Date('2024-01-15T12:00:00Z');
    const easternDate = service.toEasternDate(utcDate);

    expect(easternDate.getUTCFullYear()).toBe(2024);
    expect(easternDate.getUTCMonth()).toBe(0);
    expect(easternDate.getUTCDate()).toBe(15);
    expect(easternDate.getUTCHours()).toBe(7);
    expect(service.isDaylightSavingsTime(utcDate)).toBeFalse();
  });

  it('converts a summer date to Eastern Daylight Time', () => {
    const utcDate = new Date('2024-07-15T12:00:00Z');
    const easternDate = service.toEasternDate(utcDate);

    expect(easternDate.getUTCFullYear()).toBe(2024);
    expect(easternDate.getUTCMonth()).toBe(6);
    expect(easternDate.getUTCDate()).toBe(15);
    expect(easternDate.getUTCHours()).toBe(8);
    expect(service.isDaylightSavingsTime(utcDate)).toBeTrue();
  });

  it('handles DST transitions correctly', () => {
    expect(service.isDaylightSavingsTime(new Date('2024-03-10T09:00:00Z'))).toBeFalse();
    expect(service.isDaylightSavingsTime(new Date('2024-03-10T10:00:00Z'))).toBeTrue();
    expect(service.isDaylightSavingsTime(new Date('2024-11-03T05:30:00Z'))).toBeTrue();
    expect(service.isDaylightSavingsTime(new Date('2024-11-03T06:30:00Z'))).toBeFalse();
  });
});
