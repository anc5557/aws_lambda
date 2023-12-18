// foodRecommendationHandler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import admin from "./firebaseAdmin";
import OpenAI from "openai";

interface FoodRecommendationRequest {
  category: string;
  time: string;
}

export async function foodRecommendationHandler(
  event: APIGatewayProxyEvent,
  uid: string
): Promise<APIGatewayProxyResult> {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://go-mealchoice.vercel.app",
  ];

  // 요청의 Origin 헤더를 확인
  const origin = event.headers.origin;

  // 허용된 도메인 목록 중 일치하는지 확인
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  // 요청 본문 파싱
  const { category, time } = JSON.parse(
    event.body ?? "{}"
  ) as FoodRecommendationRequest;

  // 음식 가져오기
  const foodDocRef = admin.firestore().doc(`users/${uid}/foods/${uid}`);
  const foodDoc = await foodDocRef.get();
  const likeFoods = foodDoc.data()?.like; // 좋아요 음식
  const hateFoods = foodDoc.data()?.hate; // 싫어요 음식

  // 제외기간 가져오기
  const exclusionPeriod = foodDoc.data()?.exclusionPeriod;

  // history 컬렉션 가져오기
  const historyCollectionRef = admin
    .firestore()
    .collection(`users/${uid}/history`);
  const historyCollection = await historyCollectionRef.get();
  const history = historyCollection.docs.map((doc) => doc.data());

  // 현재 날짜
  const today = new Date();
  // 제외기간
  const exclusionDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - exclusionPeriod
  );

  const exclusionFoods = history
    .filter((food) => {
      const foodDate = new Date(food.date);
      return foodDate.getTime() > exclusionDate.getTime();
    })
    .map((food) => {
      return food.foodname;
    });

  //api key 가져오기
  const userDocRef = admin.firestore().doc(`users/${uid}/`);
  const userDoc = await userDocRef.get();
  const apiKey = userDoc.data()?.apiKey;

  // gpt4
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // 프롬프트
  const prompt = `최근에 먹은 음식 : ${exclusionFoods}, 싫어하는 음식 : ${hateFoods}, 좋아하는 음식 : ${likeFoods}
  , json 형식 : {menu: "추천 음식 이름", description: "추천 이유 설명"}`;

  // OpenAI에 요청
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `최근에 음식과 싫어하는 음식을 제외하고 좋아하는
               음식을 보고 ${time}에 먹을 ${category}을 추천해주세요.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    // 결과 반환
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: response.choices[0].message.content,
      }),
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": true, // 쿠키를 허용하겠다.
        "Access-Control-Allow-Methods": "OPTIONS,POST", // post 요청을 허용하겠다.
        "Access-Control-Allow-Headers": "Content-Type", // content-type을 허용하겠다.
      },
    };
  } catch (error) {
    console.error("OpenAI 요청 중 오류 발생:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "서버 내부 오류가 발생했습니다." }),
    };
  }
}
