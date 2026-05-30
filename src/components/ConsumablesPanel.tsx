import ToggleCard from "./ToggleCard";

import consumables from "../data/consumables.json";

export interface ConsumablesState {
  boostRelics: string[];
  potions: string[];
}

type ConsumableCategory = keyof ConsumablesState;

interface ConsumableItem {
  id: string;
  name: string;
}

interface Props {
  selectedConsumables: ConsumablesState;
  toggleConsumable: (category: ConsumableCategory, id: string) => void;
}

function ConsumableSubsection({
  title,
  category,
  items,
  selectedConsumables,
  toggleConsumable,
}: {
  title: string;
  category: ConsumableCategory;
  items: ConsumableItem[];
  selectedConsumables: ConsumablesState;
  toggleConsumable: (category: ConsumableCategory, id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-slate-200">{title}</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <ToggleCard
            key={item.id}
            label={item.name}
            enabled={selectedConsumables[category].includes(item.id)}
            onToggle={() => toggleConsumable(category, item.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ConsumablesPanel({
  selectedConsumables,
  toggleConsumable,
}: Props) {
  return (
    <div className="pt-3 border-t border-slate-700 space-y-4">
      <h3 className="text-lg font-semibold">Consumables</h3>

      <ConsumableSubsection
        title="Boost Relics"
        category="boostRelics"
        items={consumables.boostRelics}
        selectedConsumables={selectedConsumables}
        toggleConsumable={toggleConsumable}
      />

      <ConsumableSubsection
        title="Potions"
        category="potions"
        items={consumables.potions}
        selectedConsumables={selectedConsumables}
        toggleConsumable={toggleConsumable}
      />
    </div>
  );
}
