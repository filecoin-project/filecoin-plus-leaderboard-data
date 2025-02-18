import { readJSON, writeJSON } from '../utils/general.ts';
import _ from 'lodash';
import { Verifier } from '../typings/Verifier.ts';
import { convertHeightToDate, orderByKey } from '../utils/general.ts';
import { GENERATED_DATA_PATH, PROCESSED_DATA_PATH, RAW_DATA_PATH } from '../constants.ts';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';
import { InterplanetaryOneVerifiers, VerifierData } from '../typings/InterplanetaryOneVerifiers.ts';
import { InterplanetaryOneVerifiedClientsResponse } from '../typings/InterplanetaryOneVerifiedClients.ts';
import { InterplanetaryOneAllowances } from '../typings/InterplanetaryOneAllowances.ts';
import { AddressMap } from '../typings/Address.ts';
import {
  enrichWithInterplanetaryOne,
  enrichWithLdnTtdData,
  enrichWithTtdData,
  enrichWithVerifiedClients,
} from '../utils/enrichers.ts';

const notaryGovernanceIssues: NotaryGovernanceIssue[] = await readJSON(
  `${PROCESSED_DATA_PATH}/notary-governance-issues.json`,
);
const verifiersFromInterplanetaryOne: InterplanetaryOneVerifiers = await readJSON(
  `${RAW_DATA_PATH}/interplanetaryone-verifiers.json`,
);
const verifiedClientsFromInterplanetaryOne: InterplanetaryOneVerifiedClientsResponse = await readJSON(
  `${RAW_DATA_PATH}/interplanetaryone-verified-clients.json`,
);
const allowancesFromIpo: InterplanetaryOneAllowances = await readJSON(
  `${RAW_DATA_PATH}/interplanetaryone-allowances.json`,
);
const addressMap: AddressMap[] = await readJSON(`${GENERATED_DATA_PATH}/address-mapping.json`);

const withResolvedAddresses = (verifiers: NotaryGovernanceIssue[]): NotaryGovernanceIssue[] => {
  return verifiers.map((verifier) => {
    let addressId = verifier.addressId;
    let addressKey = verifier.addressKey;

    if (!addressId && !!addressKey) {
      addressId = addressMap.find((v) => v.addressKey === addressKey)?.addressId ?? null;
    }

    if (!addressKey && !!addressId) {
      addressKey = addressMap.find((v) => v.addressId === addressId)?.addressKey ?? null;
    }

    return {
      ...verifier,
      addressId,
      addressKey,
    };
  });
};

const verifiers: {
  fromIssues: NotaryGovernanceIssue[];
  fromInterplanetaryOne: InterplanetaryOneVerifiers['data'];
  filtered: NotaryGovernanceIssue[];
  toOutput: Verifier[];
  toOutputOrdered?: Verifier[];
} = {
  fromIssues: withResolvedAddresses(notaryGovernanceIssues),
  fromInterplanetaryOne: verifiersFromInterplanetaryOne.data,
  filtered: [],
  toOutput: [],
};
console.log(`Total verifiers from issues:`, verifiers.fromIssues.length);
console.log(`Total verifiers from Interplanetary One:`, verifiers.fromInterplanetaryOne.length);

const verifiedClients: {
  fromInterplanetaryOne: InterplanetaryOneVerifiedClientsResponse['data'];
} = {
  fromInterplanetaryOne: verifiedClientsFromInterplanetaryOne.data,
};

// Can only be used for verifiers enriched with InterPlanetary One data.
const orderVerifiers = (verifiers: Verifier[]) =>
  _.orderBy(
    verifiers,
    [
      (v: Verifier) => _.get(v, 'fromInterplanetaryOne.verifiedClientsCount'),
      (v: Verifier) => _.get(v, 'fromInterplanetaryOne.initialAllowance'),
    ],
    ['desc', 'desc'],
  );

const getIssueNumberFromAuditTrail = (auditTrail: VerifierData['auditTrail']): number | undefined => {
  const match = /([0-9]+)$/im.exec(auditTrail);
  return match ? Number(match[1]) : undefined;
};

// Filter verifiers having the same issue number registered on the InterPlanetary One API.
const filterExistsInInterplanetaryOne = (
  verifiers: NotaryGovernanceIssue[],
  verifiersFromInterplanetaryOne: InterplanetaryOneVerifiers['data'],
): NotaryGovernanceIssue[] =>
  verifiers.filter((verifier) =>
    verifiersFromInterplanetaryOne.find(
      (fromIpo) =>
        verifier.addressId === fromIpo.addressId ||
        verifier.addressKey === fromIpo.address ||
        verifier.issueNumber === getIssueNumberFromAuditTrail(fromIpo.auditTrail),
    )
  );

verifiers.filtered = filterExistsInInterplanetaryOne(verifiers.fromIssues, verifiers.fromInterplanetaryOne);
console.log(`Total verifiers after filtering:`, verifiers.filtered.length);

verifiers.toOutput = enrichWithInterplanetaryOne(verifiers.filtered, verifiers.fromInterplanetaryOne);
console.log(`Total verifiers after enriching with Interplanetary One data:`, verifiers.toOutput.length);

verifiers.toOutput = orderVerifiers(verifiers.toOutput);
console.log('Total verifiers after ordering:', verifiers.toOutput.length);

verifiers.toOutput = enrichWithVerifiedClients(verifiers.toOutput, verifiedClients.fromInterplanetaryOne);
console.log('Total verifiers after enriching with Interplanetary One data:', verifiers.toOutput.length);

verifiers.toOutput = enrichWithTtdData(verifiers.toOutput);
console.log('Total verifiers after enriching with TTD data:', verifiers.toOutput.length);

verifiers.toOutput = enrichWithLdnTtdData(verifiers.toOutput, allowancesFromIpo);
console.log('Total verifiers after enriching with LDN TTD data:', verifiers.toOutput.length);

// Sort by TTD
verifiers.toOutput = _.orderBy(verifiers.toOutput, [(v) => _.get(v, 'ttdAverages.averageTtdRaw')], ['asc']);

// Deduplicate verifiers by addressId
verifiers.toOutput = _.uniqBy(verifiers.toOutput, 'addressId');
console.log('Total verifiers after deduplication:', verifiers.toOutput.length);

// TODO(alexxnica): Find a better way of organizing filters.
// Additional filters
verifiers.toOutput = verifiers.toOutput.filter((verifier) => !!verifier.name);
console.log('Total verifiers after filtering out empty names:', verifiers.toOutput.length);

verifiers.toOutput = verifiers.toOutput.filter((verifier) => verifier.name != 'n/a');
console.log('Total verifiers after filtering out "n/a" names:', verifiers.toOutput.length);

verifiers.toOutput = verifiers.toOutput.filter((verifier) =>
  verifier.name && !/Testing[^a-zA-Z]*Deleted/i.test(verifier.name)
);
console.log('Total verifiers after filtering out "Testing Deleted" names:', verifiers.toOutput.length);

// TODO(alexxnica): organize, refine, and refactor this.
verifiers.toOutput = verifiers.toOutput.map((verifier) => {
  const { fromInterplanetaryOne } = verifier;
  return {
    ...verifier,
    createdAt: verifier.createdAt
      ? verifier.createdAt
      : (fromInterplanetaryOne?.createdAtHeight && convertHeightToDate(fromInterplanetaryOne.createdAtHeight)),
    status: (!!fromInterplanetaryOne?.removed && 'REMOVED') || 'ACTIVE',
    hasDatacap: {
      total: fromInterplanetaryOne?.initialAllowance ? BigInt(fromInterplanetaryOne.initialAllowance).toString() : null,
      allocated: (fromInterplanetaryOne?.initialAllowance && fromInterplanetaryOne.allowance)
        ? BigInt(
          BigInt(fromInterplanetaryOne.initialAllowance) - BigInt(fromInterplanetaryOne.allowance),
        ).toString()
        : null,
      available: fromInterplanetaryOne?.allowance ? BigInt(fromInterplanetaryOne.allowance).toString() : null,
    },
    hasStats: {
      timeToDatacap: verifier.ttdAverages ?? { averageTtd: null, averageTtdRaw: null },
      ldnTimeToDatacap: verifier.ldnTtdAverages ?? { averageTtd: null, averageTtdRaw: null },
    },
    clientsCount: fromInterplanetaryOne?.verifiedClientsCount,
    issueUrl: (_.isNumber(verifier.issueNumber) &&
      `https://github.com/filecoin-project/notary-governance/issues/${verifier.issueNumber}`) ||
      null,
  };
});

console.log(
  `Verifiers with isMultisig set to true:`,
  verifiers.toOutput.filter((v) => v.fromInterplanetaryOne?.isMultisig).length,
);
console.log(
  'Verifiers with isMultisig set to false:',
  verifiers.toOutput.filter((v) => !v.fromInterplanetaryOne?.isMultisig).length,
);

// Remove all multisigs from the output (because they're all (presumably) LDNs and not verifiers)
verifiers.toOutput = verifiers.toOutput.filter((v) => {
  if (!v.fromInterplanetaryOne?.isMultisig) return true;

  return false;
});
console.log('Total verifiers after filtering out multisigs:', verifiers.toOutput.length);

verifiers.toOutputOrdered = orderByKey(verifiers.toOutput);

console.log('Total verifiers:', verifiers.toOutputOrdered.length);

await writeJSON(`${GENERATED_DATA_PATH}/verifiers.json`, verifiers.toOutputOrdered);
