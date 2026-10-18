export const COUNTRIES = ["INDIA", "AUSTRALIA"] as const;
export type Country = (typeof COUNTRIES)[number];

export const STATES = [
  "UTTAR_PRADESH",
  "ODISHA",
  "MADHYA_PRADESH",
  "MAHARASHTRA",
  "WEST_BENGAL",
  "GUJARAT",
] as const;
export type StateCode = (typeof STATES)[number];

export const REGIONS = ["TRISHUL", "SUDARSHAN", "ASTRA"] as const;
export type Region = (typeof REGIONS)[number];

export const AREAS = ["OUTER", "INNER", "CORE"] as const;
export type Area = (typeof AREAS)[number];

export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const STATE_META: Record<StateCode, { label: string; short: string }> = {
  UTTAR_PRADESH: { label: "Uttar Pradesh", short: "UP" },
  ODISHA: { label: "Odisha", short: "OD" },
  MADHYA_PRADESH: { label: "Madhya Pradesh", short: "MP" },
  MAHARASHTRA: { label: "Maharashtra", short: "MH" },
  WEST_BENGAL: { label: "West Bengal", short: "WB" },
  GUJARAT: { label: "Gujarat", short: "GJ" },
};

export const REGION_META: Record<Region, { label: string; code: string }> = {
  TRISHUL: { label: "1 (Trishul)", code: "1" },
  SUDARSHAN: { label: "2 (Sudarshan)", code: "2" },
  ASTRA: { label: "3 (Astra)", code: "3" },
};

export const AREA_META: Record<Area, { label: string }> = {
  OUTER: { label: "Outer" },
  INNER: { label: "Inner" },
  CORE: { label: "Core" },
};

export const COUNTRY_META: Record<Country, { label: string }> = {
  INDIA: { label: "India" },
  AUSTRALIA: { label: "Australia" },
};

export function isCountry(v: string): v is Country {
  return (COUNTRIES as readonly string[]).includes(v);
}
export function isState(v: string): v is StateCode {
  return (STATES as readonly string[]).includes(v);
}
export function isRegion(v: string): v is Region {
  return (REGIONS as readonly string[]).includes(v);
}
export function isArea(v: string): v is Area {
  return (AREAS as readonly string[]).includes(v);
}
export function isGender(v: string): v is Gender {
  return (GENDERS as readonly string[]).includes(v);
}

export function stateLabel(v: string): string {
  return isState(v) ? STATE_META[v].label : v;
}
export function regionLabel(v: string): string {
  return isRegion(v) ? REGION_META[v].label : v;
}
export function areaLabel(v: string): string {
  return isArea(v) ? AREA_META[v].label : v;
}
export function countryLabel(v: string): string {
  return isCountry(v) ? COUNTRY_META[v].label : v;
}

export const QUARTER_MARKERS: { state: StateCode; x: number; y: number }[] = [
  { state: "GUJARAT", x: 28, y: 50 },
  { state: "MAHARASHTRA", x: 36, y: 61 },
  { state: "MADHYA_PRADESH", x: 43, y: 47 },
  { state: "UTTAR_PRADESH", x: 48, y: 35 },
  { state: "WEST_BENGAL", x: 68, y: 48 },
  { state: "ODISHA", x: 58, y: 56 },
];
