export interface InterplanetaryOneAllowances {
  count: string;
  data: Allowance[];
}

export interface Allowance {
  id: number;
  allowanceId: number;
  clientAddressId: string;
  clientAddress: null | string;
  clientName: string;
  verifierAddressId: string;
  verifierAddress: string;
  verifierName: null | string;
  auditTrail: string;
  signers: Signer[];
  allowanceNumber: number;
  datacapAllocated: string;
  height: number;
  timestamp: number;
  ttd: number | null;
  topProvider: string;
}

export interface Signer {
  height: number;
  method: number;
  msgCID: string;
  address: string;
  fullName: string;
  addressId: string;
  shortName: string;
  timestamp: number;
  operationTTD: number | null;
}
