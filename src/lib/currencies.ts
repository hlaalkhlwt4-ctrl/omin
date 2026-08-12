export const priorityCurrencies = [
  ['SAR', 'ريال سعودي'], ['AED', 'درهم إماراتي'], ['ILS', 'شيكل إسرائيلي جديد'],
  ['USD', 'دولار أمريكي'], ['EUR', 'يورو'], ['JOD', 'دينار أردني'],
  ['KWD', 'دينار كويتي'], ['QAR', 'ريال قطري'], ['BHD', 'دينار بحريني'],
  ['OMR', 'ريال عُماني'], ['EGP', 'جنيه مصري'], ['IQD', 'دينار عراقي'],
  ['LBP', 'ليرة لبنانية'], ['SYP', 'ليرة سورية'], ['YER', 'ريال يمني'],
  ['MAD', 'درهم مغربي'], ['DZD', 'دينار جزائري'], ['TND', 'دينار تونسي'],
  ['LYD', 'دينار ليبي'], ['SDG', 'جنيه سوداني'], ['MRU', 'أوقية موريتانية'],
] as const;

// ISO 4217 currencies supported by modern Intl runtimes. Keeping the codes in
// source makes the server/client option order deterministic.
export const allCurrencyCodes = [
  'AED','AFN','ALL','AMD','ANG','AOA','ARS','AUD','AWG','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BMD','BND','BOB','BOV','BRL','BSD','BTN','BWP','BYN','BZD','CAD','CDF','CHE','CHF','CHW','CLF','CLP','CNY','COP','COU','CRC','CUC','CUP','CVE','CZK','DJF','DKK','DOP','DZD','EGP','ERN','ETB','EUR','FJD','FKP','GBP','GEL','GHS','GIP','GMD','GNF','GTQ','GYD','HKD','HNL','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KMF','KPW','KRW','KWD','KYD','KZT','LAK','LBP','LKR','LRD','LSL','LYD','MAD','MDL','MGA','MKD','MMK','MNT','MOP','MRU','MUR','MVR','MWK','MXN','MXV','MYR','MZN','NAD','NGN','NIO','NOK','NPR','NZD','OMR','PAB','PEN','PGK','PHP','PKR','PLN','PYG','QAR','RON','RSD','RUB','RWF','SAR','SBD','SCR','SDG','SEK','SGD','SHP','SLE','SOS','SRD','SSP','STN','SVC','SYP','SZL','THB','TJS','TMT','TND','TOP','TRY','TTD','TWD','TZS','UAH','UGX','USD','USN','UYI','UYU','UYW','UZS','VED','VES','VND','VUV','WST','XAF','XAG','XAU','XBA','XBB','XBC','XBD','XCD','XCG','XDR','XOF','XPD','XPF','XPT','XSU','XTS','XUA','XXX','YER','ZAR','ZMW','ZWG','ZWL',
] as const;

export type CurrencyCode = (typeof allCurrencyCodes)[number];
const currencyCodeSet = new Set<string>(allCurrencyCodes);
const priorityCodeSet = new Set<string>(priorityCurrencies.map(([code]) => code));

export const otherCurrencyCodes = allCurrencyCodes.filter((code) => !priorityCodeSet.has(code));

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return currencyCodeSet.has(value.toUpperCase());
}

export function currencyName(code: string) {
  return priorityCurrencies.find(([item]) => item === code)?.[1] || code;
}

export function formatCurrency(amount: number, currency: string, locale = 'ar') {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}
