import { writeJSON } from "https://deno.land/x/flat@0.0.15/mod.ts";
import _ from "https://esm.sh/lodash?no-check";

import notaryGovernanceIssues from "../data/processed/notary-governance-issues.json" assert {
  type: "json",
};
import verifiersFromInterplanetaryOne from "../data/raw/interplanetaryone-verifiers.json" assert {
  type: "json",
};

const verifiers = Object.create({});
verifiers.fromIssues = notaryGovernanceIssues;
verifiers.fromInterplanetaryOne = verifiersFromInterplanetaryOne.data;

// Can only be used for verifiers enriched with InterPlanetary One data.
const orderVerifiers = (verifiers) =>
  _.orderBy(verifiers, [
    (v) => _.get(v, "fromInterplanetaryOne.verifiedClientsCount"),
    (v) => _.get(v, "fromInterplanetaryOne.initialAllowance"),
  ], [
    "desc",
    "desc",
  ]);

const getIssueNumberFromAuditTrail = (auditTrail) =>
  /([0-9]+)$/im.exec(auditTrail)?.[1] || [];

// Filter by verifiers having the same issue number registered on the InterPlanetary One API.
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
        verifier.addressId === fromIpo.addressId
      ),
    },
  }));

const calculateTtd = () => {};
const calculateTtdAverages = () => {};

verifiers.toOutput = orderVerifiers(
  enrichWithInterplanetaryOne(
    verifiers.filtered,
    verifiers.fromInterplanetaryOne,
  ),
);

await writeJSON("./data/generated/verifiers.json", verifiers.toOutput);
