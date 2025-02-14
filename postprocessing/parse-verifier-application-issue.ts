import _ from 'lodash';
import {
  isAddressId,
  isAddressKey,
  normalizeVerifier,
  normalizeVerifiers,
  readJSON,
  sanitizeString,
  writeJSON,
} from '../utils/general.ts';
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
  const region = regionMatch ? sanitizeString(regionMatch[1]) : undefined;

  const addressMatch = getAddress(bodyParsed);
  let address = addressMatch ? addressMatch[1] : undefined;

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
  address = sanitizeAddress(sanitizeString(address || '')) || '';

  const addressId = isAddressId(address) && address.toLowerCase();
  const addressKey = isAddressKey(address) && address.toLowerCase();
  const nameMatch = getName(bodyParsed);
  const name = nameMatch ? sanitizeString(nameMatch[1]) : null;
  const orgMatch = getOrganization(bodyParsed);
  const organization = orgMatch ? sanitizeString(orgMatch[1]) : null;

  const websiteAndSocialMatch = getWebsiteAndSocial(bodyParsed);
  const websiteAndSocial = websiteAndSocialMatch ? sanitizeString(websiteAndSocialMatch[1]) : null;

  const data: NotaryGovernanceIssue = {
    issueNumber: issue.number,
    addressId: addressId || null,
    addressKey: addressKey || null,
    name,
    organization,
    region: region ? region : [],
    websiteAndSocial,
  };

  return options?.normalized ? normalizeVerifier(data) : data;
};

/**
 * Parses verifier applications from a list of GitHub issues.
 *
 * @param {GithubIssue[]} issues - The list of GitHub issues to parse.
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.normalized] - Whether to normalize the parsed data.
 * @returns {Object[]} The parsed verifier applications.
 */
export const parseVerifierApplicationFromIssues = (
  issues: GithubIssue[] = [],
  options?: { normalized: boolean | undefined },
) => {
  const data = [];
  for (const issue of issues) {
    const parsedData = parseVerifierApplicationFromIssue(issue);
    if (parsedData) {
      data.push(parsedData);
    }
  }

  return options?.normalized ? normalizeVerifiers(data) : data;
};

// Applications are considered invalid if having more than 3 fields empty.
const removeInvalidApplications = (applications: NotaryGovernanceIssue[]) =>
  applications.filter((v) => Object.entries(v).filter((n) => n[1]).length > 3);

const removeDuplicates = (applications: NotaryGovernanceIssue[]) => {
  let data = applications;
  data = _.orderBy(data, ['issueNumber'], ['desc']);
  data = (data.some(item => item.addressId) ? _.uniqBy(data, 'addressId')
        : data.some(item => item.addressKey) ? _.uniqBy(data, 'addressKey')
        : data);
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

const parsedVerifierApplications = getParsedVerifierIssues();

console.log('Parsed verifier applications:', parsedVerifierApplications.length);

await writeJSON(
  `${PROCESSED_DATA_PATH}/notary-governance-issues.json`,
  parsedVerifierApplications,
);
