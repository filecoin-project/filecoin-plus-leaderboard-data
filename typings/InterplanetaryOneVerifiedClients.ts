export interface InterplanetaryOneVerifiedClientsResponse {
  totalRemainingDatacap: string;
  clientsWithActiveDeals: string;
  countOfClientsWhoHaveDcAndDeals: string;
  numberOfClients: string;
  count: string;
  data: InterplanetaryOneVerifiedClient[];
}

export interface InterplanetaryOneVerifiedClient {
  id: number;
  addressId: string;
  address: string;
  retries: number;
  auditTrail: string;
  name: null | string;
  orgName: null | string;
  initialAllowance: string;
  allowance: string;
  verifierAddressId: string;
  createdAtHeight: number;
  issueCreateTimestamp?: number | null;
  createMessageTimestamp: number;
  verifierName: null | string;
  dealCount: number | null;
  providerCount: number | null;
  topProvider: null | string;
  receivedDatacapChange: string;
  usedDatacapChange: string;
  allowanceArray: AllowanceArray[];
  region: Region | null;
  website: null | string;
  industry: Industry | null;
  usedDatacap: string;
  remainingDatacap: string;
}

export interface AllowanceArray {
  id: number;
  error: string;
  height: number;
  msgCID: null | string;
  retries: number;
  addressId: string;
  allowance: string;
  auditTrail: null | string;
  allowanceTTD: number | null;
  isDataPublic: IsDataPublic;
  issueCreator: null | string;
  providerList: string[];
  usedAllowance: string;
  isLdnAllowance: boolean;
  isEFilAllowance: boolean;
  verifierAddressId: string;
  isFromAutoverifier: boolean;
  retrievalFrequency: string;
  searchedByProposal: boolean;
  issueCreateTimestamp: number | null;
  hasRemainingAllowance: boolean;
  createMessageTimestamp: number;
}

export enum IsDataPublic {
  Empty = '',
  NA = 'n/a',
  No = 'no',
  Yes = 'yes',
}

export enum Industry {
  ArtsRecreation = 'Arts & Recreation',
  ConstructionPropertyRealEstate = 'Construction, Property & Real Estate',
  EducationTraining = 'Education & Training',
  Empty = '',
  Environment = 'Environment',
  FinancialServices = 'Financial Services',
  Government = 'Government',
  ITTechnologyServices = 'IT & Technology Services',
  InformationMediaTelecommunications = 'Information, Media & Telecommunications',
  LifeScienceHealthcare = 'Life Science / Healthcare',
  NotForProfit = 'Not-for-Profit',
  Other = 'Other',
  ProfessionalServicesLegalConsultingAdvising = 'Professional Services (Legal, Consulting, Advising)',
  Research = 'Research',
  ResourcesAgricultureFisheries = 'Resources, Agriculture & Fisheries',
  Utilities = 'Utilities',
  Web3 = 'Web3',
  Web3Crypto = 'Web3 / Crypto',
}

export enum Region {
  Afghanistan = 'Afghanistan',
  AmericanSamoa = 'American Samoa',
  Armenia = 'Armenia',
  Asia = 'Asia',
  Australia = 'Australia',
  Canada = 'Canada',
  China = 'China',
  Empty = '',
  Europe = 'Europe',
  Finland = 'Finland',
  France = 'France',
  Germany = 'Germany',
  HongKong = 'Hong Kong',
  IsleOfMan = 'Isle of Man',
  Italy = 'Italy',
  Japan = 'Japan',
  KoreaDemocraticPeopleSRepublicOf = "Korea, Democratic People's Republic of",
  KoreaRepublicOf = 'Korea, Republic of',
  Luxembourg = 'Luxembourg',
  Malaysia = 'Malaysia',
  NorthAmerica = 'North America',
  Oceania = 'Oceania',
  Poland = 'Poland',
  Singapore = 'Singapore',
  SouthAfrica = 'South Africa',
  SouthAmerica = 'South America',
  Switzerland = 'Switzerland',
  UnitedKingdom = 'United Kingdom',
  UnitedStates = 'United States',
}
