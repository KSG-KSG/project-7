# 🐶 멍멍 놀이터

각자 강아지 사진을 올리면, 강아지들이 풀밭에서 함께 뛰어노는 모습을 보여 주는 웹앱입니다.

- **Next.js 16 (App Router)** — Vercel 에 배포
- **Supabase** — 회원(Auth) · 프로필/강아지 DB · 사진 Storage · Realtime

## 기능

- 이메일 회원가입/로그인 (닉네임 저장)
- 강아지 사진 업로드 (브라우저에서 512px 정사각형으로 자동 크롭·압축), 1인당 5마리
- 풀밭에서 강아지들이 돌아다니고, 서로 쫓아다니고, 클릭하면 "멍!" 하고 점프
- 누군가 강아지를 올리면 다른 사람 화면에도 실시간으로 달려 들어옴
- **💬 강아지 대화** — 두 마리를 고르면 서로 달려가 마주 보고 Gemini 가 만든 대화를 말풍선으로 주고받음
  (로그인 사용자 1인당 하루 10회, 한국 시간 자정 초기화, DB 에서 강제)
  - 강아지마다 **성격·특징**(60자)을 업로드 때 또는 "내 강아지 → 성격" 에서 입력. 비워 두면 강아지 ID 로 성격이 정해짐
  - 대화마다 상황(고양이 목격, 목욕 예고 …)과 관계(라이벌, 절친 …)를 랜덤으로 골라 매번 다른 대화
- `/demo` — Supabase 없이 샘플 강아지로 애니메이션 확인

## 1. Supabase 준비

1. <https://supabase.com> 에서 새 프로젝트 생성
2. **SQL Editor** 에 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 **Run**
   - `profiles`, `dogs` 테이블, RLS 정책, 회원가입 트리거, `dog-photos` 버킷, Realtime 설정이 한 번에 만들어집니다.
   - 1인당 5마리 제한과 사진 경로 검사도 DB 에서 강제됩니다. 이미 만든 프로젝트라도 스키마가 바뀌면 이 파일을 다시 **Run** 하세요 (여러 번 실행해도 안전).
3. (로컬 테스트를 편하게 하려면) **Authentication → Sign In / Providers → Email** 에서
   **Confirm email** 을 끄면 가입 즉시 로그인됩니다. 켜 두면 인증 메일의 링크를 눌러야 합니다.
4. **Project Settings → API** (또는 상단 **Connect**) 에서 Project URL 과 anon(또는 publishable) 키 복사

## 2. Gemini API 키 (강아지 대화)

1. <https://aistudio.google.com/apikey> 에서 무료 API 키 발급
2. `.env.local` 에 `GEMINI_API_KEY=...` 추가 (**`NEXT_PUBLIC_` 붙이지 말 것** — 서버에서만 사용)
3. 모델은 기본값 `gemini-flash-lite-latest` (무료 티어에서 쓸 수 있는 가장 저렴한 Flash-Lite 최신 별칭).
   바꾸려면 `GEMINI_MODEL=모델이름` 추가
4. 대화 1번 = Gemini 요청 1번. 무료 키 자체의 분당/일일 한도를 넘으면 "강아지들이 졸려요" 안내가 뜹니다.
5. 무료 티어 요청 내용(강아지 이름)은 Google 서비스 개선에 쓰일 수 있습니다.

## 3. 로컬 실행

```bash
cp .env.local.example .env.local   # 그리고 URL/키 입력
npm install
npm run dev
```

<http://localhost:3000> 접속. 키 없이 화면만 보려면 <http://localhost:3000/demo>.

## 4. Vercel 임시(Preview) 배포

```bash
npx vercel login
npx vercel                # 처음 실행 시 프로젝트 연결 질문에 답하면 Preview URL 이 나옵니다
```

배포 후 Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables** 에
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` 를 추가하고 다시 `npx vercel` 로 배포합니다.
(또는 CLI 로 `npx vercel env add NEXT_PUBLIC_SUPABASE_URL preview`)

이메일 인증을 켜 두었다면 Supabase **Authentication → URL Configuration** 의
Site URL / Redirect URLs 에 Vercel 주소(`https://*.vercel.app`)를 추가하세요.

## 구조

```
src/app/page.tsx          메인 놀이터 (로그인 상태, 실시간 구독)
src/app/login/page.tsx    로그인/회원가입
src/app/demo/page.tsx     Supabase 없는 데모 (대화는 샘플 대사)
src/app/api/chat/route.ts 강아지 대화 API (로그인 확인 → 하루 사용량 차감 → Gemini)
src/lib/chat.ts           대화 공용 타입·하루 한도
src/components/Playground.tsx   풀밭 + 강아지 애니메이션 (requestAnimationFrame)
src/components/UploadPanel.tsx  사진 업로드/내 강아지 관리
src/lib/supabase.ts       Supabase 클라이언트
supabase/schema.sql       DB · Storage · 정책
```
