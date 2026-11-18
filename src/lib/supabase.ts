import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, key!)
  : null;

export const BUCKET = "dog-photos";
export const MAX_DOGS_PER_USER = 5;

export type Dog = {
  id: string;
  owner_id: string;
  name: string;
  image_path: string;
  created_at: string;
  profiles: { nickname: string } | null;
};

export const DOG_SELECT = "id, owner_id, name, image_path, created_at, profiles(nickname)";

export function photoUrl(path: string): string {
  if (/^(https?:|data:)/.test(path)) return path; // 데모용 외부/인라인 이미지
  if (!supabase) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
