export type Region =
  | 'AFRICA'
  | 'ASIA_NOT_GREATER_CHINA'
  | 'EUROPE'
  | 'GLOBAL'
  | 'GREATER_CHINA'
  | 'NORTH_AMERICA'
  | 'OCEANIA'
  | 'OTHER';

export interface NotaryGovernanceIssue {
  issueNumber: number;
  addressId: string | null;
  addressKey: string | null;
  name: string | null;
  organization: string | null;
  region: Region[] | null | string; // TODO: check if this should be a string or an array of strings
  websiteAndSocial: string | null;
}

export type NotaryGovernanceIssues = NotaryGovernanceIssue[];
