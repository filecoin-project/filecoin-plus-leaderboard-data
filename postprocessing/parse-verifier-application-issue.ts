import _ from "https://esm.sh/lodash?no-check";
import { writeJSON } from "https://deno.land/x/flat@0.0.15/mod.ts";
import { render } from "https://deno.land/x/gfm/mod.ts";
import {
  isAddressId,
  isAddressKey,
  normalizeVerifier,
  normalizeVerifiers,
  trimAndClean,
} from "../utils/general.ts";
import * as regexes from "../utils/regexes.ts";

import notaryGovernanceIssues from "../data/raw/notary-governance-issues.json" assert {
  type: "json",
};

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
  address = trimAndClean(address);

  const addressId = isAddressId(address) && address; // || (isAddressKey(address) && (await getAddressIdFromKey(address)));
  const addressKey = isAddressKey(address) && address; // || (isAddressId(address) && (await getAddressKeyFromId(address)));
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
  issues: any = undefined,
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
  let data;
  data = _.orderBy(applications, ["issueNumber"], ["desc"]);
  data = _.uniqBy(
    applications,
    "addressId",
  );
  return data;
};

// console.log(notaryGovernanceIssues);

export const getParsedVerifierIssues = () =>
  removeDuplicates(
    removeInvalidApplications(
      parseVerifierApplicationFromIssues(notaryGovernanceIssues, {
        normalized: true,
      }),
    ),
  );
