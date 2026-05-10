interface BaseItem {
  id: string;
  name: string;
}

interface Props<T extends BaseItem> {
  label: string;
  items: T[];
  value: string | null;
  getName: (item: T) => string;
  getId: (item: T) => string;
  onChange: (value: string | null) => void;
}

export default function EquipmentSelector<
  T extends BaseItem
>({
  label,
  items,
  value,
  getName,
  getId,
  onChange
}: Props<T>) {
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
        <option value="">Select {label}</option>

        {items.map((item) => {
          const name = getName(item);
          const id = getId ? getId(item) : item.id;

          return (
            <option key={id} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    </div>
  );
}
