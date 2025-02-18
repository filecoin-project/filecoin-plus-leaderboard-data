import { GLIF_API_ENDPOINT } from '../constants.ts';
import { isValidAddress } from '../utils/regexes.ts';

// Color codes for console output
const red = '\x1b[31m';
const reset = '\x1b[0m';

// Simple cache to avoid duplicate network calls.
export const addressCache = new Map<string, string>();

const getRequestOptions = (method: string, address: string) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method,
    id: 1,
    params: [address, null],
  }),
});

export const fetchAddressData = async (
  apiEndpoint: string,
  method: string,
  address: string,
): Promise<string | null> => {
  if (!isValidAddress(address)) {
    console.warn(`Invalid address provided: ${address}`);
    return null;
  }

  const cacheKey = `${method}-${address}`;
  if (addressCache.has(cacheKey)) {
    console.log(`Cache hit for ${cacheKey}`);
    return addressCache.get(cacheKey) || null;
  }

  try {
    const response = await fetch(apiEndpoint, getRequestOptions(method, address));

    if (!response.ok) {
      console.error(`HTTP Error - Status: ${response.status}, Method: ${method}, Address: ${address}`);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      // Log specific error from GLIF API
      console.error(`GLIF API error for ${method} with address ${address}:`, data.error);
      return null;
    }

    if (!data.result) {
      console.warn(`No result returned from GLIF API for ${method} with address ${address}`);
      return null;
    }

    // Cache result for future calls
    addressCache.set(cacheKey, data.result);
    // console.log(`Caching response for key ${cacheKey}`);
    return data.result;
  } catch (error) {
    console.error(`Failed to fetch ${method} data for address ${address}:`, error);
    return null;
  }
};

export const fetchAddressKey = async (addressId: string) => {
  return await fetchAddressData(GLIF_API_ENDPOINT, 'Filecoin.StateAccountKey', addressId);
};

export const fetchAddressId = async (addressKey: string) => {
  return await fetchAddressData(GLIF_API_ENDPOINT, 'Filecoin.StateLookupID', addressKey);
};
