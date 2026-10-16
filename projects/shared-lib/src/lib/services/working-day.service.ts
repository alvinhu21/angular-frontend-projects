import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WorkingDayService {
  isWorkingDay(date: Date = new Date()): boolean {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    if (normalizedDate.getDay() === 0 || normalizedDate.getDay() === 6) {
      return false;
    }

    return !this.isFederalHoliday(normalizedDate);
  }

  private isFederalHoliday(date: Date): boolean {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    return this.getFederalHolidaysForYear(year).some((holiday) => {
      return holiday.getMonth() === month && holiday.getDate() === day;
    });
  }

  private getFederalHolidaysForYear(year: number): Date[] {
    const holidays: Date[] = [
      new Date(year, 0, 1),
      this.nthWeekdayOfMonth(year, 0, 1, 3),
      this.nthWeekdayOfMonth(year, 1, 1, 3),
      this.lastMondayOfMonth(year, 4),
      new Date(year, 5, 19),
      new Date(year, 6, 4),
      this.firstMondayOfMonth(year, 8),
      this.secondMondayOfMonth(year, 9),
      new Date(year, 10, 11),
      this.thanksgivingDay(year),
      new Date(year, 11, 25)
    ];

    return holidays.filter((holiday) => !Number.isNaN(holiday.getTime()));
  }

  private nthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number): Date {
    const firstOfMonth = new Date(year, month, 1);
    const offset = (weekday - firstOfMonth.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (occurrence - 1) * 7);
  }

  private firstMondayOfMonth(year: number, month: number): Date {
    return this.nthWeekdayOfMonth(year, month, 1, 1);
  }

  private secondMondayOfMonth(year: number, month: number): Date {
    return this.nthWeekdayOfMonth(year, month, 1, 2);
  }

  private lastMondayOfMonth(year: number, month: number): Date {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const lastDate = new Date(year, month, lastDay);
    const offset = (lastDate.getDay() - 1 + 7) % 7;
    return new Date(year, month, lastDay - offset);
  }

  private thanksgivingDay(year: number): Date {
    const thanksgivingThursday = this.nthWeekdayOfMonth(year, 10, 4, 4);
    return new Date(year, 10, thanksgivingThursday.getDate());
  }
}
