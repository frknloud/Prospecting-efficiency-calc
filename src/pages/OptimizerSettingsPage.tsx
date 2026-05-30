import type { OptimizerSettings } from "../optimizer/optimizerSettings";

import type { OptimizerMode, OptimizerStrategy } from "../optimizer/types";

import { resetApplication } from "../utils/resetApplication";

interface Props {
  settings: OptimizerSettings;

  setSettings: (settings: OptimizerSettings) => void;
}

export default function OptimizerSettingsPage({
  settings,
  setSettings,
}: Props) {
  function updateSetting(key: keyof OptimizerSettings, value: unknown) {
    setSettings({
      ...settings,

      [key]: value,
    });
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 text-sm">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Optimizer Search Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
              <span>Auto Run Optimizer</span>

              <input
                type="checkbox"
                checked={settings.autoRun}
                onChange={(event) =>
                  updateSetting("autoRun", event.target.checked)
                }
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Optimizer Mode</label>

              <select
                className="w-full bg-slate-700 rounded-lg px-3 py-2"
                value={settings.mode}
                onChange={(event) =>
                  updateSetting("mode", event.target.value as OptimizerMode)
                }
              >
                <option value="fast">Fast</option>

                <option value="balanced">Balanced</option>

                <option value="exhaustive">Exhaustive</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Optimizer Strategy</label>

              <select
                className="w-full bg-slate-700 rounded-lg px-3 py-2"
                value={settings.strategy}
                onChange={(event) =>
                  updateSetting(
                    "strategy",
                    event.target.value as OptimizerStrategy,
                  )
                }
              >
                <option value="standard">Standard Recommendations</option>

                <option value="fullBuild">Full-Build Optimizer</option>
              </select>

              <p className="text-xs text-slate-400 mt-2">
                Standard evaluates one change at a time. Full-build applies a
                small sequence of best upgrades to create multi-change builds.
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Number of Top Results
              </label>

              <input
                type="number"
                className="w-full bg-slate-700 rounded-lg px-3 py-2"
                value={settings.topResults}
                onChange={(event) =>
                  updateSetting("topResults", Number(event.target.value))
                }
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Debounce (ms)</label>

              <input
                type="number"
                className="w-full bg-slate-700 rounded-lg px-3 py-2"
                value={settings.debounceMs}
                onChange={(event) =>
                  updateSetting("debounceMs", Number(event.target.value))
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 text-sm">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-red-400">
            Danger Zone
          </h2>

          <label className="block mb-2 font-medium">
            Use to clear ALL selections and start fresh.
          </label>

          <button
            className="bg-red-600 hover:bg-red-500 rounded-lg px-4 py-2 font-medium"
            onClick={() => {
              const confirmed = window.confirm(
                "Clear all saved data and reset the app?",
              );

              if (!confirmed) {
                return;
              }

              resetApplication();
            }}
          >
            Reset App
          </button>
        </div>
      </section>
    </div>
  );
}
