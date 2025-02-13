import {
  InterplanetaryOneVerifiedClient,
} from './InterplanetaryOneVerifiedClients.ts';

export interface Verifier {
  /**
   * The issue number for the application on GitHub.
   */
  issueNumber?: number;
  addressId?: string | null;
  addressKey?: string | null;
  name?: string | null;
  organization?: string | null;
  region?: Region[] | null | string; // TODO: check if this should be a string or an array of strings
  /**
   * The website or social media information.
   */
  websiteAndSocial?: string | null;
  fromInterplanetaryOne?: FromInterplanetaryOne;
  verifiedClientsFromInterplanetaryOne?: InterplanetaryOneVerifiedClient[];
  ttdAverages?: TtdAverages;
  ldnTtdAverages?: TtdAverages;
  id?: string;
  githubUsername?: string;
  githubAvatarUrl?: string;
  /**
   * The timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   */
  createdAt?: string | number;
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
    total?: string | null;
    allocated?: string | null;
    available?: string | null;
    usedInDeals?: string | null;
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
  initialAllowance?: bigint | string; // TODO: check if this should be string
  allowance?: bigint | string; // TODO: check if this should be string
  inffered?: boolean;
  isMultisig?: boolean;
  createdAtHeight?: number;
  issueCreateTimestamp?: number | null;
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
  allowance?: bigint | string; // TODO: check if this should be string
  auditTrail?: string | null;
  verifierId?: number;
  issueCreateTimestamp?: number | null;
  createMessageTimestamp?: number;
}

export interface TtdAverages {
  averageTtd: string | null;
  /**
   * The average Time To DataCap (TTD) in seconds.
   */
  averageTtdRaw: number | null;
}

export interface VerifiedClientsFromInterplanetaryOne {
  id?: number;
  addressId?: string;
  address?: string;
  retries?: number;
  auditTrail?: string;
  name: string | null;
  initialAllowance?: bigint | string;
  allowance?: bigint | string;
  verifierAddressId?: string;
  createdAtHeight?: number;
  issueCreateTimestamp?: number | null;
  createMessageTimestamp?: number;
  verifierName?: string | null;
  dealCount?: number | null;
  providerCount?: number | null;
  topProvider?: string | null;
  receivedDatacapChange?: string;
  usedDatacapChange?: string;
  allowanceArray?: VerifiedClientsFromInterplanetaryOneAllowanceArray[];
}

export interface VerifiedClientsFromInterplanetaryOneAllowanceArray {
  id?: number;
  error?: string;
  height?: number;
  msgCID?: string | null;
  retries?: number;
  addressId?: string;
  allowance?: bigint | string;
  auditTrail?: string | null;
  allowanceTTD?: null | number;
  usedAllowance?: string;
  isLdnAllowance?: boolean;
  verifierAddressId?: string;
  isFromAutoverifier?: boolean;
  issueCreateTimestamp?: number | null;
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
