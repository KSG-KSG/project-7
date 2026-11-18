"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import Playground from "@/components/Playground";
import UploadPanel from "@/components/UploadPanel";
import { DOG_SELECT, isConfigured, supabase, type Dog } from "@/lib/supabase";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const loadDogs = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("dogs")
      .select(DOG_SELECT)
      .order("created_at", { ascending: true })
      .limit(60);
    if (!error && data) setDogs(data as unknown as Dog[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    loadDogs();

    // 다른 사람이 강아지를 올리거나 내보내면 실시간 반영
    const channel = sb
      .channel("dogs-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "dogs" }, () => loadDogs())
      .subscribe();

    return () => {
      sub.subscription.unsubscribe();
      sb.removeChannel(channel);
    };
  }, [loadDogs]);

  useEffect(() => {
    if (!supabase || !session) return setNickname(null);
    supabase
      .from("profiles")
      .select("nickname")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setNickname(data?.nickname ?? null));
  }, [session]);

  if (!isConfigured) {
    return (
      <main className="center-page">
        <div className="card">
          <h1>🐶 멍멍 놀이터</h1>
          <p>Supabase 연결 정보가 없어요.</p>
          <p className="muted">
            <code>.env.local.example</code> 을 <code>.env.local</code> 로 복사하고
            Supabase URL과 키를 넣은 뒤 개발 서버를 다시 시작하세요.
          </p>
        </div>
      </main>
    );
  }

  const myDogs = session ? dogs.filter((d) => d.owner_id === session.user.id) : [];

  return (
    <main className="home">
      <header className="topbar">
        <h1>🐶 멍멍 놀이터</h1>
        <span className="count">{dogs.length}마리가 뛰어노는 중</span>
        <div className="spacer" />
        {session ? (
          <>
            <span className="hello">{nickname ?? "…"}님</span>
            <button className="btn primary" onClick={() => setShowUpload(true)}>강아지 올리기</button>
            <button className="btn" onClick={() => supabase!.auth.signOut()}>로그아웃</button>
          </>
        ) : (
          <Link className="btn primary" href="/login">로그인하고 우리 강아지 자랑하기</Link>
        )}
      </header>

      <Playground dogs={dogs} />

      {!loading && dogs.length === 0 && (
        <div className="empty">
          아직 뛰노는 강아지가 없어요.<br />첫 번째 강아지를 놀이터에 보내 주세요!
        </div>
      )}
      {dogs.length > 0 && <div className="hint">강아지를 눌러 보세요!</div>}

      {showUpload && session && (
        <UploadPanel
          userId={session.user.id}
          myDogs={myDogs}
          onClose={() => setShowUpload(false)}
          onChanged={loadDogs}
        />
      )}
    </main>
  );
}
