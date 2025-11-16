interface StatCardProps {
  title: string;
  value: string;
  helper: string;
}

function StatCard({ title, value, helper }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm shadow-orange-100/80">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600">
        {title}
      </h2>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

export default StatCard;

