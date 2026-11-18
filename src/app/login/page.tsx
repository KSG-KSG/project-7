"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nickname: nickname.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMsg({ type: "info", text: "인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요." });
          setMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.push("/");
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "문제가 생겼어요." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="center-page">
      <form className="card auth" onSubmit={submit}>
        <h1>🐶 멍멍 놀이터</h1>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>로그인</button>
          <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>회원가입</button>
        </div>
        {mode === "signup" && (
          <input className="input" placeholder="닉네임 (보호자 이름)" maxLength={20} value={nickname}
            onChange={(e) => setNickname(e.target.value)} required />
        )}
        <input className="input" type="email" placeholder="이메일" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="비밀번호 (6자 이상)" minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"} value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn primary" disabled={busy}>
          {busy ? "잠시만요…" : mode === "login" ? "로그인" : "가입하기"}
        </button>
        {msg && <p className={msg.type === "error" ? "error" : "info"}>{msg.text}</p>}
        <Link href="/" className="muted back">← 놀이터 구경하기</Link>
      </form>
    </main>
  );
}
