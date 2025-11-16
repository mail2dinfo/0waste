import { Link, useParams } from "react-router-dom";

const sampleGuests = [
  {
    name: "Anita Sharma",
    status: "Yes",
    adults: 2,
    kids: 0,
    notes: "No onions",
  },
  {
    name: "Rahul & Priya",
    status: "Maybe",
    adults: 2,
    kids: 1,
    notes: "Arrive post 8pm",
  },
  {
    name: "Mahesh Kumar",
    status: "No",
    adults: 1,
    kids: 0,
    notes: "",
  },
];

function Guests() {
  const { eventId } = useParams();

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Guest responses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            RSVP breakdown for event{" "}
            <span className="font-semibold text-brand-600">{eventId}</span>.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">
            Upload CSV
          </button>
          <button className="rounded-full border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">
            Copy invite link
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            112 confirmed • 24 maybe • 36 declined
          </p>
          <Link
            to={`/events/${eventId}`}
            className="text-xs font-semibold uppercase tracking-wide text-brand-600 hover:text-brand-700"
          >
            View prediction
          </Link>
        </div>
        <table className="mt-4 min-w-full divide-y divide-orange-100 text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-2">Guest</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Adults</th>
              <th className="px-4 py-2">Kids</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-100 text-slate-700">
            {sampleGuests.map((guest) => (
              <tr key={guest.name} className="hover:bg-brand-50/60">
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {guest.name}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                    {guest.status}
                  </span>
                </td>
                <td className="px-4 py-3">{guest.adults}</td>
                <td className="px-4 py-3">{guest.kids}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {guest.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Guests;

