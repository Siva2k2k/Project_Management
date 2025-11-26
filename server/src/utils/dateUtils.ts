/**
 * Date Utility Functions for PM Dashboard Server
 * 
 * This module provides UTC-safe date handling functions for the backend.
 * All dates are stored in MongoDB as Date objects in UTC.
 * 
 * Key principles:
 * 1. Store dates in UTC in the database
 * 2. Accept ISO date strings (YYYY-MM-DD) from frontend and normalize to UTC midnight
 * 3. Return dates to frontend as ISO strings (YYYY-MM-DD) for date-only fields
 * 4. Use consistent week calculation logic (Sunday-Saturday in UTC)
 * 5. Avoid timezone conversion issues by working with UTC dates
 */

/**
 * Parse an ISO date string (YYYY-MM-DD) to a Date object at UTC midnight
 * This ensures consistent date handling across timezones
 * @param isoDateString - ISO date string (YYYY-MM-DD or full ISO timestamp)
 * @returns Date object at UTC midnight
 */
export function parseISODateToUTC(isoDateString: string | Date): Date {
  if (!isoDateString) {
    return new Date();
  }

  if (isoDateString instanceof Date) {
    return isoDateString;
  }

  // Extract date part only (YYYY-MM-DD)
  const datePart = isoDateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  // Create date at UTC midnight
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD) in UTC
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get the current date in ISO format (YYYY-MM-DD) in UTC
 * @returns ISO date string for today
 */
export function getTodayISOString(): string {
  return toISODateString(new Date());
}

/**
 * Calculate the start date of the week (Monday) for a given date in UTC
 * @param date - Reference date (defaults to today)
 * @returns Date object for the Monday of that week at UTC midnight
 */
export function getWeekStartDateUTC(date: Date = new Date()): Date {
  const utcDate = new Date(date.toISOString());
  const dayOfWeek = utcDate.getUTCDay(); // 0 = Sunday, 6 = Saturday

  const weekStart = new Date(utcDate);
  // Adjust: Monday = 1, so if Sunday (0), go back 6 days, else go back (dayOfWeek - 1) days
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setUTCDate(utcDate.getUTCDate() - daysToSubtract);
  weekStart.setUTCHours(0, 0, 0, 0);

  return weekStart;
}

/**
 * Calculate the end date of the week (Sunday) for a given date in UTC
 * @param date - Reference date (defaults to today)
 * @returns Date object for the Sunday of that week at UTC 23:59:59.999
 */
export function getWeekEndDateUTC(date: Date = new Date()): Date {
  const utcDate = new Date(date.toISOString());
  const dayOfWeek = utcDate.getUTCDay();

  const weekEnd = new Date(utcDate);
  // Adjust: End on Sunday. If Sunday (0), it's the end day, else calculate days until Sunday
  const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  weekEnd.setUTCDate(utcDate.getUTCDate() + daysToAdd);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return weekEnd;
}

/**
 * Get the start and end dates for the current week in ISO format (UTC)
 * @returns Object with start and end ISO date strings
 */
export function getCurrentWeekRangeUTC(): { start: string; end: string } {
  const today = new Date();
  const start = getWeekStartDateUTC(today);
  const end = getWeekEndDateUTC(today);

  return {
    start: toISODateString(start),
    end: toISODateString(end),
  };
}

/**
 * Get the date N days ago from today in ISO format (UTC)
 * @param days - Number of days to go back
 * @returns Date object
 */
export function getDaysAgoUTC(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Get the date N days ago as ISO string
 * @param days - Number of days to go back
 * @returns ISO date string
 */
export function getDaysAgoISOString(days: number): string {
  return toISODateString(getDaysAgoUTC(days));
}

/**
 * Add days to a date and return new Date object
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New Date object
 */
export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setUTCDate(newDate.getUTCDate() + days);
  return newDate;
}

/**
 * Calculate the end date given a start date and number of days
 * @param startDateString - ISO date string for start date
 * @param days - Number of days to add (default: 6 for a week)
 * @returns Date object for end date
 */
export function calculateEndDate(startDateString: string | Date, days: number = 6): Date {
  const startDate = parseISODateToUTC(startDateString);
  return addDays(startDate, days);
}

/**
 * Check if two dates represent the same date (ignoring time)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates are the same
 */
export function isSameDate(date1: Date | string, date2: Date | string): boolean {
  if (!date1 || !date2) return false;

  const d1 = typeof date1 === 'string' ? parseISODateToUTC(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISODateToUTC(date2) : date2;

  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

/**
 * Check if a date is within a range (inclusive)
 * @param date - Date to check
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @returns true if date is within range
 */
export function isDateInRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const dateObj = typeof date === 'string' ? parseISODateToUTC(date) : date;
  const startObj = typeof startDate === 'string' ? parseISODateToUTC(startDate) : startDate;
  const endObj = typeof endDate === 'string' ? parseISODateToUTC(endDate) : endDate;

  return dateObj >= startObj && dateObj <= endObj;
}

/**
 * Get the difference in days between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference (can be negative if date2 is before date1)
 */
export function getDaysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseISODateToUTC(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISODateToUTC(date2) : date2;

  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Validate that end date is after start date
 * @param startDate - Start date
 * @param endDate - End date
 * @returns true if valid
 */
export function isValidDateRange(startDate: Date | string, endDate: Date | string): boolean {
  const start = typeof startDate === 'string' ? parseISODateToUTC(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISODateToUTC(endDate) : endDate;

  return end > start;
}

/**
 * Normalize a date to UTC midnight (removes time component)
 * @param date - Date to normalize
 * @returns Date object at UTC midnight
 */
export function normalizeToUTCMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Format a date for MongoDB query (ensures UTC)
 * @param date - Date string or Date object
 * @returns Date object ready for MongoDB query
 */
export function formatForMongoQuery(date: string | Date): Date {
  if (typeof date === 'string') {
    return parseISODateToUTC(date);
  }
  return normalizeToUTCMidnight(date);
}

/**
 * Create a date range filter for MongoDB queries
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @returns MongoDB query filter object
 */
export function createDateRangeFilter(
  startDate: string | Date,
  endDate: string | Date
): { $gte: Date; $lte: Date } {
  return {
    $gte: formatForMongoQuery(startDate),
    $lte: formatForMongoQuery(endDate),
  };
}

/**
 * Get week number of the year for a given date
 * @param date - Date to get week number for
 * @returns Week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Compare two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseISODateToUTC(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISODateToUTC(date2) : date2;

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}
