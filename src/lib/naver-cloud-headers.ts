export function createNaverMapsApiHeaders() {
  const apiKeyId = process.env.NAVER_CLOUD_MAPS_API_KEY_ID;
  const apiKey = process.env.NAVER_CLOUD_MAPS_API_KEY;

  if (!apiKeyId) {
    throw new Error("NAVER_CLOUD_MAPS_API_KEY_ID is required");
  }

  if (!apiKey) {
    throw new Error("NAVER_CLOUD_MAPS_API_KEY is required");
  }

  return {
    "X-NCP-APIGW-API-KEY-ID": apiKeyId,
    "X-NCP-APIGW-API-KEY": apiKey,
  };
}
