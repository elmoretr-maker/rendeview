/**
 * Phone Number Detection Utility
 * Detects phone numbers in various formats to prevent users from sharing contact info
 * Includes protection against linguistic bypasses (spelled-out numbers, mixed formats)
 */

/**
 * Map of spelled-out numbers to digits
 */
const WORD_TO_DIGIT = {
  'zero': '0', 'oh': '0', 'o': '0',
  'one': '1', 'won': '1',
  'two': '2', 'to': '2', 'too': '2',
  'three': '3', 'tree': '3',
  'four': '4', 'for': '4', 'fore': '4',
  'five': '5', 'fiv': '5',
  'six': '6', 'six': '6',
  'seven': '7', 'sevn': '7',
  'eight': '8', 'ate': '8',
  'nine': '9', 'niner': '9',
};

/**
 * Converts spelled-out numbers to digits
 * @param {string} text - The text to convert
 * @returns {string} - Text with spelled numbers replaced by digits
 */
function convertSpelledNumbers(text) {
  const lowerText = text.toLowerCase();
  let converted = lowerText;
  
  // Replace each spelled-out number with its digit equivalent
  Object.entries(WORD_TO_DIGIT).forEach(([word, digit]) => {
    // Use word boundaries to match whole words and handle common separators
    const pattern = new RegExp(`\\b${word}\\b`, 'gi');
    converted = converted.replace(pattern, digit);
  });
  
  return converted;
}

/**
 * Detects if text contains consecutive digit-like patterns
 * @param {string} text - The text to check
 * @returns {boolean} - True if suspicious digit pattern found
 */
function detectConsecutiveDigits(text) {
  // Remove all non-digit characters
  const digitsOnly = text.replace(/[^\d]/g, '');
  
  // Check for 10+ consecutive digits (phone number length)
  if (digitsOnly.length >= 10) {
    return true;
  }
  
  // Check for patterns like "5 5 5 1 2 3 4 5 6 7" (digits with single spaces)
  const spacedDigits = text.match(/(\d\s){7,}\d/);
  if (spacedDigits) {
    return true;
  }
  
  return false;
}

/**
 * Detects phone numbers in text using multiple patterns
 * @param {string} text - The text to check
 * @returns {boolean} - True if phone number detected
 */
export function containsPhoneNumber(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Step 1: Convert spelled-out numbers to digits
  const convertedText = convertSpelledNumbers(text);
  
  // Step 2: Check for consecutive digit patterns in converted text
  if (detectConsecutiveDigits(convertedText)) {
    return true;
  }
  
  // Step 3: Check original text for numeric phone patterns
  const normalized = text.replace(/[\s\-\.\(\)\+]/g, '');
  
  // Pattern 1: 10+ consecutive digits (handles most phone numbers)
  if (/\d{10,}/.test(normalized)) {
    return true;
  }
  
  // Pattern 2: Common phone formats with separators
  const phonePatterns = [
    /\d{3}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/,           // 555-123-4567, 555.123.4567, 555 123 4567
    /\(\d{3}\)[\s\-\.]?\d{3}[\s\-\.]?\d{4}/,       // (555) 123-4567, (555)123-4567
    /\+\d{1,3}[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,4}[\s\-\.]?\d{1,9}/, // +1-555-123-4567, +44 20 1234 5678
    /\d{5}[\s\-\.]\d{6}/,                          // 12345 678901 (international format)
  ];
  
  if (phonePatterns.some(pattern => pattern.test(text))) {
    return true;
  }
  
  // Pattern 3: Check for mixed format (some digits + some spelled words)
  // Example: "call me at four 555-one-two-three-four"
  const mixedPattern = /(\d+|zero|one|two|three|four|five|six|seven|eight|nine)[\s\-\.]?(\d+|zero|one|two|three|four|five|six|seven|eight|nine)[\s\-\.]?(\d+|zero|one|two|three|four|five|six|seven|eight|nine)/i;
  if (mixedPattern.test(text)) {
    // Additional check: ensure it's likely a phone number (has enough digit-like elements)
    const digitLikeElements = text.match(/(\d+|zero|one|two|three|four|five|six|seven|eight|nine)/gi);
    if (digitLikeElements && digitLikeElements.length >= 7) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detects email addresses in text
 * @param {string} text - The text to check
 * @returns {boolean} - True if email address detected
 */
export function containsEmail(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Email pattern: anything @ domain . extension
  // This catches standard email formats and common variations
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  
  // Also check for obfuscated formats like "user at domain dot com"
  const obfuscatedPattern = /\b\w+\s+(at|@)\s+\w+\s+(dot|\.)\s+\w+\b/i;
  
  return emailPattern.test(text) || obfuscatedPattern.test(text);
}

/**
 * Detects any external contact information (phone or email)
 * @param {string} text - The text to check
 * @returns {boolean} - True if external contact info detected
 */
export function containsExternalContact(text) {
  return containsPhoneNumber(text) || containsEmail(text);
}

/**
 * Security alert message for external contact detection
 */
export const PHONE_NUMBER_SECURITY_MESSAGE = 
  "Security Alert: For your safety, please do not share external contact info (emails or phone numbers). This chat is designed for quick exchanges to schedule your video date appointment.";
