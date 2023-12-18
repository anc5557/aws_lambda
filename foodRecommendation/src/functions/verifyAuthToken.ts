// verifyAuthToken.ts
import { APIGatewayProxyEvent } from "aws-lambda";
import admin from "./firebaseAdmin";

export async function verifyAuthToken(
  event: APIGatewayProxyEvent
): Promise<any> {
  const token = event.headers.Authorization?.split("Bearer ")[1];

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "인증 토큰이 쿠키에 없습니다." }),
    };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { uid: decodedToken.uid };
  } catch (error) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "유효하지 않은 토큰입니다." }),
    };
  }
}
