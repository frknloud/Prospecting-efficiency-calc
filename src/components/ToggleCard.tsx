interface Props {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}

export default function ToggleCard({
  label,
  enabled,
  onToggle
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full rounded-xl p-4 text-left transition-all border
        ${
          enabled
            ? 'bg-indigo-600 border-indigo-400'
            : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>

        <div
          className={`
            w-4 h-4 rounded-full
            ${enabled ? 'bg-white' : 'bg-slate-400'}
          `}
        />
      </div>
    </button>
  );
}
