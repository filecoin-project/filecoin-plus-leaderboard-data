// deno-lint-ignore-file
import _ from "lodash";
import { readJSON, writeJSON } from "../utils/general.ts";
import { render } from "gfm";
import {
  isAddressId,
  isAddressKey,
  normalizeVerifier,
  normalizeVerifiers,
  trimAndClean,
} from "../utils/general.ts";
import * as regexes from "../utils/regexes.ts";

const notaryGovernanceIssues = await readJSON(
  "./data/raw/notary-governance-issues.json",
);

export const parseVerifierApplicationFromIssue = (
  issue: any = undefined,
  options?: { normalized: boolean | undefined },
) => {
  const bodyParsed = render(issue.body);

  const region = regexes.getRegion(bodyParsed) &&
    trimAndClean(regexes.getRegion(bodyParsed)[1]);

  // If address is not present in the issue body, we look for it in the comments
  let address = regexes.getAddress(bodyParsed) as unknown as string;
  let newAddress;
  if ((!address || !address[1]) && Array.isArray(issue.comments)) {
    const { comments } = issue;

    newAddress = comments
      ?.flatMap((v: any) => v.body)
      ?.filter((v: any) => /approved.*\r\n.*address/im.test(v))
      ?.flat();
    newAddress = address &&
      /approved.*[\r\n]*.*address.*[\r\n]*.*\s+(f[0-9]+[^\r]+)/im.exec(
        address[0],
      );
  }
  address = newAddress || (address && address[1]);
  const tempCleanAddress = (address) => {
    const addr = /^f[^\s]+/im.exec(address);
    return addr?.[0] || address;
  };
  address = tempCleanAddress(trimAndClean(address));

  const addressId = isAddressId(address) && address.toLowerCase();
  const addressKey = isAddressKey(address) && address.toLowerCase();
  const name = regexes.getName(bodyParsed) &&
    trimAndClean(regexes.getName(bodyParsed)[1]);
  // if (issue.number === 460) console.log('bodyParsed(460) ->', bodyParsed);
  // if (issue.number === 460) console.log('getName(bodyParsed)(460) ->', getName(bodyParsed));
  const organization = regexes.getOrganization(bodyParsed) &&
    trimAndClean(regexes.getOrganization(bodyParsed)[1]);
  const websiteAndSocial = regexes.getWebsiteAndSocial(bodyParsed) &&
    trimAndClean(regexes.getWebsiteAndSocial(bodyParsed)[1]);

  const data = {
    issueNumber: issue.number,
    addressId: addressId || null,
    addressKey: addressKey || null,
    name,
    organization,
    region,
    websiteAndSocial,
  };

  return (!!options?.normalized && normalizeVerifier(data)) || data;
};

export const parseVerifierApplicationFromIssues = (
  issues: any = [],
  options?: { normalized: boolean | undefined },
) => {
  const data = issues?.map((v) => {
    const data = parseVerifierApplicationFromIssue(v);
    return data;
  }).filter((v) => !!v);

  return (!!options?.normalized && normalizeVerifiers(data)) || data;
};

// Applications are considered invalid if having more than 3 fields empty.
const removeInvalidApplications = (applications: any) =>
  applications.filter((v: {}) =>
    Object.entries(v).filter((n) => n[1]).length > 3
  );

const removeDuplicates = (applications: any) => {
  let data = applications;
  data = _.orderBy(data, ["issueNumber"], ["desc"]);
  data = (!!data.addressId && _.uniqBy(data, "addressId") ||
    !!data.addressKey && _.uniqBy(data, "addressKey")) || data;
  return data;
};

export const getParsedVerifierIssues = () => {
  let data;
  data = parseVerifierApplicationFromIssues(notaryGovernanceIssues, {
    normalized: true,
  });
  data = removeInvalidApplications(data);
  data = removeDuplicates(data);

  return data;
};

await writeJSON(
  "./data/processed/notary-governance-issues.json",
  getParsedVerifierIssues(),
);
