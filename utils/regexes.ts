export const getRegion = (text: string): string | null => {
  const match = /^<?.*region[^:]*:(?<region>[^\n]+)<+?/im.exec(text);
  return match?.groups?.region?.trim() || null;
};

export const getAddress = (text: string): string | null => {
  const match = /^<?.*address[^:]*:.*?(?<address>f\d[0-9A-Za-z]+)/im.exec(text);
  return match?.groups?.address?.trim() || null;
};

export const getName = (text: string) => {
  const match = /^<?.*name[^:]*:(?<name>[^\n]{0,80})<+?/im.exec(text);
  return match?.groups?.name?.trim() || null;
};

export const getOrganization = (text: string) => {
  const match =
    /^.*?organization.{0,5}?: *(?:[\s"'\\*])*(?<organization>[\d\w _\-(),./]+)(?:[\s\n\r]\(<\\)*(?:[\s\n\r"'\\])*/im
      .exec(text);
  return match?.groups?.organization?.trim() || null;
};

export const getWebsiteAndSocial = (text: string) => {
  const match = /^<?.*website.{0,3}social[^:]*:(?<websiteSocial>[^\n\r]+)<+?/im.exec(text);
  return match?.groups?.websiteSocial?.trim() || null;
};

export const getApprovedAddress = (text: string) => {
  const match = /approved.*[\r\n]*.*address.*[\r\n]*.*\s+(?<approvedAddress>f[0-9]+[^\r]+)/im.exec(text);
  return match?.groups?.approvedAddress?.trim() || null;
};

export const regionIsAfrica = (v: string) => /^\s*(Africa)\s*$/im.test(v);
export const regionIsAsiaNotGreaterChina = (v: string) => /^\s*(Asia.minus.GCN)\s*$/im.test(v);
export const regionIsEurope = (v: string) => /^\s*(Europe|EU)\s*$/im.test(v);
export const regionIsGreaterChina = (v: string) => /^\s*(Asia.GCN|GCN.Asia|China|Greater.China)\s*$/im.test(v);
export const regionIsNorthAmerica = (v: string) => /^\s*(n\/a|North.America|NA)\s*$/im.test(v);
export const regionIsOceania = (v: string) => /^\s*(Oceania)\s*$/im.test(v);
export const regionIsSouthAmerica = (v: string) => /^\s*(South.America)\s*$/im.test(v);
export const regionIsGlobal = (v: string) => /^\s*(Global)\s*$/im.test(v);
export const regionIsOther = (v: string) => /^\s*(Other)\s*$/im.test(v);

export const isValidAddress = (address: string) => {
  return /^f[a-zA-Z0-9]+$/im.test(address);
};
