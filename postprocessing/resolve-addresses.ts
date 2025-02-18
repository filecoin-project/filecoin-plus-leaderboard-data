import PQueue from 'p-queue';
import PRetry from 'npm:p-retry';
import { AddressMap } from '../typings/Address.ts';
import { fetchAddressId, fetchAddressKey } from './fetch-address-data.ts';

const DEFAULT_RETRY_OPTIONS = {
  retries: 5,
  minTimeout: 2000,
  maxTimeout: 10000,
  factor: 2,
  onFailedAttempt: (error: any) => {
    if (error.response?.status === 429) {
      console.log(`Rate limited. Retrying ${error.attemptNumber} times...`);
    } else {
      console.error('Error fetching address data:', error);
    }
  },
};

let addressCount = 0;

/**
 * Resolves missing address information (addressId or addressKey) using the GLIF API.
 *
 * @param addresses - Array of address map objects, potentially with missing addressId or addressKey.
 * @param options - Queue options.
 * @returns A promise resolving to an array of address maps with resolved addressId and addressKey.
 */
export async function resolveAddresses(
  addresses: AddressMap[],
  options = { concurrency: 50, interval: 300, intervalCap: 50 },
): Promise<AddressMap[]> {
  console.log(`Resolving ${addresses.length} addresses...`);

  const queue = new PQueue(options);
  queue.on('add', () => {
    console.log(`Task is added. Size: ${queue.size}  Pending: ${queue.pending}`);
  });

  queue.on('next', () => {
    console.log(`Task is completed. Size: ${queue.size}  Pending: ${queue.pending}`);
  });

  const results: AddressMap[] = [];
  const errors: unknown[] = [];

  addresses.forEach((addressData) => {
    const currentAddressNumber = ++addressCount;
    console.log(`Processing address ${addressCount}/${addresses.length}:`, {
      id: addressData.addressId,
      key: addressData.addressKey,
    });

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
        console.log(`Resolved address ${currentAddressNumber}/${addresses.length}:`, { id, key });
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
    console.error('Aggregate Errors:', errors);
    throw new AggregateError(errors, 'Errors during address resolution');
  }

  console.log(
    `Completed: Resolved ${results.filter((r) => r.addressId || r.addressKey).length} out of ${addresses.length}`,
  );
  return results;
}
