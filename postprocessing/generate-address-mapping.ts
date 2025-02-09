import { readJSON, writeJSON } from '../utils/general.ts';
import PQueue from 'p-queue';
import { isValidAddress } from '../utils/regexes.ts';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';
import { InterplanetaryOneVerifiers, VerifierData } from '../typings/InterplanetaryOneVerifiers.ts';

const queue = new PQueue({ concurrency: 4, interval: 500 });

type AddressMap = {
  addressId: string | null;
  addressKey: string | null;
};

// TODO: remove this when write real tests
const addressMap: AddressMap[] = [];
const testAddressMap: AddressMap[] = [
  { addressId: '', addressKey: '' },
  { addressId: 'f0107408', addressKey: '' },
  { addressId: '', addressKey: 'f1k6wwevxvp466ybil7y2scqlhtnrz5atjkkyvm4a' },
  {
    addressId: 'f0107408',
    addressKey: 'f1k6wwevxvp466ybil7y2scqlhtnrz5atjkkyvm4a',
  },
];

const notaryGovernanceIssues: NotaryGovernanceIssue[] = await readJSON(
  './data/processed/notary-governance-issues.json',
);
const verifiersFromInterplanetaryOne: InterplanetaryOneVerifiers = await readJSON(
  './data/raw/interplanetaryone-verifiers.json',
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

const fetchAddressData = async (apiEndpoint: string, method: string, param: string) => {
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
        params: [param, null],
      }),
    });
    const data = await response.json();
    return data?.result;
  } catch (error) {
    console.error(`Error fetching data for ${method} with param ${param}:`, error);
    return null;
  }
};

const resolveAddressesWithGlif = async (addressMap: AddressMap[]): Promise<AddressMap[]> => {
  const apiEndpoint = 'https://api.node.glif.io/rpc/v0';

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

await writeJSON('./data/generated/address-mapping.json', verifiers.resolvedAddresses);
