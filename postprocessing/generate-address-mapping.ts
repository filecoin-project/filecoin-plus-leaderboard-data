import { readJSON, writeJSON } from '../utils/general.ts';
import PQueue from 'p-queue';
import { isValidAddress } from '../utils/regexes.ts';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';
import { InterplanetaryOneVerifiers, VerifierData } from '../typings/InterplanetaryOneVerifiers.ts';
import { GENERATED_DATA_PATH, GLIF_API_ENDPOINT, PROCESSED_DATA_PATH, RAW_DATA_PATH } from '../constants.ts';
import { AddressMap } from '../typings/Address.ts';

const notaryGovernanceIssues: NotaryGovernanceIssue[] = await readJSON(
  `${PROCESSED_DATA_PATH}/notary-governance-issues.json`,
);
const verifiersFromInterplanetaryOne: InterplanetaryOneVerifiers = await readJSON(
  `${RAW_DATA_PATH}/interplanetaryone-verifiers.json`,
);

// TODO(alexxnica): change to on-chain checks or modularize to accept different lists
// Resolves addressId and addressKey from the InterPlanetary One file.
const getInitialAddresses = (
  verifiers: NotaryGovernanceIssue[],
  verifiersFromInterplanetaryOne: VerifierData[],
): AddressMap[] => {
  return verifiers.map((verifier) => {
    let addressId = verifier.addressId;
    let addressKey = verifier.addressKey;

    if (!addressId && !!addressKey) {
      addressId = verifiersFromInterplanetaryOne.find((v) => v.address === addressKey)?.addressId ?? null;
    }

    if (!addressKey && !!addressId) {
      addressKey = verifiersFromInterplanetaryOne.find((v) => v.addressId === addressId)?.address ?? null;
    }

    return {
      addressId: addressId || null,
      addressKey: addressKey || null,
    };
  });
};

// Add a simple cache to avoid duplicate network calls.
const addressCache = new Map<string, string>();

const fetchAddressData = async (apiEndpoint: string, method: string, address: string) => {
  // Check cache first
  const cacheKey = `${method}-${address}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey);
  }
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        id: 1,
        params: [address, null],
      }),
    });
    const data = await response.json();

    if (!data.result) {
      console.error(`No result returned for ${method} with address ${address}`);
      // throw new Error(`No result returned for ${method} with address ${address}`);
    }

    addressCache.set(cacheKey, data.result);
    return data.result;
  } catch (error) {
    console.error(`Error fetching data for ${method} with address ${address}:`, error);

    return null;
  }
};

const fetchAddressById = async (addressId: string) => {
  return await fetchAddressData(GLIF_API_ENDPOINT, 'Filecoin.StateAccountKey', addressId);
};

const fetchAddressByKey = async (addressKey: string) => {
  return await fetchAddressData(GLIF_API_ENDPOINT, 'Filecoin.StateLookupID', addressKey);
};

const resolveAddressesWithGlif = async (addressMap: AddressMap[]): Promise<AddressMap[]> => {
  const queue = new PQueue({ concurrency: 4, interval: 500 });
  // use GLIF_API_ENDPOINT from constants, not a hardcoded string
  const apiEndpoint = GLIF_API_ENDPOINT;

  const promises = addressMap.map(async (addresses) => {
    let { addressId, addressKey } = addresses;

    if (!addressId && addressKey) {
      addressId = await queue.add(() => fetchAddressData(apiEndpoint, 'Filecoin.StateLookupID', addressKey!));
    }

    if (!addressKey && addressId) {
      addressKey = await queue.add(() => fetchAddressData(apiEndpoint, 'Filecoin.StateAccountKey', addressId));
    }

    return { addressId: addressId || null, addressKey: addressKey || null };
  });

  const newAddressMap = await Promise.all(promises);
  await queue.onIdle();

  return newAddressMap;
};

const verifiers = {
  fromIssues: notaryGovernanceIssues,
  fromInterplanetaryOne: verifiersFromInterplanetaryOne.data,
  resolvedAddresses: [] as AddressMap[],
};

verifiers.resolvedAddresses = getInitialAddresses(
  verifiers.fromIssues,
  verifiers.fromInterplanetaryOne,
);

verifiers.resolvedAddresses = await resolveAddressesWithGlif(
  verifiers.resolvedAddresses,
);

// Filter out invalid addresses
verifiers.resolvedAddresses = verifiers.resolvedAddresses.filter(({ addressId, addressKey }) =>
  addressId !== null && addressKey !== null && isValidAddress(addressId) && isValidAddress(addressKey)
);

console.log('Resolved addresses:', verifiers.resolvedAddresses.length);

await writeJSON(`${GENERATED_DATA_PATH}/address-mapping.json`, verifiers.resolvedAddresses);
