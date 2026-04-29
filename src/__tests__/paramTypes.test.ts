import { describe, it, expect } from 'vitest';
import { detectParamType } from '@/lib/paramTypes';

describe('detectParamType', () => {
  describe('boolean', () => {
    it('detects "true"', () => expect(detectParamType('true')).toBe('boolean'));
    it('detects "false"', () => expect(detectParamType('false')).toBe('boolean'));
    it('detects "TRUE" (case-insensitive)', () => expect(detectParamType('TRUE')).toBe('boolean'));
    it('detects "False" (mixed case)', () => expect(detectParamType('False')).toBe('boolean'));
  });

  describe('number', () => {
    it('detects integer', () => expect(detectParamType('42')).toBe('number'));
    it('detects negative integer', () => expect(detectParamType('-7')).toBe('number'));
    it('detects float', () => expect(detectParamType('3.14')).toBe('number'));
    it('detects negative float', () => expect(detectParamType('-0.5')).toBe('number'));
    it('detects zero', () => expect(detectParamType('0')).toBe('number'));
    it('does NOT detect scientific notation "1e2"', () => expect(detectParamType('1e2')).toBe('string'));
    it('does NOT detect empty string as number', () => expect(detectParamType('')).toBe('string'));
    it('does NOT detect NaN literal', () => expect(detectParamType('NaN')).toBe('string'));
    it('does NOT detect "1abc"', () => expect(detectParamType('1abc')).toBe('string'));
  });

  describe('structured', () => {
    it('detects JSON object', () => expect(detectParamType('{"a":1}')).toBe('structured'));
    it('detects JSON array', () => expect(detectParamType('[1,2,3]')).toBe('structured'));
    it('detects JSON object with whitespace', () => expect(detectParamType('  {"x":"y"}  ')).toBe('structured'));
    it('does NOT detect null as structured', () => expect(detectParamType('null')).toBe('string'));
    it('does NOT detect invalid JSON starting with {', () => expect(detectParamType('{bad}')).toBe('string'));
    it('does NOT detect plain number JSON', () => expect(detectParamType('123')).toBe('number'));
  });

  describe('string', () => {
    it('falls back to string for plain text', () => expect(detectParamType('hello')).toBe('string'));
    it('falls back to string for "yes"', () => expect(detectParamType('yes')).toBe('string'));
    it('falls back to string for "1" followed by text', () => expect(detectParamType('1px')).toBe('string'));
    it('falls back to string for empty string', () => expect(detectParamType('')).toBe('string'));
  });
});
