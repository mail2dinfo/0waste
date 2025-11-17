import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useTranslation } from "react-i18next";

type AdminStats = {
  totalUsers: number;
  totalEvents: number;
  paidEvents: number;
  unpaidEvents: number;
  eventsInProgress: number;
};

type EventOwner = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
};

type EventListItem = {
  id: string;
  title: string;
  eventDate: string | null;
  location: string | null;
  status: string;
  reportStatus: string;
  owner: EventOwner | null;
  createdAt: string;
  updatedAt: string;
};

type AdminDashboardData = {
  stats: AdminStats;
  events: {
    paidEvents: EventListItem[];
    unpaidEvents: EventListItem[];
    inProgressEvents: EventListItem[];
  };
};

function AdminDashboard() {
  const api = useApi();
  const { t } = useTranslation("common");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<AdminDashboardData>("/admin/dashboard");
        setData(response.data);
      } catch (err) {
        console.error("Failed to fetch admin dashboard:", err);
        setError("Failed to load admin dashboard. Please refresh.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [api]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-slate-600">Overview of Zerovaste platform</p>
        </div>
        <Link
          to="/admin/upi-settings"
          className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-600"
        >
          Manage UPI Settings
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-600">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {data.stats.totalUsers}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-600">Total Events</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">
            {data.stats.totalEvents}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="text-sm font-medium text-emerald-700">Paid Events</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {data.stats.paidEvents}
          </div>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
          <div className="text-sm font-medium text-orange-700">Unpaid Events</div>
          <div className="mt-2 text-3xl font-bold text-orange-700">
            {data.stats.unpaidEvents}
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="text-sm font-medium text-blue-700">Survey In Progress</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">
            {data.stats.eventsInProgress}
          </div>
        </div>
      </div>

      {/* Event Lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Paid Events */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Paid Events ({data.events.paidEvents.length})
          </h2>
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {data.events.paidEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No paid events</p>
            ) : (
              data.events.paidEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 p-3"
                >
                  <div className="font-medium text-slate-900">{event.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {formatDate(event.eventDate)} • {event.location || "N/A"}
                  </div>
                  {event.owner && (
                    <div className="mt-1 text-xs text-slate-500">
                      {event.owner.fullName} • {event.owner.phoneNumber || event.owner.email}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unpaid Events */}
        <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Unpaid Events ({data.events.unpaidEvents.length})
          </h2>
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {data.events.unpaidEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No unpaid events</p>
            ) : (
              data.events.unpaidEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-orange-100 bg-orange-50 p-3"
                >
                  <div className="font-medium text-slate-900">{event.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {formatDate(event.eventDate)} • {event.location || "N/A"}
                  </div>
                  {event.owner && (
                    <div className="mt-1 text-xs text-slate-500">
                      {event.owner.fullName} • {event.owner.phoneNumber || event.owner.email}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Survey In Progress */}
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Survey In Progress ({data.events.inProgressEvents.length})
          </h2>
          <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
            {data.events.inProgressEvents.length === 0 ? (
              <p className="text-sm text-slate-500">No events in progress</p>
            ) : (
              data.events.inProgressEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-blue-100 bg-blue-50 p-3"
                >
                  <div className="font-medium text-slate-900">{event.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {formatDate(event.eventDate)} • {event.location || "N/A"}
                  </div>
                  {event.owner && (
                    <div className="mt-1 text-xs text-slate-500">
                      {event.owner.fullName} • {event.owner.phoneNumber || event.owner.email}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

