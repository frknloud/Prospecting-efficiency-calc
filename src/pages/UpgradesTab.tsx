import { RefreshCw } from "lucide-react";

interface UpgradeRecommendationView {
  slot: string;
  itemName: string;
  enchantName?: string | null;
  mutationName?: string | null;
  modifierName?: string | null;
  currentName: string;
  recommendedName: string;
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
        <div className="space-y-3">
          {upgradeRecommendations.map((upgrade, index) => (
            <div
              key={`${upgrade.slot}-${upgrade.recommendedName}-${index}`}
              className="bg-slate-800 rounded-xl p-3 space-y-3"
            >
              <div>
                <div className="font-semibold text-slate-100">
                  {upgrade.slot}
                </div>

                <div className="mt-1 text-sm text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-400">Replace:</span>{" "}
                  <span className="text-slate-200">{upgrade.currentName}</span>{" "}
                  <span className="text-slate-500">with</span>{" "}
                  <span className="font-semibold text-emerald-300">
                    {upgrade.recommendedName}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-300">
                  Score {formatSignedPercent(upgrade.balanceScore)}
                </span>

                <span className="rounded-full bg-slate-700 px-2 py-1 text-slate-300">
                  Eff {formatSignedPercent(upgrade.percentGain)}
                </span>

                <span className="rounded-full bg-slate-700 px-2 py-1 text-slate-300">
                  Luck {formatSignedPercent(upgrade.luckPercentGain)}
                </span>

                <span className="rounded-full bg-slate-900 px-2 py-1 text-slate-400">
                  {formatSignedNumber(upgrade.efficiencyGain)} efficiency
                </span>

                <span className="rounded-full bg-slate-900 px-2 py-1 text-slate-400">
                  {formatSignedNumber(upgrade.luckGain)} luck
                </span>
              </div>

              {upgrade.digsImproved && (
                <div className="text-xs text-amber-300 font-semibold">
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
