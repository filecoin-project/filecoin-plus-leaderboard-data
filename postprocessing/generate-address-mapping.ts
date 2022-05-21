// deno-lint-ignore-file no-unused-vars no-explicit-any
import { readJSON, writeJSON } from 'https://deno.land/x/flat@0.0.15/mod.ts';
import PQueue from 'https://cdn.skypack.dev/p-queue?dts';
import { isValidAddress } from '../utils/regexes.ts';

const queue = new PQueue({ concurrency: 4, interval: 500 });

// let count = 0;
// queue.on('active', () => {
//   console.log(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`);
// });

type AddressMap = {
  addressId: string;
  addressKey: string;
};

const addressMap: AddressMap[] = [];
// console.log('addressMap ->', addressMap);

const testAddressMap: AddressMap[] = [
  { addressId: '', addressKey: '' },
  { addressId: 'f0107408', addressKey: '' },
  { addressId: '', addressKey: 'f1k6wwevxvp466ybil7y2scqlhtnrz5atjkkyvm4a' },
  {
    addressId: 'f0107408',
    addressKey: 'f1k6wwevxvp466ybil7y2scqlhtnrz5atjkkyvm4a',
  },
];

const notaryGovernanceIssues = await readJSON(
  './data/processed/notary-governance-issues.json',
);
const verifiersFromInterplanetaryOne = await readJSON(
  './data/raw/interplanetaryone-verifiers.json',
);

// TODO(alexxnica): change to on-chain checks or modularize to accept different lists
// Resolves addressId and addressKey from the InterPlanetary One file.
const getInitialAddresses = (
  verifiers,
  verifiersFromInterplanetaryOne,
) => {
  return verifiers.map((verifier) => {
    let addressId, addressKey;

    addressId = verifier.addressId;
    addressKey = verifier.addressKey;

    if (!addressId && !!addressKey) {
      addressId = verifiersFromInterplanetaryOne.find((v) => v.address === addressKey)?.addressId;
    }

    if (!addressKey && !!addressId) {
      addressKey = verifiersFromInterplanetaryOne.find((v) => v.addressId === addressId)?.address;
    }

    return {
      addressId,
      addressKey,
    };
  });
};

const resolveAddressesWithGlif = async (addressMap: AddressMap[]): Promise<AddressMap[]> => {
  const newAddressMap: AddressMap[] = [];
  const apiEndpoint = 'https://api.node.glif.io/rpc/v0';

  addressMap.forEach(async (addresses) => {
    let addressId, addressKey;

    addressId = addresses.addressId;
    addressKey = addresses.addressKey;
    // console.log(addresses);

    if (!addressId && !!addressKey) {
      const getAddress = await queue.add(async () =>
        await fetch(`${apiEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'Filecoin.StateLookupID',
            id: 1,
            params: [`${addressKey}`, null],
          }),
        })
      );
      const getAddressData = await getAddress.json();
      // console.log('getAddressData ->', getAddressData);
      // console.log("addresses ->", addresses);
      addressId = getAddressData?.result;
      // console.log("Getting addressId ->", addressId);
    }

    if (!addressKey && !!addressId) {
      const getAddress = await queue.add(async () =>
        await fetch(`${apiEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'Filecoin.StateAccountKey',
            id: 1,
            params: [`${addressId}`, null],
          }),
        })
      );
      const getAddressData = await getAddress.json();
      // console.log("addresses ->", addresses);
      addressKey = getAddressData?.result;
      // console.log("Getting addressKey ->", addressKey);
    }

    // console.log({ addressId: addressId || null, addressKey: addressKey || null });
    // console.log();

    newAddressMap.push({ addressId: addressId || null, addressKey: addressKey || null });
  });

  await queue.onIdle();
  return newAddressMap;
};

const verifiers = Object.create({});
verifiers.fromIssues = notaryGovernanceIssues;
verifiers.fromInterplanetaryOne = verifiersFromInterplanetaryOne.data;
verifiers.resolvedAddresses = getInitialAddresses(
  verifiers.fromIssues,
  verifiers.fromInterplanetaryOne,
);
// verifiers.resolvedAddresses = testAddressMap;
verifiers.resolvedAddresses = await resolveAddressesWithGlif(
  verifiers.resolvedAddresses,
);
// console.log('verifiers.resolvedAddresses ->', verifiers.resolvedAddresses);

// const buildAddressMap = (resolvedAddresses) => {};

// console.log("verifiers.resolvedAddresses ->", verifiers.resolvedAddresses);

// Remove invalid addresses
verifiers.resolvedAddresses = verifiers.resolvedAddresses.filter(({ addressId, addressKey }) =>
  isValidAddress(addressId) && isValidAddress(addressKey)
);

verifiers.resolvedAddresses = await writeJSON(
  './data/generated/address-mapping.json',
  verifiers.resolvedAddresses,
);
