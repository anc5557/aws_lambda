// index.ts
import { APIGatewayProxyHandler } from "aws-lambda";
import { verifyAuthToken } from "./verifyAuthToken";
import { foodRecommendationHandler } from "./foodRecommendationHandler";

export const handler: APIGatewayProxyHandler = async (event) => {
  // 환경 변수에 따라 허용된 오리진 설정
  const isDevMode = process.env.NODE_ENV === "development";

  // 개별 문자열로 허용된 오리진 설정
  const allowedOrigin = isDevMode
    ? "http://localhost:3000"
    : "https://go-mealchoice.vercel.app";

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin, // 허용된 오리진
    "Access-Control-Allow-Credentials": true, // 쿠키를 허용할지 설정
  };

  if (event.httpMethod === "POST") {
    const authResult = await verifyAuthToken(event);

    if ("statusCode" in authResult && authResult.statusCode !== 200) {
      // authResult에 statusCode가 있고, statusCode가 200이 아닐 때
      return {
        statusCode: authResult.statusCode,
        body: authResult.body,
        headers,
      };
    }

    const result = await foodRecommendationHandler(event, authResult.uid);
    return { ...result, headers };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ message: "지원하지 않는 메소드입니다." }),
    headers,
  };
};
