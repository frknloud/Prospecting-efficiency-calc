interface Enchant {
  name: string;
}

interface Props {
  label: string;
  enchants: Enchant[];
  value: string | null;
  onChange: (value: string | null) => void;
}

export default function EnchantSelector({
  label,
  enchants,
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
        <option value="">No Enchant</option>

        {enchants.map((enchant) => (
          <option key={enchant.id} value={enchant.id}>
            {enchant.name}
          </option>
        ))}
      </select>
    </div>
  );
}
