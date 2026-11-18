"use client";

import { useEffect, useState } from "react";
import { BUCKET, MAX_DOGS_PER_USER, photoUrl, supabase, type Dog } from "@/lib/supabase";

// 업로드 전에 브라우저에서 정사각형(가운데 크롭) 512px JPEG 으로 줄인다.
async function toSquareJpeg(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), "image/jpeg", 0.85),
  );
}

type Props = {
  userId: string;
  myDogs: Dog[];
  onClose: () => void;
  onChanged: () => void;
};

export default function UploadPanel({ userId, myDogs, onClose, onChanged }: Props) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const full = myDogs.length >= MAX_DOGS_PER_USER;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !file || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await toSquareJpeg(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (up.error) throw up.error;
      const ins = await supabase.from("dogs").insert({ owner_id: userId, name: name.trim(), image_path: path });
      if (ins.error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw ins.error;
      }
      setName("");
      setFile(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (dog: Dog) => {
    if (!supabase || !confirm(`${dog.name}을(를) 놀이터에서 내보낼까요?`)) return;
    const del = await supabase.from("dogs").delete().eq("id", dog.id);
    if (del.error) return setError(del.error.message);
    await supabase.storage.from(BUCKET).remove([dog.image_path]);
    onChanged();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <h2>우리 강아지 놀이터에 보내기</h2>

        {full ? (
          <p className="muted">강아지는 한 사람당 {MAX_DOGS_PER_USER}마리까지 올릴 수 있어요.</p>
        ) : (
          <form onSubmit={submit} className="upload-form">
            <label className="photo-pick">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="미리보기" />
              ) : (
                <span>사진 선택<br /><small>얼굴이 가운데 오면 좋아요</small></span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                hidden
              />
            </label>
            <input
              className="input"
              placeholder="강아지 이름"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button className="btn primary" disabled={busy || !file || !name.trim()}>
              {busy ? "보내는 중…" : "놀이터로 보내기 🐾"}
            </button>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        {myDogs.length > 0 && (
          <>
            <h3>내 강아지 ({myDogs.length}/{MAX_DOGS_PER_USER})</h3>
            <ul className="my-dogs">
              {myDogs.map((d) => (
                <li key={d.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(d.image_path)} alt={d.name} />
                  <span>{d.name}</span>
                  <button className="btn small" onClick={() => remove(d)}>내보내기</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
