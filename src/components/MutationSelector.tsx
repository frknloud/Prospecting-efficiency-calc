import type { Mutation } from '../types';

interface Props {
  label: string;
  mutations: Mutation[];
  value: string | null;
  onChange: (value: string | null) => void;
}

export default function MutationSelector({
  label,
  mutations,
  value,
  onChange
}: Props) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">
        {label}
      </label>

      <select
        className="w-full bg-slate-800 rounded-lg px-3 py-2"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">No Mutation</option>

        {mutations.map((mutation) => (
          <option
            key={mutation.id}
            value={mutation.id}
          >
            {mutation.name}
          </option>
        ))}
      </select>
    </div>
  );
}
