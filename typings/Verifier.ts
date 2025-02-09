export interface Verifier {
  /**
   * The issue number for the application on GitHub.
   */
  issueNumber?: number;
  addressId?: string;
  addressKey?: string;
  name?: string;
  organization?: string;
  region?: Region[];
  /**
   * The website or social media information.
   */
  websiteAndSocial?: string;
  fromInterplanetaryOne?: FromInterplanetaryOne;
  verifiedClientsFromInterplanetaryOne?: VerifiedClientsFromInterplanetaryOne[];
  ttdAverages?: TtdAverages;
  ldnTtdAverages?: TtdAverages;
  id?: string;
  githubUsername?: string;
  githubAvatarUrl?: string;
  /**
   * The timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   */
  createdAt?: string;
  /**
   * The timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   */
  // startedAt?: string;
  status?: Status;
  totalApprovals?: number;
  /**
   * The timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   */
  // updatedAt?: number;
  hasDatacap?: {
    total?: string;
    allocated?: string;
    available?: string;
    usedInDeals?: string;
  };
  hasStats?: {
    timeToDatacap: TtdAverages;
    ldnTimeToDatacap: TtdAverages;
  };
  clientsCount?: number;
  roles?: Role[];
}

export interface Role {
  name: RoleType;
  startedAt: string;
  status: Status;
}

export type RoleType = 'VERIFIER' | 'ROOT_KEY_HOLDER' | 'CLIENT' | 'STORAGE_PROVIDER';

export interface FromInterplanetaryOne {
  id?: number;
  addressId?: string;
  address?: string;
  auditTrail?: string;
  retries?: number;
  name?: string;
  removed?: boolean;
  initialAllowance?: bigint;
  allowance?: bigint;
  inffered?: boolean;
  isMultisig?: boolean;
  createdAtHeight?: number;
  issueCreateTimestamp?: number;
  createMessageTimestamp?: number;
  verifiedClientsCount?: number;
  receivedDatacapChange?: string;
  allowanceArray?: FromInterplanetaryOneAllowanceArray[];
}

export interface FromInterplanetaryOneAllowanceArray {
  id?: number;
  error?: string;
  height?: number;
  msgCID?: string;
  retries?: number;
  addressId?: string;
  allowance?: bigint;
  auditTrail?: string;
  verifierId?: number;
  issueCreateTimestamp?: number;
  createMessageTimestamp?: number;
}

export interface TtdAverages {
  averageTtd?: string;
  /**
   * The average Time To DataCap (TTD) in seconds.
   */
  averageTtdRaw?: number;
}

export interface VerifiedClientsFromInterplanetaryOne {
  id?: number;
  addressId?: string;
  address?: string;
  retries?: number;
  auditTrail?: string;
  name?: string;
  initialAllowance?: bigint;
  allowance?: bigint;
  verifierAddressId?: string;
  createdAtHeight?: number;
  issueCreateTimestamp?: number;
  createMessageTimestamp?: number;
  verifierName?: string;
  dealCount?: number;
  providerCount?: number;
  topProvider?: string;
  receivedDatacapChange?: string;
  usedDatacapChange?: string;
  allowanceArray?: VerifiedClientsFromInterplanetaryOneAllowanceArray[];
}

export interface VerifiedClientsFromInterplanetaryOneAllowanceArray {
  id?: number;
  error?: string;
  height?: number;
  msgCID?: string;
  retries?: number;
  addressId?: string;
  allowance?: bigint;
  auditTrail?: string;
  allowanceTTD?: null;
  usedAllowance?: string;
  isLdnAllowance?: boolean;
  verifierAddressId?: string;
  isFromAutoverifier?: boolean;
  issueCreateTimestamp?: number;
  hasRemainingAllowance?: boolean;
  createMessageTimestamp?: number;
}

export type Region =
  | 'AFRICA'
  | 'ASIA_NOT_GREATER_CHINA'
  | 'EUROPE'
  | 'GLOBAL'
  | 'GREATER_CHINA'
  | 'NORTH_AMERICA'
  | 'OCEANIA'
  | 'OTHER';

export type Status = 'ACTIVE' | 'INACTIVE' | 'REMOVED';

export type DataSource = 'GITHUB' | 'HUBSPOT' | 'INTERPLANETARY_ONE' | 'GLIF';
