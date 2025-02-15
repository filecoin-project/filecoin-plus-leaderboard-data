import { isAddressId, isAddressKey, sanitizeString } from '../utils/general.ts';
import { assert, assertEquals } from 'jsr:@std/assert';

/**
 * Tests for sanitizeString function.
 */
Deno.test('sanitizeString handles empty input', () => {
  assertEquals(sanitizeString(''), '');
});

Deno.test('sanitizeString removes HTML tags', () => {
  const input = '<div>Hello</div>';
  const expected = 'Hello';
  assertEquals(sanitizeString(input), expected);
});

Deno.test('sanitizeString trims whitespace', () => {
  const input = '  Hello  ';
  const expected = 'Hello';
  assertEquals(sanitizeString(input), expected);
});

Deno.test('sanitizeString handles complex HTML', () => {
  const input = '<div><p>Hello <span>World</span></p></div>';
  const expected = 'Hello World';
  assertEquals(sanitizeString(input), expected);
});

/**
 * Tests for isAddressKey function.
 */
Deno.test('isAddressKey validates address length', () => {
  assert(isAddressKey('f12345678901234'));
});

Deno.test('isAddressKey invalidates short address', () => {
  assert(!isAddressKey('f1234'));
});

Deno.test('isAddressKey invalidates long address', () => {
  assert(
    !isAddressKey(
      'f12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
    ),
  );
});

/**
 * Tests for isAddressId function.
 */
Deno.test('isAddressId validates address length', () => {
  assert(isAddressId('f1234'));
});

Deno.test('isAddressId invalidates short address', () => {
  assert(!isAddressId('f1'));
});

Deno.test('isAddressId invalidates long address', () => {
  assert(!isAddressId('f12345678901234567890'));
});
