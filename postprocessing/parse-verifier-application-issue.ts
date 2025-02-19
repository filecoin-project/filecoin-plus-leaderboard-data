import _ from 'lodash';
import { isAddressId, isAddressKey, normalizeVerifier, readJSON, sanitizeString, writeJSON } from '../utils/general.ts';
import { render } from 'gfm';
import { getAddress, getName, getOrganization, getRegion, getWebsiteAndSocial } from '../utils/regexes.ts';
import { GithubIssue } from '../typings/GithubIssue.ts';
import { PROCESSED_DATA_PATH, RAW_DATA_PATH } from '../constants.ts';
import { NotaryGovernanceIssue } from '../typings/NotaryGovernanceIssue.ts';

const notaryGovernanceIssues: GithubIssue[] = await readJSON(
  `${RAW_DATA_PATH}/notary-governance-issues.json`,
);

// If address is not present in the issue body, we look for it in the comments
const findAddressInComments = (issue: GithubIssue) => {
  if (Array.isArray(issue.comments.edges) && issue.comments.edges.length > 0) {
    let addr;

    // Match the first address-like string in the comments
    addr = issue.comments.edges.map((v) => v.node)
      ?.flatMap((v) => v.body)
      ?.filter((v) => /approved.*\r\n.*address/im.test(v))
      ?.flat();

    addr = /approved.*[\r\n]*.*address.*[\r\n]*.*\s+(f[0-9]+[^\r]+)/im.exec(
      addr[0],
    );

    return addr && addr[1] ? addr[1] : undefined;
  }
};

/**
 * Parses a verifier application from a GitHub issue.
 * @param issue - The GitHub issue to parse.
 * @param options - Optional settings.
 * @returns The parsed verifier application.
 */
export const parseVerifierApplicationFromIssue = (
  issue: GithubIssue | undefined = undefined,
  options?: { normalized: boolean | undefined },
): NotaryGovernanceIssue | undefined => {
  if (!issue) return;

  const bodyParsed = render(issue.body);

  const regionMatch = getRegion(bodyParsed);
  const region = regionMatch ? sanitizeString(regionMatch) : undefined;

  const addressMatch = getAddress(bodyParsed);
  let address = addressMatch ? addressMatch : undefined;
  address = address || findAddressInComments(issue);

  /**
   * Sanitizes an address by removing any leading or trailing whitespace and ensuring it is a valid address.
   * @param address - The address to clean.
   * @returns The cleaned address.
   */
  const sanitizeAddress = (address: string) => {
    // Match the first address-like string in the body
    const addr = /^f[^\s]+/im.exec(address);

    // If the first address-like string is not a valid address, return the original address
    return addr?.[0] || address;
  };

  address = sanitizeString(address || '');
  address = sanitizeAddress(address) || '';

  const addressId = isAddressId(address) && address.toLowerCase();
  const addressKey = isAddressKey(address) && address.toLowerCase();

  const nameMatch = getName(bodyParsed);
  const name = nameMatch ? sanitizeString(nameMatch) : null;

  const orgMatch = getOrganization(bodyParsed);
  const organization = orgMatch ? sanitizeString(orgMatch) : null;

  const websiteAndSocialMatch = getWebsiteAndSocial(bodyParsed);
  const websiteAndSocial = websiteAndSocialMatch ? sanitizeString(websiteAndSocialMatch) : null;

  const data: NotaryGovernanceIssue = {
    issueNumber: issue.number,
    addressId: addressId || null,
    addressKey: addressKey || null,
    name,
    organization,
    region: region ? region : [],
    websiteAndSocial,
  };

  const output = options?.normalized ? normalizeVerifier(data) : data;

  return output;
};

/**
 * Parses verifier applications from a list of GitHub issues.
 *
 * @param issues - The list of GitHub issues to parse.
 * @param options - Optional settings.
 * @param options.normalized - Whether to normalize the parsed data.
 * @returns The parsed verifier applications.
 */
export const parseVerifierApplicationFromIssues = (
  issues: GithubIssue[] = [],
  options?: { normalized: boolean | undefined },
) => {
  console.log('Parsing verifier applications from issues:', issues.length);
  const data = [];
  for (const issue of issues) {
    const parsedData = parseVerifierApplicationFromIssue(issue, options);
    if (parsedData) {
      // if (options?.normalized) {
      //   const normalizedData = normalizeVerifier(parsedData);
      //   console.log('parseVerifierApplicationFromIssues > options.normalized > normalizedData:', normalizedData);
      //   // console.log('parseVerifierApplicationFromIssues > options.normalized > parsedData:', parsedData);
      //   data.push(normalizedData);
      // } else {
      //   console.log('parseVerifierApplicationFromIssues > parsedData:', parsedData);
      //   data.push(parsedData);
      // }
      data.push(parsedData);
    }
  }

  const output = data;
  console.log('Number of parsed verifier issues available for processing after cleaning:', output.length);

  return output;
};

// Applications are considered invalid if having more than 3 fields empty.
const removeInvalidApplications = (applications: NotaryGovernanceIssue[]) =>
  applications.filter((v) => Object.entries(v).filter((n) => n[1]).length > 3);

const removeDuplicates = (applications: NotaryGovernanceIssue[]) => {
  console.log('Applications before removing duplicates:', applications.length);

  let data = applications;
  data = _.orderBy(data, ['issueNumber'], ['desc']);
  data = data.some((item) => item.addressId)
    ? _.uniqBy(data, 'addressId')
    : data.some((item) => item.addressKey)
    ? _.uniqBy(data, 'addressKey')
    : data;
  console.log('Applications after removing duplicates:', data.length);

  return data;
};

export const getParsedVerifierIssues = () => {
  let data;

  data = parseVerifierApplicationFromIssues(notaryGovernanceIssues, {
    normalized: true,
  });
  console.log('Number of verifier issues parsed from raw data before cleaning:', data.length);

  data = removeInvalidApplications(data);
  console.log('Number of valid verifier issues remaining after filtering out invalid entries:', data.length);

  // data = removeDuplicates(data);

  return data;
};

const parsedVerifierApplications = getParsedVerifierIssues();
console.log('Parsed verifier applications:', parsedVerifierApplications.length);

await writeJSON(
  `${PROCESSED_DATA_PATH}/notary-governance-issues.json`,
  parsedVerifierApplications,
);
