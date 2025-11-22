import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for scrolling to event sections
  const paidEventsRef = useRef<HTMLDivElement>(null);
  const unpaidEventsRef = useRef<HTMLDivElement>(null);
  const inProgressEventsRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
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
  }, [api]);

  useEffect(() => {
    fetchData();

    // Listen for payment success events to refresh the dashboard
    const handlePaymentSuccess = () => {
      fetchData();
    };

    window.addEventListener("nowaste-payment-success", handlePaymentSuccess);

    // Also refresh when the page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("nowaste-payment-success", handlePaymentSuccess);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData]);

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

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    
    if (!window.confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/events/${eventId}`);
      // Refresh the dashboard after deletion
      fetchData();
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event. Please try again.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-slate-600">Overview of Zerovaste platform</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchData()}
            className="rounded-full bg-slate-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-slate-600"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <Link
            to="/admin/upi-settings"
            className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-brand-600"
          >
            Manage UPI Settings
          </Link>
        </div>
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
        <div 
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm cursor-pointer transition-all hover:bg-emerald-100 hover:shadow-md"
          onClick={() => scrollToSection(paidEventsRef)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              scrollToSection(paidEventsRef);
            }
          }}
        >
          <div className="text-sm font-medium text-emerald-700">Paid Events</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {data.stats.paidEvents}
          </div>
        </div>
        <div 
          className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm cursor-pointer transition-all hover:bg-orange-100 hover:shadow-md"
          onClick={() => scrollToSection(unpaidEventsRef)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              scrollToSection(unpaidEventsRef);
            }
          }}
        >
          <div className="text-sm font-medium text-orange-700">Unpaid Events</div>
          <div className="mt-2 text-3xl font-bold text-orange-700">
            {data.stats.unpaidEvents}
          </div>
        </div>
        <div 
          className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm cursor-pointer transition-all hover:bg-blue-100 hover:shadow-md"
          onClick={() => scrollToSection(inProgressEventsRef)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              scrollToSection(inProgressEventsRef);
            }
          }}
        >
          <div className="text-sm font-medium text-blue-700">Survey In Progress</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">
            {data.stats.eventsInProgress}
          </div>
        </div>
      </div>

      {/* Event Lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Paid Events */}
        <div ref={paidEventsRef} className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
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
                  className="group rounded-lg border border-emerald-100 bg-emerald-50 p-3 cursor-pointer transition-all hover:bg-emerald-100 hover:shadow-sm relative"
                  onClick={() => navigate(`/events/${event.id}/overview`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/events/${event.id}/overview`);
                    }
                  }}
                >
                  <button
                    onClick={(e) => handleDeleteEvent(event.id, event.title, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100 text-red-600"
                    title="Delete event"
                    aria-label="Delete event"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <div className="font-medium text-slate-900 pr-6">{event.title}</div>
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
        <div ref={unpaidEventsRef} className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
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
                  className="group rounded-lg border border-orange-100 bg-orange-50 p-3 cursor-pointer transition-all hover:bg-orange-100 hover:shadow-sm relative"
                  onClick={() => navigate(`/events/${event.id}/overview`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/events/${event.id}/overview`);
                    }
                  }}
                >
                  <button
                    onClick={(e) => handleDeleteEvent(event.id, event.title, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100 text-red-600"
                    title="Delete event"
                    aria-label="Delete event"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <div className="font-medium text-slate-900 pr-6">{event.title}</div>
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
        <div ref={inProgressEventsRef} className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
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
                  className="group rounded-lg border border-blue-100 bg-blue-50 p-3 cursor-pointer transition-all hover:bg-blue-100 hover:shadow-sm relative"
                  onClick={() => navigate(`/events/${event.id}/overview`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/events/${event.id}/overview`);
                    }
                  }}
                >
                  <button
                    onClick={(e) => handleDeleteEvent(event.id, event.title, e)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100 text-red-600"
                    title="Delete event"
                    aria-label="Delete event"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <div className="font-medium text-slate-900 pr-6">{event.title}</div>
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

