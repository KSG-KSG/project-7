// 강아지 대화 공용 타입·상수 (브라우저와 서버에서 함께 사용)

export const CHAT_DAILY_LIMIT = 10; // supabase/schema.sql 의 use_chat_quota 와 같은 값

/** speaker: 0 = 처음 고른 강아지, 1 = 두 번째 강아지 */
export type ChatLine = { speaker: 0 | 1; text: string };

export type ChatResponse =
  | { lines: ChatLine[]; remaining: number }
  | { error: string; remaining?: number };
