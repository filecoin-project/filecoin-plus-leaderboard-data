import { readJSON, writeJSON } from '../utils/general.ts';
import { isValidAddress } from '../utils/regexes.ts';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';
import { InterplanetaryOneVerifiers, VerifierData } from '../typings/InterplanetaryOneVerifiers.ts';
import { GENERATED_DATA_PATH, PROCESSED_DATA_PATH, RAW_DATA_PATH } from '../constants.ts';
import { AddressMap } from '../typings/Address.ts';
import { resolveAddresses } from './resolve-addresses.ts';

type AddressIdentifier = string | null | undefined;

async function loadData() {
  try {
    const issues: NotaryGovernanceIssue[] = await readJSON(
      `${PROCESSED_DATA_PATH}/notary-governance-issues.json`,
    );
    const interplanetaryOne: InterplanetaryOneVerifiers = await readJSON(
      `${RAW_DATA_PATH}/interplanetaryone-verifiers.json`,
    );
    return { issues, interplanetaryOne: interplanetaryOne.data };
  } catch (error) {
    console.error('Error reading input JSON files:', error);
    throw error;
  }
}

/**
 * Initializes address map by attempting to match addressId and addressKey
 * from different data sources.
 *
 * @param verifiers - Verifiers from notary governance issues.
 * @param verifiersFromInterplanetaryOne - Verifiers from Interplanetary One.
 * @returns An array of address maps with initial addressId and addressKey.
 */
const initializeAddressMap = (
  verifiers: NotaryGovernanceIssue[],
  verifiersFromInterplanetaryOne: VerifierData[],
): AddressMap[] => {
  return verifiers.map((verifier) => {
    let addressId: AddressIdentifier = verifier.addressId;
    let addressKey: AddressIdentifier = verifier.addressKey;

    if (!addressId && addressKey) {
      const found = verifiersFromInterplanetaryOne.find((v) => v.address === addressKey);
      addressId = found?.addressId;
    }

    if (!addressKey && addressId) {
      const found = verifiersFromInterplanetaryOne.find((v) => v.addressId === addressId);
      addressKey = found?.address;
    }

    return {
      addressId: addressId ?? null,
      addressKey: addressKey ?? null,
    };
  });
};

const deduplicateAddresses = (addresses: AddressMap[]): AddressMap[] => {
  const seen = new Set<string>();
  const unique: AddressMap[] = [];
  for (const addr of addresses) {
    const key = `${addr.addressId}-${addr.addressKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(addr);
    }
  }
  return unique;
};

async function main() {
  const { issues, interplanetaryOne } = await loadData();

  let resolvedAddresses = initializeAddressMap(issues, interplanetaryOne);
  console.log('Initial address map length:', resolvedAddresses.length);

  resolvedAddresses = await resolveAddresses(resolvedAddresses);
  console.log('Number of addresses after resolve:', resolvedAddresses.length);

  // Filter out invalid addresses
  resolvedAddresses = resolvedAddresses.filter(({ addressId, addressKey }) =>
    addressId !== null && addressKey !== null && isValidAddress(addressId) && isValidAddress(addressKey)
  );

  // Remove duplicates and sort by addressId.
  resolvedAddresses = deduplicateAddresses(resolvedAddresses).sort((a, b) =>
    a.addressId?.localeCompare(b.addressId ?? '') || 0
  );
  console.log('Number of resolved and filtered addresses:', resolvedAddresses.length);

  try {
    await writeJSON(`${GENERATED_DATA_PATH}/address-mapping.json`, resolvedAddresses);
    console.log('Address mapping written to file.');
  } catch (error) {
    console.error('Error writing address mapping to file:', error);
  }
}

main().catch((error) => {
  console.error('Error processing address mappings:', error);
});
