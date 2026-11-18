"use client";

import { useEffect, useRef } from "react";
import { photoUrl, type Dog } from "@/lib/supabase";

// 풀밭 영역 (필드 높이 대비 비율). 위쪽은 하늘/언덕.
const GRASS_TOP = 0.42;
const GRASS_BOTTOM = 0.86; // 아래쪽은 이름표 공간
const BASE_SIZE = 92; // 강아지 얼굴 기본 지름(px)

type Mode = "idle" | "run" | "jump";

type DogState = {
  x: number; // 0..1 (필드 너비 비율)
  y: number; // 0..1 (풀밭 내 깊이 비율, 0=멀리, 1=가까이)
  tx: number;
  ty: number;
  speed: number; // px/s
  mode: Mode;
  timer: number; // 현재 모드 남은 시간(s)
  phase: number; // 다리/깡충 애니메이션 위상
  facing: 1 | -1;
  jumpT: number;
  chase: string | null;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function newState(): DogState {
  const x = rand(0.1, 0.9);
  const y = rand(0.1, 0.9);
  return {
    x, y, tx: x, ty: y,
    speed: rand(70, 150),
    mode: "idle",
    timer: rand(0.2, 1.5),
    phase: Math.random() * Math.PI * 2,
    facing: Math.random() < 0.5 ? 1 : -1,
    jumpT: 0,
    chase: null,
  };
}

// 고정된 꽃·풀 장식 (렌더마다 바뀌지 않도록 시드 기반)
function seeded(n: number) {
  let s = 1234567;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ x: r(), y: r(), k: r() }));
}
const FLOWERS = seeded(38);
const TUFTS = seeded(60);
const FLOWER_COLORS = ["#fff", "#ffd84d", "#ff8fb1", "#c9a8ff", "#fff"];

export default function Playground({ dogs }: { dogs: Dog[] }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef(new Map<string, HTMLDivElement>());
  const states = useRef(new Map<string, DogState>());
  const initialized = useRef(false);

  // 강아지 목록이 바뀌면 상태 동기화
  useEffect(() => {
    const ids = new Set(dogs.map((d) => d.id));
    for (const id of states.current.keys()) if (!ids.has(id)) states.current.delete(id);
    for (const d of dogs) {
      if (!states.current.has(d.id)) {
        const s = newState();
        // 새로 들어온 강아지는 화면 옆에서 달려 들어오게
        if (initialized.current) {
          s.x = Math.random() < 0.5 ? -0.08 : 1.08;
          s.mode = "run";
          s.tx = rand(0.3, 0.7);
          s.timer = 99;
        }
        states.current.set(d.id, s);
      }
    }
    if (dogs.length > 0) initialized.current = true;
  }, [dogs]);

  // 애니메이션 루프
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const field = fieldRef.current;
      if (field) {
        const W = field.clientWidth;
        const H = field.clientHeight;
        const grassH = (GRASS_BOTTOM - GRASS_TOP) * H;
        const sizeFactor = Math.max(0.55, Math.min(1.1, W / 1000));
        const all = [...states.current.entries()];

        for (const [id, s] of all) {
          // 상태 전이
          s.timer -= dt;
          if (s.mode === "jump") {
            s.jumpT += dt;
            if (s.jumpT > 0.7) { s.mode = "idle"; s.timer = rand(0.5, 1.5); }
          } else if (s.mode === "idle" && s.timer <= 0) {
            s.mode = "run";
            s.speed = rand(70, 170);
            s.timer = rand(2, 5);
            const others = all.filter(([oid]) => oid !== id);
            if (others.length && Math.random() < 0.35) {
              s.chase = others[Math.floor(Math.random() * others.length)][0];
              s.speed = rand(130, 200);
            } else {
              s.chase = null;
              s.tx = rand(0.04, 0.96);
              s.ty = rand(0.02, 0.98);
            }
          }

          if (s.mode === "run") {
            if (s.chase) {
              const o = states.current.get(s.chase);
              if (o) { s.tx = o.x; s.ty = o.y; } else s.chase = null;
            }
            const dxPx = (s.tx - s.x) * W;
            const dyPx = (s.ty - s.y) * grassH;
            const dist = Math.hypot(dxPx, dyPx);
            const stopDist = s.chase ? BASE_SIZE * 0.8 : 4;
            if (dist < stopDist || s.timer <= 0) {
              s.mode = "idle";
              s.timer = rand(0.8, 3);
              s.chase = null;
            } else {
              const step = Math.min(dist, s.speed * dt);
              s.x += (dxPx / dist) * step / W;
              s.y += (dyPx / dist) * step / grassH;
              if (Math.abs(dxPx) > 2) s.facing = dxPx > 0 ? 1 : -1;
              s.phase += dt * s.speed * 0.09;
            }
          }

          // 화면 밖에서 들어오는 중이 아니면 경계 안으로
          if (s.x > -0.02 && s.x < 1.02) s.x = Math.min(0.97, Math.max(0.03, s.x));
          s.y = Math.min(1, Math.max(0, s.y));

          // 렌더
          const el = elRefs.current.get(id);
          if (!el) continue;
          const depth = 0.6 + s.y * 0.55; // 원근감
          const size = BASE_SIZE * sizeFactor * depth;
          const px = s.x * W;
          const py = GRASS_TOP * H + s.y * grassH;

          let hop = 0;
          let tilt = 0;
          if (s.mode === "run") {
            hop = Math.abs(Math.sin(s.phase)) * size * 0.14;
            tilt = Math.sin(s.phase) * 6;
          } else if (s.mode === "jump") {
            hop = Math.sin((s.jumpT / 0.7) * Math.PI) * size * 0.9;
            tilt = Math.sin(s.jumpT * 20) * 10;
          } else {
            hop = Math.abs(Math.sin(now / 400 + s.phase)) * size * 0.02;
          }

          el.style.transform = `translate(${px - size / 2}px, ${py - size}px)`;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.zIndex = String(10 + Math.round(s.y * 1000));
          el.dataset.mode = s.mode;
          const body = el.firstElementChild as HTMLElement | null;
          if (body) {
            body.style.transform = `translateY(${-hop}px) rotate(${tilt * s.facing}deg)`;
            const face = body.querySelector<HTMLElement>(".dog-face");
            if (face) face.style.transform = `scaleX(${s.facing})`;
          }
          const shadow = el.querySelector<HTMLElement>(".dog-shadow");
          if (shadow) {
            const k = 1 - Math.min(0.6, hop / size);
            shadow.style.transform = `translateX(-50%) scale(${k})`;
            shadow.style.opacity = String(0.35 * k);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const bark = (id: string) => {
    const s = states.current.get(id);
    if (!s) return;
    s.mode = "jump";
    s.jumpT = 0;
    const el = elRefs.current.get(id);
    const bubble = el?.querySelector<HTMLElement>(".dog-bubble");
    if (bubble) {
      bubble.classList.remove("show");
      void bubble.offsetWidth; // 애니메이션 재시작
      bubble.classList.add("show");
    }
  };

  return (
    <div className="field" ref={fieldRef}>
      <div className="sun" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c3" />
      <div className="hill h1" />
      <div className="hill h2" />
      <div className="grass" style={{ top: `${GRASS_TOP * 100 - 4}%` }}>
        {TUFTS.map((t, i) => (
          <span
            key={`t${i}`}
            className="tuft"
            style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, transform: `scale(${0.5 + t.y})` }}
          />
        ))}
        {FLOWERS.map((f, i) => (
          <span
            key={`f${i}`}
            className="flower"
            style={{
              left: `${f.x * 100}%`,
              top: `${f.y * 100}%`,
              color: FLOWER_COLORS[i % FLOWER_COLORS.length],
              transform: `scale(${0.5 + f.y * 0.9})`,
            }}
          />
        ))}
      </div>

      {dogs.map((d) => (
        <div
          key={d.id}
          className="dog"
          ref={(el) => {
            if (el) elRefs.current.set(d.id, el);
            else elRefs.current.delete(d.id);
          }}
          onClick={() => bark(d.id)}
          title={`${d.name} (${d.profiles?.nickname ?? "익명"}님의 강아지)`}
        >
          <div className="dog-body">
            <div className="dog-bubble">멍!</div>
            <div className="dog-legs">
              <i /><i /><i /><i />
            </div>
            <div className="dog-face">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(d.image_path)} alt={d.name} draggable={false} />
            </div>
          </div>
          <div className="dog-shadow" />
          <div className="dog-tag">
            <b>{d.name}</b>
            <span>{d.profiles?.nickname ?? "익명"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
