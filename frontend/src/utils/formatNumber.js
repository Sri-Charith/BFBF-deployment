/**
 * Number Formatting Utilities
 * Provides human-readable number formatting and digit place explanations
 */

/**
 * Format number to human-readable format (e.g., 1.2K, 1M, 1.5B)
 * @param {number|string} num - The number to format
 * @returns {string} Formatted string (e.g., "1.2K", "1M", "150")
 */
export function formatHumanReadable(num) {
  if (num === null || num === undefined || num === '') {
    return '—';
  }

  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(number)) {
    return String(num);
  }

  // Handle zero
  if (number === 0) {
    return '0';
  }

  const absNum = Math.abs(number);
  const sign = number < 0 ? '-' : '';

  // For numbers less than 1000, return as is (no abbreviation)
  if (absNum < 1000) {
    return sign + Math.round(number).toString();
  }

  // Thousands
  if (absNum < 1000000) {
    const thousands = number / 1000;
    // Show 1 decimal place if less than 100K, otherwise round
    const formatted = absNum < 100000 
      ? thousands.toFixed(1).replace(/\.0$/, '')
      : Math.round(thousands);
    return sign + formatted + 'K';
  }

  // Millions
  if (absNum < 1000000000) {
    const millions = number / 1000000;
    // Show 1 decimal place if less than 100M, otherwise round
    const formatted = absNum < 100000000
      ? millions.toFixed(1).replace(/\.0$/, '')
      : Math.round(millions);
    return sign + formatted + 'M';
  }

  // Billions
  if (absNum < 1000000000000) {
    const billions = number / 1000000000;
    const formatted = absNum < 100000000000
      ? billions.toFixed(1).replace(/\.0$/, '')
      : Math.round(billions);
    return sign + formatted + 'B';
  }

  // Trillions (for very large numbers)
  const trillions = number / 1000000000000;
  const formatted = trillions.toFixed(2).replace(/\.00$/, '');
  return sign + formatted + 'T';
}

/**
 * Explain digit places of a number
 * @param {number|string} num - The number to analyze
 * @returns {string} Explanation of digit places (e.g., "hundreds: 3, tens: 2, ones: 4")
 */
export function explainDigitPlaces(num) {
  if (num === null || num === undefined || num === '') {
    return '';
  }

  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(number)) {
    return '';
  }

  // Handle zero
  if (number === 0) {
    return 'ones: 0';
  }

  const absNum = Math.abs(Math.round(number));
  const digits = absNum.toString().split('').reverse();
  
  const placeNames = [
    'ones',
    'tens',
    'hundreds',
    'thousands',
    'ten thousands',
    'hundred thousands',
    'millions',
    'ten millions',
    'hundred millions',
    'billions',
    'ten billions',
    'hundred billions'
  ];

  const explanations = [];
  for (let i = 0; i < digits.length && i < placeNames.length; i++) {
    if (digits[i] !== '0' || i < 3) { // Always show ones, tens, hundreds
      explanations.push(`${placeNames[i]}: ${digits[i]}`);
    }
  }

  // For numbers with many digits, show summary
  if (digits.length > 6) {
    const significantDigits = digits.slice(0, 6).reverse().join('');
    return `${significantDigits}... (${digits.length} digits total)`;
  }

  return explanations.reverse().join(', ');
}

/**
 * Format number with thousand separators (e.g., 1,234,567)
 * Useful for displaying full numbers in tables
 * @param {number|string} num - The number to format
 * @returns {string} Formatted string with commas
 */
export function formatWithCommas(num) {
  if (num === null || num === undefined || num === '') {
    return '—';
  }

  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(number)) {
    return String(num);
  }

  return Math.round(number).toLocaleString('en-IN');
}

/**
 * Format number based on size - human readable for large numbers, with commas for medium numbers
 * @param {number|string} num - The number to format
 * @param {object} options - Formatting options
 * @param {boolean} options.useCommas - Use comma separators instead of abbreviations (default: false)
 * @param {number} options.abbreviateThreshold - Threshold below which to show full number (default: 1000)
 * @returns {string} Formatted number
 */
export function formatNumber(num, options = {}) {
  const { useCommas = false, abbreviateThreshold = 1000 } = options;
  
  if (num === null || num === undefined || num === '') {
    return '—';
  }

  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  if (isNaN(number)) {
    return String(num);
  }

  if (useCommas) {
    return formatWithCommas(number);
  }

  const absNum = Math.abs(number);
  
  // For small numbers, show full number with commas
  if (absNum < abbreviateThreshold) {
    return formatWithCommas(number);
  }

  // For larger numbers, use human-readable format
  return formatHumanReadable(number);
}

