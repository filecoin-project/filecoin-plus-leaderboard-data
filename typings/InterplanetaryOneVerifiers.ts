export interface Allowance {
  id: number;
  error: string;
  height: number;
  msgCID: string;
  retries: number;
  addressId: string;
  allowance: string;
  auditTrail: string | null;
  verifierId: number;
  auditStatus: string;
  issueCreateTimestamp: number | null;
  createMessageTimestamp: number;
}

export interface VerifierData {
  id: number;
  addressId: string;
  address: string;
  auditTrail: string;
  retries: number;
  name: string;
  orgName: string;
  removed: boolean;
  initialAllowance: string;
  allowance: string;
  inffered: boolean;
  isMultisig: boolean;
  createdAtHeight: number;
  issueCreateTimestamp: number | null;
  createMessageTimestamp: number;
  verifiedClientsCount: number;
  receivedDatacapChange: string;
  allowanceArray: Allowance[];
  auditStatus: string;
  remainingDatacap: string;
}

export interface InterplanetaryOneVerifiers {
  count: string;
  data: VerifierData[];
}
