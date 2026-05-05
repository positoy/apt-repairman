import { createHmac } from "node:crypto";

export type NaverCloudSignatureInput = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  timestamp?: string;
  accessKey?: string;
  secretKey?: string;
};

/**
 * Creates the x-ncp-apigw-signature-v2 value for Naver Cloud Platform APIs.
 *
 * Keep accessKey/secretKey server-side only. Do not expose secretKey through
 * NEXT_PUBLIC_* variables or client components.
 */
export function createNaverCloudSignature({
  method,
  url,
  timestamp = Date.now().toString(),
  accessKey = process.env.NAVER_CLOUD_ACCESS_KEY_ID,
  secretKey = process.env.NAVER_CLOUD_SECRET_KEY,
}: NaverCloudSignatureInput) {
  if (!accessKey) {
    throw new Error("NAVER_CLOUD_ACCESS_KEY_ID is required");
  }

  if (!secretKey) {
    throw new Error("NAVER_CLOUD_SECRET_KEY is required");
  }

  const message = `${method} ${url}\n${timestamp}\n${accessKey}`;
  const signature = createHmac("sha256", secretKey).update(message, "utf8").digest("base64");

  return {
    timestamp,
    accessKey,
    signature,
    headers: {
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": accessKey,
      "x-ncp-apigw-signature-v2": signature,
    },
  };
}
