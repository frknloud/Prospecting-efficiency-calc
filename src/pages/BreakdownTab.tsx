import { FIXED_CYCLE_TIME } from "../engine/core/constants";

import type { EvaluatedBuild } from "../optimizer/evaluatedTypes";

interface BreakdownTabProps {
  evaluatedBuild: EvaluatedBuild;
}

export default function BreakdownTab({ evaluatedBuild }: BreakdownTabProps) {
  return (
    <section className="space-y-4 max-w-5xl">
      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Efficiency Formula</h2>

        <div className="text-slate-300 text-lg leading-relaxed font-mono">
          Efficiency = (Luck × √Capacity) ÷ (Shake Time + Dig Time + Base Delay)
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-5">Live Formula</h2>

        <div className="space-y-3 font-mono text-sm">
          <div className="grid grid-cols-[220px_auto] gap-x-4 items-center">
            <div className="text-slate-400">Numerator</div>

            <div className="text-indigo-300">
              ({evaluatedBuild.stats.luck.toFixed(2)}
              {" × "}
              {Math.sqrt(evaluatedBuild.stats.capacity ?? 0).toFixed(2)})
            </div>
          </div>

          <div className="grid grid-cols-[220px_auto] gap-x-4 items-center">
            <div className="text-slate-400">Denominator</div>

            <div className="text-indigo-300">
              ( Shake: {evaluatedBuild.cycleData.shakeTime.toFixed(2)}
              {" + "}
              Dig: {evaluatedBuild.cycleData.totalDigTime.toFixed(2)}
              {" + "}
              Base: {FIXED_CYCLE_TIME.toFixed(2)})
            </div>
          </div>

          <div className="border-t border-indigo-500 pt-3 mt-3 grid grid-cols-[220px_auto] gap-x-4 items-center">
            <div className="font-bold text-indigo-300">Final Efficiency</div>

            <div className="font-bold text-indigo-300 text-xl">
              {evaluatedBuild.efficiency.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-700 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Final Cycle Time</h2>

        <div className="text-5xl font-bold">
          {evaluatedBuild.cycleData.cycleTime.toFixed(2)}s
        </div>

        <div className="mt-3 text-sm text-indigo-200">
          Full mining cycle duration including: shaking, digging, and fixed
          delays.
        </div>
      </div>
    </section>
  );
}
