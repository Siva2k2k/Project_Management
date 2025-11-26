/**
 * Date Utility Functions for PM Dashboard
 * 
 * This module provides timezone-safe date handling functions for the frontend.
 * All dates are handled in the user's local timezone for display purposes.
 * When sending to the backend, dates are normalized to ISO format (YYYY-MM-DD) without time component.
 * 
 * Key principles:
 * 1. Display dates in user's local timezone
 * 2. Store dates as ISO strings (YYYY-MM-DD) for date-only fields
 * 3. Use consistent week calculation logic (Sunday-Saturday)
 * 4. Avoid timezone conversion issues by working with date-only formats
 */

/**
 * Format a date string or Date object to a localized date string
 * @param date - Date string (ISO format) or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in user's locale
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!date) return '';
  
  try {
    // Parse ISO date string to local date without timezone conversion
    const dateObj = typeof date === 'string' ? parseISODate(date) : date;
    return dateObj.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Parse an ISO date string (YYYY-MM-DD) to a Date object in local timezone
 * This avoids timezone conversion issues by treating the date as local
 * @param isoDateString - ISO date string (YYYY-MM-DD)
 * @returns Date object in local timezone
 */
export function parseISODate(isoDateString: string): Date {
  if (!isoDateString) return new Date();
  
  // Split the date string and create date in local timezone
  const [year, month, day] = isoDateString.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD) without timezone conversion
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get the current date in ISO format (YYYY-MM-DD) in local timezone
 * @returns ISO date string for today
 */
export function getTodayISOString(): string {
  return toISODateString(new Date());
}

/**
 * Calculate the start date of the week (Monday) for a given date
 * @param date - Reference date (defaults to today)
 * @returns Date object for the Monday of that week
 */
export function getWeekStartDate(date: Date = new Date()): Date {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  const weekStart = new Date(date);
  // Adjust: Monday = 1, so if Sunday (0), go back 6 days, else go back (dayOfWeek - 1) days
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(date.getDate() - daysToSubtract);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Calculate the end date of the week (Sunday) for a given date
 * @param date - Reference date (defaults to today)
 * @returns Date object for the Sunday of that week
 */
export function getWeekEndDate(date: Date = new Date()): Date {
  const dayOfWeek = date.getDay();
  const weekEnd = new Date(date);
  // Adjust: End on Sunday. If Sunday (0), it's the end day, else calculate days until Sunday
  const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  weekEnd.setDate(date.getDate() + daysToAdd);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Get the start and end dates for the current week in ISO format
 * @returns Object with start and end ISO date strings
 */
export function getCurrentWeekRange(): { start: string; end: string } {
  const today = new Date();
  const start = getWeekStartDate(today);
  const end = getWeekEndDate(today);
  
  return {
    start: toISODateString(start),
    end: toISODateString(end),
  };
}

/**
 * Get the start and end dates for the previous week in ISO format
 * @returns Object with start and end ISO date strings
 */
export function getPreviousWeekRange(): { start: string; end: string } {
  const today = new Date();
  const previousWeekDate = new Date(today);
  previousWeekDate.setDate(today.getDate() - 7);
  
  const start = getWeekStartDate(previousWeekDate);
  const end = getWeekEndDate(previousWeekDate);
  
  return {
    start: toISODateString(start),
    end: toISODateString(end),
  };
}

/**
 * Calculate the end date given a start date and number of days
 * @param startDateString - ISO date string for start date
 * @param days - Number of days to add (default: 6 for a week)
 * @returns ISO date string for end date
 */
export function calculateEndDate(startDateString: string, days: number = 6): string {
  const startDate = parseISODate(startDateString);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + days);
  return toISODateString(endDate);
}

/**
 * Get the date N days ago from today in ISO format
 * @param days - Number of days to go back
 * @returns ISO date string
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISODateString(date);
}

/**
 * Check if two date strings represent the same date
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns true if dates are the same
 */
export function isSameDate(date1: string, date2: string): boolean {
  if (!date1 || !date2) return false;
  return date1.split('T')[0] === date2.split('T')[0];
}

/**
 * Check if a date is within a range (inclusive)
 * @param date - Date to check
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @returns true if date is within range
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const dateObj = parseISODate(date);
  const startObj = parseISODate(startDate);
  const endObj = parseISODate(endDate);
  
  return dateObj >= startObj && dateObj <= endObj;
}

/**
 * Get the difference in days between two dates
 * @param date1 - First date string
 * @param date2 - Second date string
 * @returns Number of days difference (absolute value)
 */
export function getDaysDifference(date1: string, date2: string): number {
  const d1 = parseISODate(date1);
  const d2 = parseISODate(date2);
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Format a date for input[type="date"] fields
 * Ensures the date is in YYYY-MM-DD format
 * @param date - Date string or Date object
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  if (!date) return '';
  
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  
  return toISODateString(date);
}

/**
 * Format a timestamp to a readable date and time
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(
  timestamp: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!timestamp) return '';
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
}

/**
 * Sort an array of objects by date field
 * @param array - Array of objects with date field
 * @param dateField - Name of the date field
 * @param order - Sort order ('asc' or 'desc')
 * @returns Sorted array
 */
export function sortByDate<T>(
  array: T[],
  dateField: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[dateField] as any).getTime();
    const dateB = new Date(b[dateField] as any).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
}
