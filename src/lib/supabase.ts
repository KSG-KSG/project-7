import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, key!)
  : null;

export const BUCKET = "dog-photos";
export const MAX_DOGS_PER_USER = 5; // supabase/schema.sql 의 enforce_dog_limit 과 같은 값
export const MAX_PERSONALITY = 60; // supabase/schema.sql 의 personality 길이 제한과 같은 값

export type Dog = {
  id: string;
  owner_id: string;
  name: string;
  image_path: string;
  /** 성격·특징 (schema.sql 5번). 비어 있으면 fallbackTrait 으로 자동 성격 */
  personality?: string;
  created_at: string;
  profiles: { nickname: string } | null;
  /** 데모 전용: Storage 대신 이 이미지(data: URL 등)를 그대로 쓴다. DB 에는 없는 필드. */
  demo_image?: string;
};

export const DOG_SELECT = "id, owner_id, name, image_path, personality, created_at, profiles(nickname)";
/** schema.sql 5번(personality 컬럼)을 아직 실행하지 않은 DB 용 */
export const DOG_SELECT_BASIC = "id, owner_id, name, image_path, created_at, profiles(nickname)";

// Storage 경로("{유저ID}/파일명")만 받는다. 외부 URL·data: URL 등은 표시하지 않는다.
const STORAGE_PATH = /^[0-9a-f-]{36}\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

export function photoUrl(path: string): string {
  if (!supabase || !STORAGE_PATH.test(path)) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function dogImage(dog: Dog): string {
  return dog.demo_image ?? photoUrl(dog.image_path);
}
