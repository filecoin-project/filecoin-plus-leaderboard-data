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
  name: string;
  organization: string;
  region: Region[];
  websiteAndSocial: string | null;
}

export type NotaryGovernanceIssues = NotaryGovernanceIssue[];
