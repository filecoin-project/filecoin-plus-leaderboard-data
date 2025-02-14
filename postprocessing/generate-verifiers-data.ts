import { readJSON, writeJSON } from '../utils/general.ts';
import _ from 'lodash';
import { Verifier } from '../typings/Verifier.ts';
import { convertHeightToDate, orderByKey } from '../utils/general.ts';
import { GENERATED_DATA_PATH, PROCESSED_DATA_PATH, RAW_DATA_PATH } from '../constants.ts';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';
import { InterplanetaryOneVerifiers, VerifierData } from '../typings/InterplanetaryOneVerifiers.ts';
import {
  InterplanetaryOneVerifiedClientsResponse
} from '../typings/InterplanetaryOneVerifiedClients.ts';
import { InterplanetaryOneAllowances } from '../typings/InterplanetaryOneAllowances.ts';
import { AddressMap } from '../typings/Address.ts';
import {
  enrichWithInterplanetaryOne,
  enrichWithVerifiedClients,
  enrichWithTtdData,
  enrichWithLdnTtdData,
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

verifiers.toOutput = orderVerifiers(enrichWithInterplanetaryOne(verifiers.filtered, verifiers.fromInterplanetaryOne));
verifiers.toOutput = enrichWithVerifiedClients(verifiers.toOutput, verifiedClients.fromInterplanetaryOne);
verifiers.toOutput = enrichWithTtdData(verifiers.toOutput);
verifiers.toOutput = enrichWithLdnTtdData(verifiers.toOutput, allowancesFromIpo);
verifiers.toOutput = _.orderBy(verifiers.toOutput, [(v) => _.get(v, 'ttdAverages.averageTtdRaw')], ['asc']);
verifiers.toOutput = _.uniqBy(verifiers.toOutput, 'addressId');

// TODO(alexxnica): Find a better way of organizing filters.
// Additional filters
verifiers.toOutput = verifiers.toOutput
  .filter((verifier) => !!verifier.name)
  .filter((verifier) => verifier.name != 'n/a')
  .filter((verifier) => verifier.name && !/Testing[^a-zA-Z]*Deleted/i.test(verifier.name));

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

// Remove all multisigs from the output (because they're all (presumably) LDNs and not verifiers)
verifiers.toOutput = verifiers.toOutput.filter((v) => !v.fromInterplanetaryOne?.isMultisig);
verifiers.toOutputOrdered = orderByKey(verifiers.toOutput);

console.log(`Total verifiers: ${verifiers.toOutput.length}`);

await writeJSON(`${GENERATED_DATA_PATH}/verifiers.json`, verifiers.toOutputOrdered);
