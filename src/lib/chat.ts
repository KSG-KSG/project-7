// 강아지 대화 공용 타입·상수 (브라우저와 서버에서 함께 사용)

export const CHAT_DAILY_LIMIT = 10; // supabase/schema.sql 의 use_chat_quota 와 같은 값

/** speaker: 0 = 처음 고른 강아지, 1 = 두 번째 강아지 */
export type ChatLine = { speaker: 0 | 1; text: string };

export type ChatResponse =
  | { lines: ChatLine[]; remaining: number }
  | { error: string; remaining?: number };

// 성격을 입력하지 않은 강아지는 ID 로 성격 2개를 정한다 (같은 강아지는 항상 같은 성격)
const TRAITS = [
  "먹보", "겁쟁이", "허세쟁이", "수다쟁이", "잠꾸러기", "호기심 대장", "새침데기", "장난꾸러기",
  "애교쟁이", "질투쟁이", "철학자 같은", "운동광", "덜렁이", "깔끔쟁이", "낙천주의자", "투덜이",
  "의심 많은", "허당", "자기가 사람인 줄 아는", "소심한 반항아",
];

export function fallbackTrait(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = TRAITS[h % TRAITS.length];
  const b = TRAITS[(h >>> 8) % TRAITS.length];
  return a === b ? a : `${a}, ${b}`;
}
