import { Link, useParams } from "react-router-dom";

const demoPrediction = {
  totals: {
    adults: 120,
    kids: 45,
    estimatedFoodWeightKg: 142,
    expectedWasteKg: 8,
  },
  menu: [
    { item: "Veg Starters", qty: "18 kg" },
    { item: "Biryani", qty: "36 kg" },
    { item: "Paneer Curry", qty: "24 kg" },
    { item: "Dessert", qty: "14 kg" },
  ],
  suggestions: [
    "Lock orders 48h in advance to reduce vendor buffer.",
    "Add donation pickup slot 30m post event close.",
  ],
};

function Predictions() {
  const { eventId } = useParams();
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Prediction overview
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Estimated food plan for event{" "}
            <span className="font-semibold text-brand-600">{eventId}</span>.
          </p>
        </div>
        <Link
          to={`/events/${eventId}/guests`}
          className="rounded-full border border-brand-200 px-5 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          Manage guest list
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="space-y-6 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/70">
          <h2 className="text-lg font-semibold text-slate-900">
            Recommended quantities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-sm font-medium text-slate-500">Adults</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {demoPrediction.totals.adults}
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-sm font-medium text-slate-500">Kids</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {demoPrediction.totals.kids}
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Total food required
              </p>
              <p className="mt-2 text-2xl font-semibold text-brand-700">
                {demoPrediction.totals.estimatedFoodWeightKg} kg
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-sm font-medium text-slate-500">
                Anticipated buffer
              </p>
              <p className="mt-2 text-2xl font-semibold text-brand-500">
                {demoPrediction.totals.expectedWasteKg} kg
              </p>
            </div>
          </div>

          <table className="min-w-full divide-y divide-orange-100 text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-brand-700">
              <tr>
                <th className="px-4 py-2">Menu item</th>
                <th className="px-4 py-2">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-100 text-slate-700">
              {demoPrediction.menu.map((entry) => (
                <tr key={entry.item} className="hover:bg-brand-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {entry.item}
                  </td>
                  <td className="px-4 py-3 text-brand-600">{entry.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <aside className="space-y-4 rounded-2xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/70">
          <h2 className="text-lg font-semibold text-slate-900">
            Optimization tips
          </h2>
          <ul className="space-y-3 text-sm text-slate-600">
            {demoPrediction.suggestions.map((suggestion) => (
              <li
                key={suggestion}
                className="rounded-xl border border-brand-100 bg-brand-50/80 p-3"
              >
                {suggestion}
              </li>
            ))}
          </ul>
          <button className="w-full rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-600">
            Export report
          </button>
        </aside>
      </section>
    </section>
  );
}

export default Predictions;

