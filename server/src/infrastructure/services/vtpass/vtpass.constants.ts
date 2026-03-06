export const VTPASS_BASE_URL_STAGING = 'https://sandbox.vtpass.com/api';
export const VTPASS_BASE_URL_PROD = 'https://live.vtpass.com/api';

export enum VTPassEndpoints {
  PAY = '/pay',
  MERCHANT_VERIFY = '/merchant-verify',
  VARIATION_CODES = '/service-variations',
  STATUS = '/requery',
  BALANCE = '/balance',
}

export enum VTPassServiceIds {
  // Airtime
  MTN_AIRTIME = 'mtn',
  AIRTEL_AIRTIME = 'airtel',
  GLO_AIRTIME = 'glo',
  MOBI_AIRTIME = 'etisalat', // 9mobile

  // Data
  MTN_DATA = 'mtn-data',
  AIRTEL_DATA = 'airtel-data',
  GLO_DATA = 'glo-data',
  MOBI_DATA = 'etisalat-data', // 9mobile

  // TV
  DSTV = 'dstv',
  GOTV = 'gotv',
  STARTIMES = 'startimes',
  SHOWMAX = 'showmax',

  // Electricity
  IKEJA_ELECTRIC = 'ikeja-electric',
  EKO_ELECTRIC = 'eko-electric',
  KEDCO = 'kano-electric',
  PHED = 'portharcourt-electric',
  JED = 'jos-electric',
  IBEDC = 'ibadan-electric',
  KAEDCO = 'kaduna-electric',
  AEDC = 'abuja-electric',
  EEDC = 'enugu-electric',
  BEDC = 'benin-electric',
  ABA_ELECTRIC = 'aba-electric',
  YOLA_ELECTRIC = 'yola-electric',
}
