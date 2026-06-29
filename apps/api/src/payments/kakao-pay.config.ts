export function kakaoPayConfig() {
  return {
    cid: process.env.KAKAOPAY_CID ?? 'TC0ONETIME',
    // Accepts whichever env var name the Kakao Pay secret key was saved
    // under — the dedicated payment Secret Key from the Kakao Pay product
    // page, not the app's general Admin Key/REST API key.
    adminKey:
      process.env.KAKAO_PAY_SECRET_KEY_TEST ??
      process.env.KAKAO_PAY_SECRET_KEY ??
      process.env.KAKAOPAY_ADMIN_KEY ??
      '',
    baseUrl: process.env.KAKAOPAY_BASE_URL ?? 'https://open-api.kakaopay.com',
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000',
  };
}
