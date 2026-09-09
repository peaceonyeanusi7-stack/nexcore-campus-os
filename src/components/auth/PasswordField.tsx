import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field, inputClass } from "@/components/dashboard/kit";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} pr-12`}
          placeholder={placeholder}
          aria-describedby={error ? `${label.replaceAll(" ", "-").toLowerCase()}-error` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1 top-1 grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? (
        <p id={`${label.replaceAll(" ", "-").toLowerCase()}-error`} className="mt-1.5 text-xs text-flame">
          {error}
        </p>
      ) : null}
    </Field>
  );
}