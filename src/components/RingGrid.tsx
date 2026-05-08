import EquipmentSelector from './EquipmentSelector';

import { filterAvailableRings } from '../logic/filterAvailableRings';

interface RingItem {
  id?: string;
  name: string;
  unique?: boolean;
  [key: string]: unknown;
}

interface Props {
  rings: RingItem[];
  values: Array<string | null>;
  onChange: (index: number, value: string | null) => void;
}

export default function RingGrid({
  rings,
  values,
  onChange
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {values.map((value, index) => {
        const availableRings = filterAvailableRings(
          rings,
          values,
          index
        );

        return (
          <div
            key={index}
            className="bg-slate-700 rounded-xl p-3"
          >
            <EquipmentSelector
              label={`Ring ${index + 1}`}
              items={availableRings}
              value={value}
              getName={(item) => item.name}
              getId={(item) => item.id ?? item.name}
              onChange={(newValue) =>
                onChange(index, newValue)
              }
            />
          </div>
        );
      })}
    </div>
  );
}
