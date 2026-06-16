import { FIXED_CYCLE_TIME } from "../engine/core/constants";

import type { EvaluatedBuild } from "../engine/evaluatedTypes";

interface BreakdownTabProps {
  evaluatedBuild: EvaluatedBuild;
}

export default function BreakdownTab({ evaluatedBuild }: BreakdownTabProps) {
  const capacityRoot = Math.sqrt(evaluatedBuild.stats.capacity ?? 0);

  const denominator = evaluatedBuild.cycleData.cycleTime;

  return (
    <section className="space-y-4 max-w-5xl">
      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-3">What is Efficiency?</h2>

        <div className="space-y-3 text-sm leading-6 text-slate-300">
          <p>
            Efficiency is the app&apos;s single score for how good your build is at
            finding valuable minerals quickly. A higher number usually means your
            build gets more useful mineral-finding power per mining cycle.
          </p>

          <p>
            Modifier Efficiency is the same idea, but focused on finding modified
            minerals. It uses your Modifier Luck instead of your regular Luck, so
            it is useful when you care more about modifiers than raw mineral rarity.
          </p>

          <p>
            Luck and capacity help you find more and better minerals. Modifier
            luck and capacity help you find more and better mineral modifiers.
            Shake speed, dig speed, and related strength stats help finish each
            cycle faster. The formula combines those ideas so you can compare
            builds without having to judge every stat one by one.
          </p>

          <p className="text-slate-400">
            In plain English: more finding power divided by less time equals
            better efficiency.
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Efficiency Formulas</h2>

        <div className="space-y-4 text-slate-300 text-base leading-relaxed font-mono md:text-lg">
          <div className="rounded-2xl bg-slate-900/60 p-4">
            Efficiency = (Luck × √Capacity) ÷ (Shake Time + Dig Time + Base Delay)
          </div>

          <div className="rounded-2xl bg-slate-900/60 p-4">
            Modifier Efficiency = (Modifier Luck × √Capacity) ÷ (Shake Time + Dig Time + Base Delay)
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-5">Live Formula</h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/60 p-4">
            <h3 className="mb-3 font-semibold text-indigo-300">Efficiency</h3>

            <div className="space-y-3 font-mono text-sm">
              <div className="grid gap-1 sm:grid-cols-[120px_auto] sm:gap-x-4">
                <div className="text-slate-400">Numerator</div>

                <div className="text-indigo-300">
                  ({evaluatedBuild.stats.luck.toFixed(2)}
                  {" × "}
                  {capacityRoot.toFixed(2)})
                </div>
              </div>

              <div className="grid gap-1 sm:grid-cols-[120px_auto] sm:gap-x-4">
                <div className="text-slate-400">Denominator</div>

                <div className="text-indigo-300">
                  (Shake: {evaluatedBuild.cycleData.shakeTime.toFixed(2)}
                  {" + "}
                  Dig: {evaluatedBuild.cycleData.totalDigTime.toFixed(2)}
                  {" + "}
                  Base: {FIXED_CYCLE_TIME.toFixed(2)})
                </div>
              </div>

              <div className="border-t border-indigo-500/50 pt-3 mt-3 grid gap-1 sm:grid-cols-[120px_auto] sm:gap-x-4">
                <div className="font-bold text-indigo-300">Result</div>

                <div className="font-bold text-indigo-300 text-xl">
                  {evaluatedBuild.efficiency.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/40 bg-slate-900/60 p-4">
            <h3 className="mb-3 font-semibold text-sky-300">Modifier Efficiency</h3>

            <div className="space-y-3 font-mono text-sm">
              <div className="grid gap-1 sm:grid-cols-[120px_auto] sm:gap-x-4">
                <div className="text-slate-400">Numerator</div>

                <div className="text-sky-300">
                  ({evaluatedBuild.modifierLuck.toFixed(2)}
                  {" × "}
                  {capacityRoot.toFixed(2)})
                </div>
              </div>

              <div className="grid gap-1 sm:grid-cols-[120px_auto] sm:gap-x-4">
                <div className="text-slate-400">Denominator</div>

                <div className="text-sky-300">
                  (Shake: {evaluatedBuild.cycleData.shakeTime.toFixed(2)}
                  {" + "}
                  Dig: {evaluatedBuild.cycleData.totalDigTime.toFixed(2)}
                  {" + "}
                  Base: {FIXED_CYCLE_TIME.toFixed(2)})
                </div>
              </div>

              <div className="border-t border-sky-500/50 pt-3 mt-3 grid gap-1 sm:grid-cols-[120px_auto] sm:gap-x-4">
                <div className="font-bold text-sky-300">Result</div>

                <div className="font-bold text-sky-300 text-xl">
                  {evaluatedBuild.modifierEfficiency.toFixed(2)}
                </div>
              </div>
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
