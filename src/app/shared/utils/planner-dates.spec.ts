import { dateRangeIncludesWeekend, getWeekendDayName, getActivityDateRanges, getHolidayName, getNonWorkingDayLabel } from './planner-dates';

describe('planner weekend dates', () => {
  it.each([
    ['2026-10-12', 'Nossa Senhora Aparecida'],
    ['2026-12-25', 'Natal'],
    ['2026-11-20', 'Consciência Negra'],
    ['2023-11-20', ''],
    ['2026-10-13', ''],
    ['2026-02-30', ''],
    ['', '']
  ])('should identify holiday %s using the activity calendar', (date, name) => {
    expect(getHolidayName(date)).toBe(name);
  });

  it('should label holidays and retain both labels when they fall on weekends', () => {
    expect(getNonWorkingDayLabel('2026-10-12')).toBe('Feriado');
    expect(getNonWorkingDayLabel('2027-12-25')).toBe('Sábado / Feriado');
    expect(getNonWorkingDayLabel('2026-10-10')).toBe('Sábado');
    expect(getNonWorkingDayLabel('2026-10-13')).toBe('');
  });

  it('should omit October 10, 11 and 12 when non-working days are excluded', () => {
    expect(getActivityDateRanges('2026-10-09', '2026-10-15', false)).toEqual([
      { startDate: '2026-10-09', endDate: '2026-10-09' },
      { startDate: '2026-10-13', endDate: '2026-10-15' }
    ]);
    expect(getActivityDateRanges('2026-10-09', '2026-10-15', true)).toEqual([
      { startDate: '2026-10-09', endDate: '2026-10-15' }
    ]);
  });

  it.each([
    ['2026-10-10', '2026-10-12'],
    ['2026-12-25', '2026-12-27'],
    ['2026-02-30', '2026-03-02'],
    ['2026-10-15', '2026-10-09']
  ])('should return no periods for excluded or invalid range %s to %s', (start, end) => {
    expect(getActivityDateRanges(start, end, false)).toEqual([]);
  });

  it.each([
    ['2026-10-09', ''],
    ['2026-10-10', 'Sábado'],
    ['2026-10-11', 'Domingo'],
    ['2026-10-12', ''],
    ['2028-02-29', ''],
    ['2026-02-30', ''],
    ['', '']
  ])('should classify calendar date %s without a timezone shift', (date, name) => {
    expect(getWeekendDayName(date)).toBe(name);
  });

  it.each([
    ['2026-10-08', '2026-10-09', false],
    ['2026-10-09', '2026-10-10', true],
    ['2026-10-09', '2026-10-12', true],
    ['2026-10-10', '2026-10-10', true],
    ['2026-10-11', '2026-10-11', true],
    ['2026-10-12', '2026-10-16', false],
    ['2026-10-12', '2026-10-19', true],
    ['2026-10-12', '2026-10-08', false],
    ['', '2026-10-11', false],
    ['2026-10-08', '', false]
  ])('should detect weekends within %s to %s', (start, end, expected) => {
    expect(dateRangeIncludesWeekend(start, end)).toBe(expected);
  });
});
