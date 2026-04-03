import type { PIIType } from '../types.js';

export interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
}

/**
 * PII detection patterns.
 * Order matters: more specific patterns should come before generic ones
 * to avoid partial matches (e.g., API keys before generic long strings).
 */
export const PII_PATTERNS: PIIPattern[] = [
  // Email
  {
    type: 'email',
    pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
  },

  // SSN (before phone — SSN pattern is more specific)
  {
    type: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  },

  // Credit Card (dashed/spaced groups)
  {
    type: 'credit_card',
    pattern: /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g,
  },

  // Credit Card (16-digit contiguous — with basic Luhn check applied in engine)
  {
    type: 'credit_card',
    pattern: /\b\d{16}\b/g,
  },

  // API Key (OpenAI-style)
  {
    type: 'api_key',
    pattern: /\bsk-[a-zA-Z0-9]{20,}\b/g,
  },

  // API Key (generic long alphanumeric strings)
  {
    type: 'api_key',
    pattern: /\b(?:key|token|secret|apikey|api_key)[=:]\s*['"]?([A-Za-z0-9_\-]{32,})['"]?\b/gi,
  },

  // Phone (US format)
  {
    type: 'phone',
    pattern: /\b\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
  },

  // Phone (International with country code)
  {
    type: 'phone',
    pattern: /\b\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/g,
  },

  // IP Address
  {
    type: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
  },

  // Date (US format MM/DD/YYYY)
  {
    type: 'date',
    pattern: /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{2,4}\b/g,
  },

  // Date (ISO format YYYY-MM-DD)
  {
    type: 'date',
    pattern: /\b\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g,
  },

  // Address (US street pattern with zip)
  {
    type: 'address',
    pattern: /\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\b[^,]*\d{5}\b/gi,
  },

  // Person name (contextual — title + capital word)
  {
    type: 'person',
    pattern: /(?:my name is|i'm|i am|call me|tell|ask|say hi to|greet|contact)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  },

  // Person name (honorific + name)
  {
    type: 'person',
    pattern: /(?:mr|mrs|ms|dr|prof)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  },

  // Chinese name (CJK characters 2-4)
  {
    type: 'chinese_name',
    pattern: /[\u4e00-\u9fff]{2,4}/g,
  },

  // Russian name (Cyrillic first + optional hyphenated last)
  {
    type: 'russian_name',
    pattern: /[А-ЯЁ][а-яё]+(?:[-][А-ЯЁ][а-яё]+)?/g,
  },
];

/**
 * Entity ID prefix mapping per PII type.
 */
export const ENTITY_PREFIX: Record<PIIType, string> = {
  email: 'EMAIL',
  phone: 'PHONE',
  ssn: 'SSN',
  credit_card: 'CC',
  api_key: 'APIKEY',
  person: 'PERSON',
  address: 'ADDRESS',
  date: 'DATE',
  ip_address: 'IP',
  chinese_name: 'PERSON_CJK',
  russian_name: 'PERSON_CYR',
};

/**
 * Luhn check for 16-digit credit card numbers.
 */
export function luhnCheck(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
