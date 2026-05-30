import type { Mutation } from "../engine/types";

interface Props {
  label: string;
  mutations: Mutation[];
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

export default function MutationSelector({
  label,
  mutations,
  value,
  onChange,
  disabled = false,
  disabledMessage = "Mutations unavailable",
}: Props) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">{label}</label>

      <select
        className="w-full bg-slate-800 rounded-lg px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        value={disabled ? "" : value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">
          {disabled ? disabledMessage : "No Mutation"}
        </option>

        {!disabled &&
          mutations.map((mutation) => (
            <option key={mutation.id} value={mutation.id}>
              {mutation.name}
            </option>
          ))}
      </select>
    </div>
  );
}
