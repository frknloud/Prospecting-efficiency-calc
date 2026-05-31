import { RefreshCw } from "lucide-react";

interface UpgradeRecommendationView {
  slot: string;
  itemName: string;
  enchantName?: string | null;
  mutationName?: string | null;
  modifierName?: string | null;
  efficiencyGain: number;
  percentGain: number;
  luckGain: number;
  luckPercentGain: number;
  balanceScore: number;
  digsImproved: boolean;
}

interface UpgradesTabProps {
  canRunAdvisor: boolean;

  loading: boolean;

  upgradeRecommendations: UpgradeRecommendationView[];

  onRunAdvisor: () => void;

  needsRefresh: boolean;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatSignedNumber(value: number): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}`;
}

function formatUpgradeName(upgrade: UpgradeRecommendationView): string {
  return [
    upgrade.itemName,
    upgrade.enchantName,
    upgrade.mutationName,
    upgrade.modifierName,
  ]
    .filter(Boolean)
    .join(" + ");
}

function LoadingProgressBar() {
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-400" />
      </div>

      <div className="text-sm text-indigo-300">Running Upgrade Advisor...</div>
    </div>
  );
}

export default function UpgradesTab({
  canRunAdvisor,
  loading,
  upgradeRecommendations,
  onRunAdvisor,
  needsRefresh,
}: UpgradesTabProps) {
  return (
    <div className="bg-slate-700 rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Upgrade Advisor</h3>

          <p className="text-xs text-slate-400 mt-1">
            Ranked by a fixed balance of efficiency gain and luck gain.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunAdvisor}
          disabled={!canRunAdvisor || loading}
          className={
            !canRunAdvisor || loading
              ? "bg-slate-800 text-slate-500 rounded-lg px-3 py-2 text-sm font-semibold cursor-not-allowed inline-flex items-center gap-2"
              : `bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                  needsRefresh ? "attention-glow" : ""
                }`
          }
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Run Upgrade Advisor
        </button>
      </div>

      {!canRunAdvisor ? (
        <div className="text-sm text-slate-400">
          Select most of your build before running upgrade recommendations.
        </div>
      ) : loading ? (
        <LoadingProgressBar />
      ) : upgradeRecommendations.length === 0 ? (
        <div className="text-sm text-slate-400">
          No recommendations yet. Run Upgrade Advisor to generate the list.
        </div>
      ) : (
        <div className="space-y-2">
          {upgradeRecommendations.map((upgrade, index) => (
            <div
              key={`${upgrade.slot}-${upgrade.itemName}-${index}`}
              className="bg-slate-800 rounded-xl p-3"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-semibold text-slate-100">
                    {upgrade.slot}
                  </div>

                  <div className="text-sm text-slate-300">
                    {formatUpgradeName(upgrade)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-green-400 font-bold">
                    Score {formatSignedPercent(upgrade.balanceScore)}
                  </div>

                  <div className="text-xs text-slate-400">
                    Eff {formatSignedPercent(upgrade.percentGain)} · Luck{" "}
                    {formatSignedPercent(upgrade.luckPercentGain)}
                  </div>

                  <div className="text-xs text-slate-500">
                    {formatSignedNumber(upgrade.efficiencyGain)} efficiency ·{" "}
                    {formatSignedNumber(upgrade.luckGain)} luck
                  </div>
                </div>
              </div>

              {upgrade.digsImproved && (
                <div className="mt-2 text-xs text-amber-300 font-semibold">
                  Dig breakpoint improvement
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
