const statConfig: Record<string, { label: string; color: string; border?: boolean }> = {
  luck: {
    label: 'L',
    color: '#C4FFB4'
  },
  capacity: {
    label: 'C',
    color: '#F7E0AE'
  },
  digStrength: {
    label: 'Dst',
    color: '#FFC1AE'
  },
  shakeStrength: {
    label: 'Sst',
    color: '#FFC1AE'
  },
  digSpeed: {
    label: 'Dsp',
    color: '#ACDBFF'
  },
  shakeSpeed: {
    label: 'Ssp',
    color: '#FFFFFF',
    border: true
  },
  sizeBoost: {
    label: 'W',
    color: '#FF4646'
  },
  modifierBoost: {
    label: 'M',
    color: '#2BFF4B'
  },
  sellBoost: {
    label: '$',
    color: '#F6D419'
  }
};

interface Props {
  statKey: string;
  value?: number;
}

export default function StatBadge({ statKey, value }: Props) {
  const config = statConfig[statKey];

  if (!config) {
    return null;
  }

  return (
    <div
      className={`rounded-md px-2 py-1 text-xs font-bold ${config.border ? 'border border-slate-400' : ''}`}
      style={{
        backgroundColor: config.color,
        color: '#111827'
      }}
    >
      {config.label}
      {value !== undefined && (
        <span className="ml-1 text-[10px]">
          +{Math.round(value * 100)}%
        </span>
      )}
    </div>
  );
}
