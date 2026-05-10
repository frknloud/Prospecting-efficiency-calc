import EquipmentSelector from './EquipmentSelector';

import { filterAvailableRings } from '../logic/filterAvailableRings';

interface RingItem {
  id: string;
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
    <div className="space-y-3">
      {values.map((value, index) => {
        const availableRings = filterAvailableRings(
          rings,
          values,
          index
        );

        return (
          <EquipmentSelector
            key={index}
            label={`Ring ${index + 1}`}
            items={availableRings}
            value={value}
            getName={(item) => item.name}
            getId={(item) => item.id}
            onChange={(newValue) =>
              onChange(index, newValue)
            }
          />
        );
      })}
    </div>
  );
}
