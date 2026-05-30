import type { Dispatch, SetStateAction } from "react";

import { getSelectableRegionDefinitions, SPECIAL_ACCESS_LABELS } from "../access/accessRules";

import type { AccessSettings, SpecialAccessKey } from "../access/accessTypes";

interface AccessFilterPanelProps {
  settings: AccessSettings;

  setSettings: Dispatch<SetStateAction<AccessSettings>>;
}

export default function AccessFilterPanel({
  settings,
  setSettings,
}: AccessFilterPanelProps) {
  function updateSetting<Key extends keyof AccessSettings>(
    key: Key,
    value: AccessSettings[Key],
  ) {
    setSettings((previous) => ({
      ...previous,

      [key]: value,
    }));
  }

  function updateSpecialAccess(
    key: SpecialAccessKey,
    value: boolean,
  ) {
    updateSetting("specialAccess", {
      ...settings.specialAccess,

      [key]: value,
    });
  }

  return (
    <section className="bg-slate-800 rounded-2xl p-4 shadow-lg text-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Progression Setup</h2>

          <p className="text-xs text-slate-400 mt-1">
            Control which progression-level and content are available. 
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(120px,1fr))] gap-3 mt-4">
        <div>
          <label className="block mb-2 font-medium">
            Highest Region Reached
          </label>

          <select
            className="w-full bg-slate-700 rounded-lg px-3 py-2"
            value={settings.region}
            onChange={(event) =>
              updateSetting("region", event.target.value)
            }
          >
            {getSelectableRegionDefinitions().map((region) => (
              <option
                key={region.region}
                value={region.region}
              >
                {region.name ?? "Start"}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center justify-between gap-2 bg-slate-700 rounded-lg px-2 py-2 md:mt-7 min-w-0">
          <span>Limited-Time Items</span>

          <input
            type="checkbox"
            checked={settings.includeLimitedTime}
            onChange={(event) =>
              updateSetting(
                "includeLimitedTime",
                event.target.checked,
              )
            }
          />
        </label>

        {(Object.keys(SPECIAL_ACCESS_LABELS) as SpecialAccessKey[]).map(
          (key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-2 bg-slate-700 rounded-lg px-2 py-2 md:mt-7 min-w-0"
            >
              <span>{SPECIAL_ACCESS_LABELS[key]}</span>

              <input
                type="checkbox"
                checked={settings.specialAccess[key]}
                onChange={(event) =>
                  updateSpecialAccess(key, event.target.checked)
                }
              />
            </label>
          ),
        )}
      </div>
    </section>
  );
}
