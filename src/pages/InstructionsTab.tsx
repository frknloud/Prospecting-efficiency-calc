export default function InstructionsTab() {
  return (
    <section className="max-w-5xl space-y-4">
      <div className="rounded-2xl bg-slate-800 p-6 shadow-lg">
        <h2 className="mb-2 text-2xl font-bold">Instructions</h2>

        <p className="max-w-3xl text-sm leading-6 text-slate-300">
          Use this app like a checklist: enter what you currently have, check your
          final stats, then run the tools only when you want fresh recommendations.
          The app does not auto-run heavy searches unless you ask it to.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-800 p-5 shadow-lg">
          <h3 className="mb-2 text-xl font-semibold">1. Calculator</h3>

          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            <li>Pick your current region first so locked items and buffs behave correctly.</li>
            <li>Select your pan, shovel, necklace, charm, rings, enchants, and mutations.</li>
            <li>Set Permanent Buffs and Consumables to match what you are actually using.</li>
            <li>Fill out Museum slots if you want the final stats to include museum bonuses.</li>
            <li>Use lock buttons to protect items you do not want the Optimizer to change.</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-800 p-5 shadow-lg">
          <h3 className="mb-2 text-xl font-semibold">2. Efficiency Breakdown</h3>

          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            <li>Use this tab to understand why your efficiency number changed.</li>
            <li>Higher luck and capacity push efficiency up.</li>
            <li>Faster shake and dig cycles push efficiency up by lowering total cycle time.</li>
            <li>This tab is best for comparing one build change at a time.</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-800 p-5 shadow-lg">
          <h3 className="mb-2 text-xl font-semibold">3. Upgrade Advisor</h3>

          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            <li>Click Run Upgrade Advisor when you want a quick single-upgrade suggestion.</li>
            <li>It looks for one complete replacement, such as a pan with its enchant or a ring with its mutation.</li>
            <li>It balances efficiency and luck, so the top result may not always be pure efficiency only.</li>
            <li>If you change your build afterward, the run button glows to remind you to refresh the list.</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-800 p-5 shadow-lg">
          <h3 className="mb-2 text-xl font-semibold">4. Optimizer</h3>

          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            <li>Use this when you want bigger build changes instead of one quick upgrade.</li>
            <li>Choose one objective when you want the app to focus on one goal, like pure Efficiency or pure Luck.</li>
            <li>Choose a Secondary Objective when you want a hybrid build, such as Luck + Size Boost or Modifier Efficiency + Modifier Boost.</li>
            <li>For farming hybrids, the selected objectives define the build style, then Efficiency helps rank the best practical versions of that style.</li>
            <li>Walk Speed and Jump Power are treated as movement meme-build goals and can pair with each other.</li>
            <li>Add Desired Min/Max Stats when the result must stay above or below a specific number.</li>
            <li>Click Run Optimizer to generate results. The button glows when your inputs changed since the last run.</li>
            <li>Use Load Build only when you want the recommended build to become your current calculator build.</li>
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-800 p-5 shadow-lg lg:col-span-2">
          <h3 className="mb-2 text-xl font-semibold">5. Optimizer Settings</h3>

          <ul className="space-y-2 text-sm leading-6 text-slate-300">
            <li>Use Fast when you want quick results.</li>
            <li>Use Balanced for normal testing.</li>
            <li>Use Exhaustive when you want deeper searching and do not mind waiting longer.</li>
            <li>Keep auto-run off while testing lots of changes. Manual runs are easier to control.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/50 p-5 text-sm leading-6 text-indigo-100">
        <strong>Simple workflow:</strong> Calculator first, then Efficiency
        Breakdown if you want to understand the numbers, then Upgrade Advisor
        for quick ideas, then Optimizer for bigger build searches. Use one
        objective for a focused build, or add a secondary objective when you
        want hybrid recommendations.
      </div>
    </section>
  );
}
