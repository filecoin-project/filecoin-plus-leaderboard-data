import _ from 'lodash';
import moment from 'moment';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';
import { Verifier } from '../typings/Verifier.ts';
import { InterplanetaryOneVerifiers, VerifierData } from '../typings/InterplanetaryOneVerifiers.ts';
import { InterplanetaryOneVerifiedClient } from '../typings/InterplanetaryOneVerifiedClients.ts';
import { InterplanetaryOneAllowances } from '../typings/InterplanetaryOneAllowances.ts';

export const enrichWithInterplanetaryOne = (
  verifiers: NotaryGovernanceIssue[],
  verifiersFromInterplanetaryOne: InterplanetaryOneVerifiers['data'],
): Verifier[] =>
  verifiers.map((verifier) => ({
    ...verifier,
    fromInterplanetaryOne: {
      ...verifiersFromInterplanetaryOne.find(
        (fromIpo) => verifier.addressId === fromIpo.addressId || verifier.addressKey === fromIpo.address,
      ),
    },
  }));

export const enrichWithVerifiedClients = (
  verifiers: Verifier[],
  verifiedClientsFromInterplanetaryOne: InterplanetaryOneVerifiedClient[],
): Verifier[] =>
  verifiers.map((verifier) => ({
    ...verifier,
    verifiedClientsFromInterplanetaryOne:
      _.groupBy(verifiedClientsFromInterplanetaryOne ?? [], (vc) => vc.verifierAddressId === verifier.addressId).true ??
        [],
  }));

export const enrichWithTtdData = (verifiers: Verifier[]): Verifier[] => {
  const humanizeDate = (seconds: number) => moment.duration(seconds, 'seconds').humanize();

  const calculateTtd = (verifiedClients: InterplanetaryOneVerifiedClient[]) => {
    const data = verifiedClients.map((vc) => {
      if (!vc.createMessageTimestamp || !vc.issueCreateTimestamp) {
        return 0;
      }
      return vc.createMessageTimestamp - vc.issueCreateTimestamp;
    });
    return data;
  };

  const calculateTtdAverages = (ttdData: number[]) => {
    if (_.isEmpty(ttdData)) {
      return { averageTtd: null, averageTtdRaw: null };
    }
    const ttdSum = ttdData.reduce((previous, current) => previous + current);
    const ttdSumInSeconds = Number(Number(ttdSum / ttdData.length).toFixed());
    const ttdSumInDuration = humanizeDate(ttdSumInSeconds);
    return {
      averageTtd: ttdSumInDuration,
      averageTtdRaw: ttdSumInSeconds,
    };
  };

  const filterVerifiedClients = (
    verifiedClients: InterplanetaryOneVerifiedClient[],
    verifierAddressId: VerifierData['addressId'],
  ) => {
    return verifiedClients.filter(
      (verifiedClient) =>
        !!verifiedClient.createMessageTimestamp &&
        !!verifiedClient.issueCreateTimestamp &&
        verifiedClient.createMessageTimestamp > verifiedClient.issueCreateTimestamp &&
        !!verifierAddressId &&
        verifiedClient.addressId !== verifierAddressId,
    );
  };

  return verifiers.map((verifier) => {
    if (!verifier.verifiedClientsFromInterplanetaryOne || !verifier.addressId) {
      return { ...verifier, ttdAverages: { averageTtd: null, averageTtdRaw: null } };
    }
    const ttdData: number[] = calculateTtd(
      filterVerifiedClients(
        verifier.verifiedClientsFromInterplanetaryOne,
        verifier.addressId,
      ),
    );
    const ttdDataAverages = calculateTtdAverages(ttdData);
    return { ...verifier, ttdAverages: ttdDataAverages };
  });
};

export const enrichWithLdnTtdData = (
  verifiers: Verifier[],
  allowancesFromIpo: InterplanetaryOneAllowances,
): Verifier[] => {
  const humanizeDate = (seconds: number) => moment.duration(seconds, 'seconds').humanize();

  const calculateTtdAverages = (ttdData: number[]) => {
    if (_.isEmpty(ttdData)) {
      return { averageTtd: null, averageTtdRaw: null };
    }
    const ttdSum = ttdData.reduce((previous, current) => previous + current);
    const ttdSumInSeconds = Number(Number(ttdSum / ttdData.length).toFixed());
    const ttdSumInDuration = humanizeDate(ttdSumInSeconds);
    return {
      averageTtd: ttdSumInDuration,
      averageTtdRaw: ttdSumInSeconds,
    };
  };

  const allAllowanceSignatures = allowancesFromIpo.data
    ?.flatMap((v) => v.signers)
    ?.filter((v) => !!v.operationTTD) ?? [];
  const allowancesGroupedByVerifier = _.groupBy(allAllowanceSignatures, _.property('addressId'));

  return verifiers.map((verifier) => {
    if (!verifier.addressId) {
      return { ...verifier, ldnTtdAverages: { averageTtd: null, averageTtdRaw: null } };
    }
    const ttdData = allowancesGroupedByVerifier[verifier.addressId]?.map((v) => v.operationTTD);
    const validTtdData = ttdData?.filter((ttd): ttd is number => ttd !== null) ?? [];
    const ldnTtdDataAverages = calculateTtdAverages(validTtdData);
    return { ...verifier, ldnTtdAverages: ldnTtdDataAverages };
  });
};
