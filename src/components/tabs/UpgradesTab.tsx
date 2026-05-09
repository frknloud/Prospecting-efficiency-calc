interface UpgradesTabProps {
  showRecommendations: boolean;

  upgradeRecommendations: {
    slot: string;
    itemName: string;
    mutationName?: string | null;
    efficiencyGain: number;
    percentGain: number;
    digsImproved: boolean;
  }[];
}

export default function UpgradesTab({
  showRecommendations,
  upgradeRecommendations
}: UpgradesTabProps) {
  return (
          <div className="bg-slate-700 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-3">
                Next Best Upgrades
              </h3>

              {!showRecommendations ? (
                <div className="text-sm text-slate-400">
                  Select most of your build before upgrade recommendations appear.
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
                            {upgrade.itemName}
                            {upgrade.mutationName
                              ? ` + ${upgrade.mutationName}`
                              : ''}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-green-400 font-bold">
                            +{upgrade.percentGain.toFixed(2)}%
                          </div>

                          <div className="text-xs text-slate-400">
                            +{upgrade.efficiencyGain.toFixed(2)}
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
