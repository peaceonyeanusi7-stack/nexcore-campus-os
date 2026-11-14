import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AccountAvatar({
  name,
  photoPath,
  size = "md",
}: {
  name: string;
  photoPath?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const dimensions = size === "lg" ? "size-20 text-xl" : size === "sm" ? "size-9 text-xs" : "size-10 text-sm";
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "N";

  useEffect(() => {
    let active = true;
    if (!photoPath) {
      setPhotoUrl(null);
      return () => {
        active = false;
      };
    }
    void supabase.storage
      .from("profile-photos")
      .createSignedUrl(photoPath, 60 * 60)
      .then(({ data }) => {
        if (active) setPhotoUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [photoPath]);

  return photoUrl ? (
    <img
      src={photoUrl}
      alt={`${name || "Account"} profile photo`}
      className={`${dimensions} shrink-0 rounded-full border border-border object-cover`}
    />
  ) : (
    <span
      aria-label={`${name || "Account"} profile`}
      className={`${dimensions} grid shrink-0 place-items-center rounded-full bg-emerald-soft font-semibold text-emerald`}
    >
      {initials}
    </span>
  );
}