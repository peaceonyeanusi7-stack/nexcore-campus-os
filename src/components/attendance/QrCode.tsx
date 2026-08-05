import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" }).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className="grid shrink-0 place-items-center rounded-2xl border border-border bg-background p-3"
      style={{ width: size + 24, height: size + 24 }}
    >
      {src ? (
        <img src={src} alt={`QR code for attendance session ${value}`} width={size} height={size} />
      ) : (
        <span className="text-xs text-ink-muted">Generating…</span>
      )}
    </div>
  );
}