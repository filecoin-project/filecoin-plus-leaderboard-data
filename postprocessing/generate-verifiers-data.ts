// deno-lint-ignore-file no-unused-vars no-explicit-any
import { readJSON, writeJSON } from 'https://deno.land/x/flat@0.0.15/mod.ts';
import _ from 'https://esm.sh/lodash@4.17.21?no-check';
import moment from 'https://esm.sh/moment@2.29.4';

import { Verifier } from '../typings/Verifier.ts';
import { convertHeightToDate, orderByKey } from '../utils/general.ts';
// import * as util from "https://deno.land/std@0.138.0/node/util.ts";

// util.inspect.defaultOptions = {
//   ...util.inspect.defaultOptions,
//   colors: true,
//   depth: 12,
//   maxArrayLength: null,
//   showHidden: true,
//   breakLength: Infinity,
//   // breakLength: 2,
// };

// import notaryGovernanceIssues from "../data/processed/notary-governance-issues.json" assert {
//   type: "json",
// };
// import verifiersFromInterplanetaryOne from "../data/raw/interplanetaryone-verifiers.json" assert {
//   type: "json",
// };

const notaryGovernanceIssues = await readJSON(
  './data/processed/notary-governance-issues.json',
);
const verifiersFromInterplanetaryOne = await readJSON(
  './data/raw/interplanetaryone-verifiers.json',
);
const verifiedClientsFromInterplanetaryOne = await readJSON(
  './data/raw/interplanetaryone-verified-clients.json',
);
const allowancesFromIpo = await readJSON(
  './data/raw/interplanetaryone-allowances.json',
);
const addressMap = await readJSON(
  './data/generated/address-mapping.json',
);

const withResolvedAddresses = (verifiers) => {
  // console.log("addressMap ->", addressMap);
  return verifiers.map((verifier) => {
    let addressId, addressKey;

    addressId = verifier.addressId;
    addressKey = verifier.addressKey;

    if (!addressId && !!addressKey) {
      // console.log("Missing addressId");
      addressId = addressMap.find((v) => v.addressKey === addressKey)
        ?.addressId;
      // console.log("new addressId ->", addressId);
    }

    if (!addressKey && !!addressId) {
      // console.log("Missing addressKey");
      addressKey = addressMap.find((v) => v.addressId === addressId)
        ?.addressKey;
      // console.log("new addressKey ->", addressKey);
    }

    return {
      ...verifier,
      addressId,
      addressKey,
    };
  });
};

type Verifiers = {
  fromIssues?: any;
  fromInterplanetaryOne?: any;
  filtered?: any;
  toOutput: Verifier[];
  toOutputOrdered?: Verifier[];
};

const verifiers: Verifiers = Object.create({});
verifiers.fromIssues = notaryGovernanceIssues;
verifiers.fromInterplanetaryOne = verifiersFromInterplanetaryOne.data;
verifiers.fromIssues = withResolvedAddresses(verifiers.fromIssues);

const verifiedClients = Object.create({});
verifiedClients.fromInterplanetaryOne = verifiedClientsFromInterplanetaryOne.data;

// Can only be used for verifiers enriched with InterPlanetary One data.
const orderVerifiers = (verifiers) =>
  _.orderBy(verifiers, [
    (v) => _.get(v, 'fromInterplanetaryOne.verifiedClientsCount'),
    (v) => _.get(v, 'fromInterplanetaryOne.initialAllowance'),
  ], [
    'desc',
    'desc',
  ]);

const getIssueNumberFromAuditTrail = (auditTrail) => /([0-9]+)$/im.exec(auditTrail)?.[1] || [];

// Filter verifiers having the same issue number registered on the InterPlanetary One API.
const filterExistsInInterplanetaryOne = (
  verifiers: any[],
  verifiersFromInterplanetaryOne,
) =>
  verifiers.filter((verifier) =>
    verifiersFromInterplanetaryOne.find((fromIpo) => (
      verifier.addressId === fromIpo.addressId ||
      verifier.addressKey === fromIpo.address ||
      verifier.issueNumber === getIssueNumberFromAuditTrail(fromIpo.auditTrail)
    ))
  );

verifiers.filtered = filterExistsInInterplanetaryOne(
  verifiers.fromIssues,
  verifiers.fromInterplanetaryOne,
);

const enrichWithInterplanetaryOne = (
  verifiers: any[],
  verifiersFromInterplanetaryOne,
) =>
  verifiers.map((verifier) => ({
    ...verifier,
    fromInterplanetaryOne: {
      ...verifiersFromInterplanetaryOne.find((fromIpo) =>
        verifier.addressId === fromIpo.addressId ||
        verifier.addressKey === fromIpo.address
      ),
    },
  }));

const enrichWithVerifiedClients = (
  verifiers: any[],
  verifiedClientsFromInterplanetaryOne,
) =>
  verifiers.map((verifier) => ({
    ...verifier,
    verifiedClientsFromInterplanetaryOne: _.groupBy(
      verifiedClientsFromInterplanetaryOne,
      (vc) => vc.verifierAddressId === verifier.addressId,
    ).true,
  }));

verifiers.toOutput = orderVerifiers(
  enrichWithInterplanetaryOne(
    verifiers.filtered,
    verifiers.fromInterplanetaryOne,
  ),
);
verifiers.toOutput = enrichWithVerifiedClients(
  verifiers.toOutput,
  verifiedClients.fromInterplanetaryOne,
);

const enrichWithTtdData = (verifiers: any[]) => {
  const humanizeDate = (seconds: any) => moment.duration(seconds, 'seconds').humanize();
  const calculateTtd = (verifiedClients) =>
    verifiedClients?.map((
      vc,
    ) => (vc.createMessageTimestamp - vc.issueCreateTimestamp));
  const calculateTtdAverages = (ttdData) => {
    if (_.isEmpty(ttdData)) {
      return { averageTtd: null, averageTtdRaw: null };
    }

    const ttdSum = ttdData.reduce((previous: any, current: any) => previous + current);
    const ttdSumInSeconds = Number(Number(ttdSum / ttdData.length).toFixed());
    const ttdSumInDuration = humanizeDate(ttdSumInSeconds);

    return {
      averageTtd: ttdSumInDuration,
      averageTtdRaw: ttdSumInSeconds,
    };
  };
  // console.log('verifiers ->', verifiers);

  const filterVerifiedClients = (verifiedClients, verifierAddressId?) =>
    verifiedClients?.filter((verifiedClient) =>
      // Remove invalid timestamps
      !!verifiedClient.createMessageTimestamp &&
      !!verifiedClient.issueCreateTimestamp &&
      (verifiedClient.createMessageTimestamp >
        verifiedClient.issueCreateTimestamp) &&
      // Remove allocations with clients having the same addressId as the verifier
      (!!verifierAddressId && (verifiedClient.addressId != verifierAddressId))
    );

  return verifiers.map((verifier) => {
    const ttdData = calculateTtd(
      filterVerifiedClients(
        verifier.verifiedClientsFromInterplanetaryOne,
        verifier.addressId,
      ),
    );
    const ttdDataAverages = calculateTtdAverages(ttdData);

    // console.log('verifiedClientsFiltered ->', verifiedClientsFiltered);
    // console.log("ttdData ->", ttdData);
    // console.log("ttdDataAverages ->", ttdDataAverages);

    return {
      ...verifier,
      ttdAverages: ttdDataAverages,
    };
  });
};

// TODO: refactor this into a reusable module.
const enrichWithLdnTtdData = (verifiers: any[]) => {
  const humanizeDate = (seconds: any) => moment.duration(seconds, 'seconds').humanize();
  const calculateTtdAverages = (ttdData) => {
    if (_.isEmpty(ttdData)) {
      return { averageTtd: null, averageTtdRaw: null };
    }

    const ttdSum = ttdData.reduce((previous: any, current: any) => previous + current);
    const ttdSumInSeconds = Number(Number(ttdSum / ttdData.length).toFixed());
    const ttdSumInDuration = humanizeDate(ttdSumInSeconds);

    return {
      averageTtd: ttdSumInDuration,
      averageTtdRaw: ttdSumInSeconds,
    };
  };

  const allAllowanceSignatures = allowancesFromIpo.data.flatMap((v) => v.signers)?.filter((v) => !!v.operationTTD)
    ?.filter((v) => !!v);
  // console.log('allAllowanceSignatures.slice ->', allAllowanceSignatures.slice(0, 1));
  // console.log('allAllowanceSignatures.length ->', allAllowanceSignatures.length);

  const allowancesGroupedByVerifier = _.groupBy(
    allAllowanceSignatures,
    _.property('addressId'),
  );
  // console.log('allowancesGroupedByVerifier | length ->', Object.entries(allowancesGroupedByVerifier).length);

  return verifiers.map((verifier) => {
    const ttdData = _.get(allowancesGroupedByVerifier, verifier.addressId)?.map((v) => v.operationTTD);

    // console.log('verifier.addressId ->', verifier.addressId);
    // console.log('ttdData ->', ttdData);
    // console.log('ttdData.length ->', ttdData.length);

    const ldnTtdDataAverages = calculateTtdAverages(ttdData);

    // console.log('ldnTtdDataAverages ->', ldnTtdDataAverages);

    return {
      ...verifier,
      ldnTtdAverages: ldnTtdDataAverages,
    };
  });
};

// const enrichedWithTtd = enrichWithTtdData(verifiers.toOutput.slice(0, 2));
// console.dir(enrichedWithTtd, { depth: Infinity });
// console.log(verifiers.toOutput);

verifiers.toOutput = enrichWithTtdData(verifiers.toOutput);
verifiers.toOutput = enrichWithLdnTtdData(verifiers.toOutput);
verifiers.toOutput = _.orderBy(verifiers.toOutput, [
  (v) => _.get(v, 'ttdAverages.averageTtdRaw'),
], [
  'asc',
]);
verifiers.toOutput = _.uniqBy(verifiers.toOutput, 'addressId');

// TODO(alexxnica): Find a better way of organizing filters.
// Additional filters
verifiers.toOutput = verifiers.toOutput
  .filter((verifier) => !!verifier.name)
  .filter((verifier) => verifier.name != 'n/a')
  .filter((verifier) => !/Testing[^a-zA-Z]*Deleted/i.test(verifier.name));

// TODO(alexxnica): organize, refine, and refactor this.
verifiers.toOutput = verifiers.toOutput.map((verifier) => {
  const { fromInterplanetaryOne } = verifier;
  return {
    ...verifier,
    createdAt: verifier.createdAt ||
      convertHeightToDate(fromInterplanetaryOne.createdAtHeight),
    status: (!!fromInterplanetaryOne.removed && 'REMOVED') || 'ACTIVE',
    hasDatacap: {
      total: BigInt(fromInterplanetaryOne.initialAllowance).toString(),
      allocated: BigInt(BigInt(fromInterplanetaryOne.initialAllowance) - BigInt(fromInterplanetaryOne.allowance))
        .toString(),
      available: BigInt(fromInterplanetaryOne.allowance).toString(),
    },
    hasStats: {
      timeToDatacap: verifier.ttdAverages,
      ldnTimeToDatacap: verifier.ldnTtdAverages,
    },
    clientsCount: fromInterplanetaryOne.verifiedClientsCount,
    issueUrl: _.isNumber(verifier.issueNumber) &&
        `https://github.com/filecoin-project/notary-governance/issues/${verifier.issueNumber}` || null,
  };
});

// Remove all multisigs from the output (because they're all (presumably) LDNs and not verifiers)
verifiers.toOutput = verifiers.toOutput.filter((v) => !v.fromInterplanetaryOne.isMultisig);
verifiers.toOutputOrdered = orderByKey(verifiers.toOutput);

await writeJSON('./data/generated/verifiers.json', verifiers.toOutputOrdered);
