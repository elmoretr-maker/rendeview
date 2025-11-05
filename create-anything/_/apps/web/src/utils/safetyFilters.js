/**
 * Phone Number Detection Utility
 * Detects phone numbers in various formats to prevent users from sharing contact info
 */

/**
 * Detects phone numbers in text using multiple patterns
 * @param {string} text - The text to check
 * @returns {boolean} - True if phone number detected
 */
export function containsPhoneNumber(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Remove common separators to check raw digits
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
  
  return phonePatterns.some(pattern => pattern.test(text));
}

/**
 * Security alert message for phone number detection
 */
export const PHONE_NUMBER_SECURITY_MESSAGE = 
  "Security Alert: For your safety, please do not share phone numbers or external contact info. This chat is designed for quick exchanges to schedule your video date appointment.";
