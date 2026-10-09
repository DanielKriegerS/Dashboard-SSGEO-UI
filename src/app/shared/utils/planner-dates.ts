function parsePlannerDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().substring(0, 10) === value
    ? date : null;
}

const nationalFixedHolidays = new Map([
  ['01-01', 'Confraternização Universal'],
  ['04-21', 'Tiradentes'],
  ['05-01', 'Dia do Trabalho'],
  ['09-07', 'Independência do Brasil'],
  ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'],
  ['11-20', 'Consciência Negra'],
  ['12-25', 'Natal']
]);

export function getHolidayName(value: string): string {
  const date = parsePlannerDate(value);
  if (!date || (value.substring(5) === '11-20' && date.getUTCFullYear() < 2024)) {
    return '';
  }
  return nationalFixedHolidays.get(value.substring(5)) ?? '';
}

export function getNonWorkingDayLabel(value: string): string {
  return [getWeekendDayName(value), getHolidayName(value) ? 'Feriado' : ''].filter(Boolean).join(' / ');
}

export function getActivityDateRanges(
  startDate: string, endDate: string, includeWeekends: boolean
): Array<{ startDate: string; endDate: string }> {
  const start = parsePlannerDate(startDate);
  const end = parsePlannerDate(endDate);
  if (!start || !end || end < start) {
    return [];
  }
  if (includeWeekends) {
    return [{ startDate, endDate }];
  }
  const ranges: Array<{ startDate: string; endDate: string }> = [];
  let current: { startDate: string; endDate: string } | null = null;
  for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().substring(0, 10);
    const holiday = Boolean(getHolidayName(date));
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6 || holiday) {
      current = null;
    } else if (current) {
      current.endDate = date;
    } else {
      current = { startDate: date, endDate: date };
      ranges.push(current);
    }
  }
  return ranges;
}

export function getWeekendDayName(value: string): string {
  const weekday = parsePlannerDate(value)?.getUTCDay();
  return weekday === 6 ? 'Sábado' : weekday === 0 ? 'Domingo' : '';
}

export function dateRangeIncludesWeekend(startDate: string, endDate: string): boolean {
  const start = parsePlannerDate(startDate);
  const end = parsePlannerDate(endDate);
  if (!start || !end || end < start) {
    return false;
  }
  const weekday = start.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return true;
  }
  const daysUntilSaturday = 6 - weekday;
  return (end.getTime() - start.getTime()) / 86400000 >= daysUntilSaturday;
}
