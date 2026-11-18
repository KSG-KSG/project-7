"use client";

import Link from "next/link";
import Playground from "@/components/Playground";
import type { Dog } from "@/lib/supabase";

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

const SAMPLES: [string, string, string, string][] = [
  ["초코", "민지", "#8b5a2b", "#5c3a1a"],
  ["콩이", "준호", "#f2d7a6", "#c9a06a"],
  ["보리", "서연", "#e8e0d5", "#a89a88"],
  ["두부", "하늘", "#fafafa", "#ddd"],
  ["몽실", "지우", "#d9a066", "#9c6b3a"],
  ["까미", "도윤", "#3b3b3b", "#1f1f1f"],
];

const DOGS: Dog[] = SAMPLES.map(([name, owner, fur, ear], i) => ({
  id: `demo-${i}`,
  owner_id: "demo",
  name,
  image_path: "",
  demo_image: fakeDogPhoto(fur, ear),
  created_at: "",
  profiles: { nickname: owner },
}));

export default function DemoPage() {
  return (
    <main className="home">
      <header className="topbar">
        <h1>🐶 멍멍 놀이터 <small style={{ fontSize: 13, fontWeight: 500 }}>(데모)</small></h1>
        <span className="count">{DOGS.length}마리가 뛰어노는 중</span>
        <div className="spacer" />
        <Link className="btn" href="/">실제 놀이터로</Link>
      </header>
      <Playground dogs={DOGS} />
      <div className="hint">강아지를 눌러 보세요!</div>
    </main>
  );
}
