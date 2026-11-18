-- =========================================================
-- 멍멍 놀이터 스키마
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록 작성되어 있습니다.
-- =========================================================

-- 1) 유저 프로필 ------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- 회원가입 시 프로필 자동 생성 (닉네임은 signUp 의 user metadata 에서)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'nickname', ''),
                  split_part(new.email, '@', 1)), 20)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 강아지 ------------------------------------------------------
create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  image_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists dogs_owner_id_idx on public.dogs (owner_id);

alter table public.dogs enable row level security;

drop policy if exists "dogs are viewable by everyone" on public.dogs;
create policy "dogs are viewable by everyone"
  on public.dogs for select using (true);

-- image_path 는 반드시 본인 Storage 폴더의 파일("{유저ID}/파일명")이어야 한다.
-- (외부 URL·data: URL·다른 사람 폴더 경로를 넣어 모두의 화면에 띄우는 것을 막음)
drop policy if exists "users can add own dogs" on public.dogs;
create policy "users can add own dogs"
  on public.dogs for insert to authenticated
  with check (
    auth.uid() = owner_id
    and image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'
    and split_part(image_path, '/', 1) = auth.uid()::text
  );

-- 1인당 강아지 5마리 제한 (화면뿐 아니라 DB 에서도 강제).
-- 같은 유저의 동시 업로드가 제한을 넘지 않도록 유저별 잠금을 건다.
create or replace function public.enforce_dog_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('dogs:' || new.owner_id::text));
  if (select count(*) from public.dogs where owner_id = new.owner_id) >= 5 then
    raise exception '강아지는 한 사람당 5마리까지 올릴 수 있어요.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists dogs_enforce_limit on public.dogs;
create trigger dogs_enforce_limit
  before insert on public.dogs
  for each row execute function public.enforce_dog_limit();

drop policy if exists "users can delete own dogs" on public.dogs;
create policy "users can delete own dogs"
  on public.dogs for delete to authenticated
  using (auth.uid() = owner_id);

-- 테이블 접근 권한 (최근 Supabase 프로젝트는 새 테이블에 자동 GRANT 가 없음).
-- 실제로 누가 어떤 행을 볼/바꿀 수 있는지는 위의 RLS 정책이 제한한다.
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.dogs to anon, authenticated;
grant update (nickname) on public.profiles to authenticated;
grant insert, delete on public.dogs to authenticated;

-- 새 강아지가 실시간으로 놀이터에 등장하도록 Realtime 활성화
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dogs'
  ) then
    alter publication supabase_realtime add table public.dogs;
  end if;
end $$;

-- 3) 사진 저장소 (Storage) --------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dog-photos', 'dog-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 파일 경로는 "{유저ID}/{파일명}" 형식. 본인 폴더에만 올리고 지울 수 있음.
drop policy if exists "dog photos: upload to own folder" on storage.objects;
create policy "dog photos: upload to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'dog-photos'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dog photos: read own folder" on storage.objects;
create policy "dog photos: read own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'dog-photos'
         and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "dog photos: delete own folder" on storage.objects;
create policy "dog photos: delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'dog-photos'
         and (storage.foldername(name))[1] = auth.uid()::text);
