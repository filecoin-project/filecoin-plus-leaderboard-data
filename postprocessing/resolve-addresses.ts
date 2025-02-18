import PQueue from 'p-queue';
import PRetry from 'npm:p-retry';
import { AddressMap } from '../typings/Address.ts';
import { fetchAddressId, fetchAddressKey } from './fetch-address-data.ts';

const DEFAULT_RETRY_OPTIONS = {
  retries: 3,
  minTimeout: 100,
  maxTimeout: 1000,
  factor: 2,
};

/**
 * Resolves missing address information (addressId or addressKey) using the GLIF API.
 *
 * @param addresses - Array of address map objects, potentially with missing addressId or addressKey.
 * @param options - Queue options.
 * @returns A promise resolving to an array of address maps with resolved addressId and addressKey.
 */
export async function resolveAddresses(
  addresses: AddressMap[],
  options = { concurrency: 2, interval: 500, intervalCap: 5 },
): Promise<AddressMap[]> {
  console.log(`Resolving ${addresses.length} addresses...`);
  // console.log('Address map:', addresses);

  const queue = new PQueue(options);
  const results: AddressMap[] = [];
  const errors: unknown[] = [];

  addresses.forEach((addressData) => {
    queue.add(async () => {
      // console.log('Processing address:', { id: addressData.addressId, key: addressData.addressKey });

      // Skip addresses with both fields null.
      if (addressData.addressId === null && addressData.addressKey === null) {
        // console.warn('Both addressId and addressKey are null. Skipping...');
        results.push({ addressId: null, addressKey: null });
        return;
      }

      try {
        let id = addressData.addressId;
        let key = addressData.addressKey;

        // Resolve missing addressId when addressKey exists and vice versa.
        if (id === null && key !== null) {
          id = await PRetry(() => fetchAddressId(key as string), DEFAULT_RETRY_OPTIONS);
        } else if (key === null && id !== null) {
          key = await PRetry(() => fetchAddressKey(id as string), DEFAULT_RETRY_OPTIONS);
        }

        results.push({
          addressId: id ?? null,
          addressKey: key ?? null,
        });

        // console.log('Resolved address:', { id, key });
      } catch (error) {
        console.error('Error resolving address for', addressData, error);
        errors.push(error);
        results.push({ addressId: null, addressKey: null });
      }
    });
  });

  // Wait until the queue is idle (all tasks are completed).
  await queue.onIdle();

  if (errors.length > 0) {
    throw new AggregateError(errors, 'Errors during address resolution');
  }

  return results;
}
