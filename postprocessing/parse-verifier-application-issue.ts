// deno-lint-ignore-file no-unused-vars no-explicit-any
import _ from "https://esm.sh/lodash@4.17.21?no-check";
import { readJSON, writeJSON } from "https://deno.land/x/flat@0.0.15/mod.ts";
import { render } from "https://deno.land/x/gfm@0.1.20/mod.ts";
import {
  isAddressId,
  isAddressKey,
  normalizeVerifier,
  normalizeVerifiers,
  trimAndClean,
} from "../utils/general.ts";
import * as regexes from "../utils/regexes.ts";

// import notaryGovernanceIssues from "../data/raw/notary-governance-issues.json" assert {
//   type: "json",
// };

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
  let address = regexes.getAddress(bodyParsed);
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

  const addressId = isAddressId(address) && address.toLowerCase(); // || (isAddressKey(address) && (await getAddressIdFromKey(address)));
  const addressKey = isAddressKey(address) && address.toLowerCase(); // || (isAddressId(address) && (await getAddressKeyFromId(address)));
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
    // address,
    name,
    organization,
    region,
    websiteAndSocial,
  };

  // console.log();
  return (!!options?.normalized && normalizeVerifier(data)) || data;
};

export const parseVerifierApplicationFromIssues = (
  issues: any = [],
  options?: { normalized: boolean | undefined },
) => {
  const data = issues?.map((v) => {
    // console.log(v);
    // return {...parseVerifierApplicationFromIssue(v)};
    const data = parseVerifierApplicationFromIssue(v);
    return data;
  }).filter((v) => !!v);
  // console.log(returnThis);
  return (!!options?.normalized && normalizeVerifiers(data)) || data;
  // return data.map((v) => v.status === 'fulfilled' && v.value);
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

// console.log(notaryGovernanceIssues);

export const getParsedVerifierIssues = () => {
  let data;
  data = parseVerifierApplicationFromIssues(notaryGovernanceIssues, {
    normalized: true,
  });
  data = removeInvalidApplications(data);
  data = removeDuplicates(data);
  // console.log("data ->", data);

  return data;

  // removeDuplicates(
  //   removeInvalidApplications(
  //     parseVerifierApplicationFromIssues(notaryGovernanceIssues, {
  //       normalized: true,
  //     }),
  //   ),
  // );
};

await writeJSON(
  "./data/processed/notary-governance-issues.json",
  getParsedVerifierIssues(),
);
