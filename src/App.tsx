export default function App() {
  return (
    <main className="min-h-screen p-6 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
          Prospecting Efficiency Calculator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              Equipment Selection
            </h2>

            <p className="text-slate-300">
              Equipment dropdowns and selectors will be added here.
            </p>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              Efficiency Results
            </h2>

            <p className="text-slate-300">
              Final stats and efficiency calculations will appear here.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
