import _ from 'https://esm.sh/lodash?no-check';
import * as regexes from './regexes.ts';
export const trimAndClean = (string: string) =>
  string
    ?.trim()
    ?.replace(/<\/?[^>]*>/gi, '')
    ?.replace(/^\[|\]$/gi, '');

export const isAddressKey = (address: string) => address?.length >= 14 && address?.length <= 100;
export const isAddressId = (address: string) => address?.length > 4 && address?.length <= 13;
export const normalizeVerifier = (verifier: {}) => {
  const regions = [
    'AFRICA',
    'ASIA_NOT_GREATER_CHINA',
    'EUROPE',
    'GREATER_CHINA',
    'NORTH_AMERICA',
    'OCEANIA',
    'SOUTH_AMERICA',
    'GLOBAL',
    'OTHER',
  ];
  const normalizeRegion = (region) => {
    const regionList = [];
    if (regexes.regionIsAfrica(region)) regionList.push('AFRICA');
    if (regexes.regionIsAsiaNotGreaterChina(region)) {
      regionList.push('ASIA_NOT_GREATER_CHINA');
    }
    if (regexes.regionIsEurope(region)) regionList.push('EUROPE');
    if (regexes.regionIsGreaterChina(region)) regionList.push('GREATER_CHINA');
    if (regexes.regionIsNorthAmerica(region)) regionList.push('NORTH_AMERICA');
    if (regexes.regionIsOceania(region)) regionList.push('OCEANIA');
    if (regexes.regionIsSouthAmerica(region)) regionList.push('SOUTH_AMERICA');
    if (regexes.regionIsGlobal(region)) regionList.push('GLOBAL');
    if (regexes.regionIsOther(region)) regionList.push('OTHER');
    if (regionList?.length === 0) regionList.push('OTHER');

    return regionList.filter((v) => regions.includes(v));
  };

  return Object.fromEntries(
    Object.entries(verifier).map(([key, value]) => {
      let newValue;
      newValue = (_.isString(value) && (value as string).trim()) || value;
      if (key === 'region') newValue = normalizeRegion(newValue);

      if (key === 'organization') {
        if (newValue?.toString() === 'n/a' || newValue?.toString() === 'None') {
          newValue = null;
        }
      }

      if (key === 'websiteAndSocial') {
        if (newValue === 'n/a') newValue = null;
      }

      return [key, newValue];
    }),
  );
};
export const normalizeVerifiers = (verifiers: any[]) => verifiers.map((verifier) => normalizeVerifier(verifier));

export const FILECOIN_GENESIS_UNIX_EPOCH = 1598306400;
export const convertHeightToUnix = (filHeight: number) => filHeight * 30 + FILECOIN_GENESIS_UNIX_EPOCH;
export const convertHeightToDate = (filHeight: number) =>
  new Date(
    convertHeightToUnix(filHeight) * 1000,
  ).toISOString();

export const orderByKey = (items) =>
  items.map((item) =>
    Object.keys(item).sort().reduce(
      (obj, key) => {
        obj[key] = item[key];
        return obj;
      },
      {},
    )
  );
