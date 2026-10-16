import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EasternTimeService {
  private readonly eastTimeZone = 'America/New_York';

  toEasternDate(date: Date = new Date()): Date {
    const utcDate = new Date(date);
    const utcTime = utcDate.getTime();
    const offsetMinutes = this.getEasternOffsetMinutes(utcDate);

    return new Date(utcTime + offsetMinutes * 60 * 1000);
  }

  isDaylightSavingsTime(date: Date = new Date()): boolean {
    const year = date.getFullYear();
    const january = new Date(Date.UTC(year, 0, 15, 12));
    const july = new Date(Date.UTC(year, 6, 15, 12));

    const januaryOffset = this.getEasternOffsetMinutes(january);
    const julyOffset = this.getEasternOffsetMinutes(july);

    return julyOffset < januaryOffset;
  }

  private getEasternOffsetMinutes(date: Date): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.eastTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // h23 rather than hour12: false, which reports midnight as hour 24 on some ICU builds
      // and would push the computed offset out by a whole day.
      hourCycle: 'h23'
    });

    const parts = formatter.formatToParts(date);
    const map = new Map(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));

    const easternDate = new Date(
      map.get('year') ?? 0,
      (map.get('month') ?? 1) - 1,
      map.get('day') ?? 1,
      map.get('hour') ?? 0,
      map.get('minute') ?? 0,
      map.get('second') ?? 0
    );

    const utcTimestamp = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    );

    return (easternDate.getTime() - utcTimestamp) / (60 * 1000);
  }
}
