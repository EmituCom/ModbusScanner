'use strict';

const { expandRange, expandList, parseBatchInput, validateBatchInput, validateIP } = require('../src/utils');

// --- expandRange ---

describe('expandRange', () => {
  test('expands a dash range', () => {
    expect(expandRange('1-5')).toEqual([1, 2, 3, 4, 5]);
  });

  test('expands a dot-dot range', () => {
    expect(expandRange('1..5')).toEqual([1, 2, 3, 4, 5]);
  });

  test('reverses range when start > end', () => {
    expect(expandRange('5-1')).toEqual([1, 2, 3, 4, 5]);
  });

  test('handles a single value', () => {
    expect(expandRange('7')).toEqual([7]);
  });

  test('handles multiple comma-separated values', () => {
    expect(expandRange('1,3,5')).toEqual([1, 3, 5]);
  });

  test('handles mixed ranges and single values', () => {
    expect(expandRange('1-3,7-9')).toEqual([1, 2, 3, 7, 8, 9]);
  });

  test('deduplicates overlapping ranges', () => {
    expect(expandRange('1-3,2-4')).toEqual([1, 2, 3, 4]);
  });

  test('returns sorted result', () => {
    expect(expandRange('9,1,5')).toEqual([1, 5, 9]);
  });

  test('ignores invalid parts', () => {
    expect(expandRange('abc')).toEqual([]);
  });
});

// --- expandList ---

describe('expandList', () => {
  test('splits a comma-separated string', () => {
    expect(expandList('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  test('trims whitespace from each item', () => {
    expect(expandList(' a , b , c ')).toEqual(['a', 'b', 'c']);
  });

  test('filters out empty parts', () => {
    expect(expandList('a,,b')).toEqual(['a', 'b']);
  });

  test('returns empty array for null', () => {
    expect(expandList(null)).toEqual([]);
  });

  test('returns empty array for empty string', () => {
    expect(expandList('')).toEqual([]);
  });

  test('returns single-element array for a single value', () => {
    expect(expandList('42')).toEqual(['42']);
  });
});

// --- parseBatchInput ---

describe('parseBatchInput', () => {
  test('parses comma-separated integers', () => {
    expect(parseBatchInput('1,2,3')).toEqual([1, 2, 3]);
  });

  test('parses a dash range', () => {
    expect(parseBatchInput('1-3')).toEqual([1, 2, 3]);
  });

  test('parses a dot-dot range', () => {
    expect(parseBatchInput('1..3')).toEqual([1, 2, 3]);
  });

  test('parses mixed values and ranges', () => {
    expect(parseBatchInput('1,3-5')).toEqual([1, 3, 4, 5]);
  });

  test('returns null for empty string', () => {
    expect(parseBatchInput('')).toBeNull();
  });

  test('returns null for null input', () => {
    expect(parseBatchInput(null)).toBeNull();
  });

  test('returns null when no valid numbers found', () => {
    expect(parseBatchInput('abc')).toBeNull();
  });
});

// --- validateBatchInput ---

describe('validateBatchInput', () => {
  test('returns true for valid input', () => {
    expect(validateBatchInput('1,2,3')).toBe(true);
  });

  test('returns true for a range', () => {
    expect(validateBatchInput('1-10')).toBe(true);
  });

  test('returns error message for empty string', () => {
    expect(validateBatchInput('')).toBe('Cannot be empty');
  });

  test('returns error message for whitespace-only string', () => {
    expect(validateBatchInput('   ')).toBe('Cannot be empty');
  });

  test('returns error message for null', () => {
    expect(validateBatchInput(null)).toBe('Cannot be empty');
  });

  test('returns error message for non-numeric input', () => {
    expect(validateBatchInput('abc')).toMatch(/Invalid format/);
  });
});

// --- validateIP ---

describe('validateIP', () => {
  test('accepts a valid IPv4 address', () => {
    expect(validateIP('192.168.1.1')).toBe(true);
  });

  test('accepts an address with a # wildcard', () => {
    expect(validateIP('192.168.1.#')).toBe(true);
  });

  test('accepts an array with a valid IP as first element', () => {
    expect(validateIP(['10.0.0.1'])).toBe(true);
  });

  test('rejects an address with an out-of-range octet', () => {
    expect(validateIP('256.1.1.1')).toBe('Invalid IPv4 Address');
  });

  test('rejects a hostname string', () => {
    expect(validateIP('localhost')).toBe('Invalid IPv4 Address');
  });

  test('returns error for empty string', () => {
    expect(validateIP('')).toBe('IP Required');
  });

  test('returns error for null', () => {
    expect(validateIP(null)).toBe('IP Required');
  });
});
