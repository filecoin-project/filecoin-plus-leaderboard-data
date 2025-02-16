import _ from 'lodash';
import * as regexes from './regexes.ts';
import { FIL_BLOCK_TIME, FILECOIN_GENESIS_UNIX_EPOCH } from '../constants.ts';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';

/**
 * Removes HTML tags and trims the string.
 * @param string - Input string to sanitize.
 * @returns The sanitized string.
 */
export const sanitizeString = (string: string): string =>
  string
    ?.trim()
    ?.replace(/<\/?[^>]*>/gi, '')
    ?.replace(/^\[|\]$/gi, '');

/**
 * Checks if address key is valid by length.
 */
export const isAddressKey = (address: string): boolean => {
  return address.length >= 14 && address.length <= 100;
};

/**
 * Checks if address id is valid by length.
 */
export const isAddressId = (address: string): boolean => {
  return address.length >= 4 && address.length <= 20;
};

const validRegions = [
  'AFRICA',
  'ASIA_NOT_GREATER_CHINA',
  'EUROPE',
  'GREATER_CHINA',
  'NORTH_AMERICA',
  'OCEANIA',
  'SOUTH_AMERICA',
  'GLOBAL',
  'OTHER',
] as const;

type ValidRegion = typeof validRegions[number];

/**
 * Normalize a given region string into valid region keys.
 * @param region - The raw region string to normalize.
 * @returns An array of normalized region keys.
 */
export const normalizeRegion = (region: string): ValidRegion[] => {
  const checks = [
    { key: 'AFRICA', check: regexes.regionIsAfrica },
    { key: 'ASIA_NOT_GREATER_CHINA', check: regexes.regionIsAsiaNotGreaterChina },
    { key: 'EUROPE', check: regexes.regionIsEurope },
    { key: 'GREATER_CHINA', check: regexes.regionIsGreaterChina },
    { key: 'NORTH_AMERICA', check: regexes.regionIsNorthAmerica },
    { key: 'OCEANIA', check: regexes.regionIsOceania },
    { key: 'SOUTH_AMERICA', check: regexes.regionIsSouthAmerica },
    { key: 'GLOBAL', check: regexes.regionIsGlobal },
    { key: 'OTHER', check: regexes.regionIsOther },
  ];

  const normalized = checks
    .filter(({ check }) => check(region))
    .map(({ key }) => key as ValidRegion);

  return normalized.length > 0 ? normalized.filter((r) => validRegions.includes(r)) : ['OTHER'];
};

/**
 * Normalizes a NotaryGovernanceIssue object.
 * @param verifier - The verifier object to normalize.
 * @returns The normalized NotaryGovernanceIssue.
 */
export const normalizeVerifier = (verifier: NotaryGovernanceIssue): NotaryGovernanceIssue =>
  Object.entries(verifier).reduce<Partial<NotaryGovernanceIssue>>((acc, [key, value]) => {
    let newValue = typeof value === 'string' ? value.trim() : value;

    if (key === 'region' && typeof newValue === 'string') {
      newValue = normalizeRegion(newValue);
    }

    if (key === 'organization' && typeof newValue === 'string') {
      if (['n/a', 'none'].includes(newValue.toLowerCase())) {
        newValue = null;
      }
    }

    if (key === 'websiteAndSocial' && newValue === 'n/a') {
      newValue = null;
    }

    // Direct assignment with correct type.
    acc[key as keyof NotaryGovernanceIssue] = newValue;
    return acc;
  }, {}) as NotaryGovernanceIssue;

export const normalizeVerifiers = (
  verifiers: NotaryGovernanceIssue[],
): NotaryGovernanceIssue[] => verifiers.map(normalizeVerifier);

export const convertHeightToUnix = (filHeight: number): number =>
  filHeight * FIL_BLOCK_TIME + FILECOIN_GENESIS_UNIX_EPOCH;

export const convertHeightToDate = (filHeight: number): string =>
  new Date(convertHeightToUnix(filHeight) * 1000).toISOString();

/**
 * Orders the keys of each object in the array.
 * @param items - Array of objects to order.
 * @returns Array with objects whose keys are sorted.
 */
export function orderByKey<T extends object>(items: T[]): T[] {
  return items.map((item) => {
    const ordered = {} as T;
    Object.keys(item)
      .sort()
      .forEach((key) => {
        ordered[key as keyof T] = item[key as keyof T];
      });
    return ordered;
  });
}

/**
 * Reads a JSON file and parses its content.
 * @param path - File path to read.
 * @returns Parsed JSON object.
 */
export async function readJSON<T>(path: string): Promise<T> {
  try {
    const text = await Deno.readTextFile(path);
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Error reading JSON from ${path}:`, error);
    throw error;
  }
}

/**
 * Writes an object as JSON to a file.
 * @param path - File path to write.
 * @param args - Arguments for JSON.stringify.
 */
export async function writeJSON(
  path: string,
  ...args: Parameters<typeof JSON.stringify>
): Promise<void> {
  try {
    await Deno.writeTextFile(path, JSON.stringify(...args));
  } catch (error) {
    console.error(`Error writing JSON to ${path}:`, error);
    throw error;
  }
}
