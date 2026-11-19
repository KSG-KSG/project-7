"use client";

import Link from "next/link";
import Playground from "@/components/Playground";
import type { Dog } from "@/lib/supabase";
import type { ChatLine } from "@/lib/chat";

// Supabase 없이 놀이터 애니메이션을 확인하는 데모 페이지
function fakeDogPhoto(fur: string, ear: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${fur}"/>
    <ellipse cx="18" cy="38" rx="14" ry="26" fill="${ear}"/>
    <ellipse cx="82" cy="38" rx="14" ry="26" fill="${ear}"/>
    <circle cx="36" cy="44" r="6" fill="#222"/><circle cx="64" cy="44" r="6" fill="#222"/>
    <circle cx="38" cy="42" r="2" fill="#fff"/><circle cx="66" cy="42" r="2" fill="#fff"/>
    <ellipse cx="50" cy="66" rx="16" ry="12" fill="#fff" opacity=".7"/>
    <ellipse cx="50" cy="60" rx="7" ry="5" fill="#222"/>
    <path d="M50 65 q-6 8 -12 4 M50 65 q6 8 12 4" stroke="#222" stroke-width="2.5" fill="none"/>
    <ellipse cx="50" cy="80" rx="5" ry="6" fill="#ff7a8a"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLES: [string, string, string, string, string][] = [
  ["초코", "민지", "#8b5a2b", "#5c3a1a", "갈색 털, 간식 앞에서는 체면 없는 먹보"],
  ["콩이", "준호", "#f2d7a6", "#c9a06a", "크림색 털, 겁은 많은데 허세는 더 많음"],
  ["보리", "서연", "#e8e0d5", "#a89a88", ""],
  ["두부", "하늘", "#fafafa", "#ddd", "새하얀 털, 깔끔쟁이라 웅덩이를 싫어함"],
  ["몽실", "지우", "#d9a066", "#9c6b3a", ""],
  ["까미", "도윤", "#3b3b3b", "#1f1f1f", "까만 털, 말수 적은 동네 철학자"],
];

const DOGS: Dog[] = SAMPLES.map(([name, owner, fur, ear, personality], i) => ({
  id: `demo-${i}`,
  owner_id: "demo",
  name,
  image_path: "",
  personality,
  demo_image: fakeDogPhoto(fur, ear),
  created_at: "",
  profiles: { nickname: owner },
}));

// 데모는 API 를 부르지 않고 샘플 대화를 보여 준다
const SAMPLE_CHATS: string[][] = [
  ["킁킁, 너 간식 냄새 난다!", "쉿… 주머니에 육포 숨겨 놨어", "나 반만 주면 안 돼?", "꼬리 세 번 흔들면 생각해 볼게", "살랑살랑살랑! 됐지?", "…좋아, 한 입만이야!"],
  ["저기 공 봤어?!", "봤지! 내가 먼저 찜!", "누가 빨리 가나 시합하자", "좋아, 하나 둘… 멍!", "야, 출발 전에 뛰면 반칙이야!", "헤헤 이미 늦었지롱~"],
  ["오늘 산책 몇 번 했어?", "아직 한 번… 너무 적지?", "나는 세 번! 부럽지?", "우리 집사는 소파랑 친해", "같이 현관 앞에서 낑낑대 보자", "작전 개시다 멍!"],
];

async function demoChat(): Promise<ChatLine[]> {
  await new Promise((r) => setTimeout(r, 600));
  const pick = SAMPLE_CHATS[Math.floor(Math.random() * SAMPLE_CHATS.length)];
  return pick.map((text, i) => ({ speaker: (i % 2) as 0 | 1, text }));
}

export default function DemoPage() {
  return (
    <main className="home">
      <header className="topbar">
        <h1>🐶 멍멍 놀이터 <small style={{ fontSize: 13, fontWeight: 500 }}>(데모)</small></h1>
        <span className="count">{DOGS.length}마리가 뛰어노는 중</span>
        <div className="spacer" />
        <Link className="btn" href="/">실제 놀이터로</Link>
      </header>
      <Playground dogs={DOGS} onChat={demoChat} chatBadge="샘플" />
      <div className="hint">강아지를 눌러 보세요!</div>
    </main>
  );
}
