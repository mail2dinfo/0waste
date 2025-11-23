import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useTranslation } from "react-i18next";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getWebSocketUrl() {
  const apiUrl = API_BASE_URL.replace(/\/api$/, "");
  if (apiUrl.startsWith("https://")) {
    return `wss://${apiUrl.replace(/^https:\/\//, "")}/chat`;
  } else if (apiUrl.startsWith("http://")) {
    return `ws://${apiUrl.replace(/^http:\/\//, "")}/chat`;
  }
  if (apiUrl.includes("onrender.com") || apiUrl.includes("zerovaste.com")) {
    return `wss://${apiUrl}/chat`;
  }
  return `ws://${apiUrl}/chat`;
}

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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  
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

  // WebSocket connection for tracking online users
  useEffect(() => {
    const userId = window.localStorage.getItem("nowasteUserId");
    currentUserIdRef.current = userId;

    if (!userId) return;

    const wsUrl = `${getWebSocketUrl()}?userId=${userId}`;
    console.log("[AdminDashboard] Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[AdminDashboard] WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "rooms") {
          // Track which users are online based on active rooms
          const onlineSet = new Set<string>();
          if (data.rooms && Array.isArray(data.rooms)) {
            data.rooms.forEach((room: any) => {
              if (room.roomId) {
                onlineSet.add(room.roomId);
              }
            });
          }
          setOnlineUsers(onlineSet);
        } else if (data.type === "room_update") {
          // User came online or sent a message
          if (data.room?.roomId) {
            setOnlineUsers((prev) => new Set([...prev, data.room.roomId]));
          }
        } else if (data.type === "message") {
          // User sent a message, they're online
          if (data.roomId) {
            setOnlineUsers((prev) => new Set([...prev, data.roomId]));
          }
        } else if (data.type === "online_users") {
          // Initial list of online users
          if (data.userIds && Array.isArray(data.userIds)) {
            setOnlineUsers(new Set(data.userIds));
          }
        } else if (data.type === "user_status") {
          // User came online or went offline
          if (data.userId) {
            setOnlineUsers((prev) => {
              const newSet = new Set(prev);
              if (data.isOnline) {
                newSet.add(data.userId);
              } else {
                newSet.delete(data.userId);
              }
              return newSet;
            });
          }
        }
      } catch (error) {
        console.error("[AdminDashboard] Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[AdminDashboard] WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("[AdminDashboard] WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, []);

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

  const handleUserChatClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event navigation
    navigate(`/admin/chat/${userId}`);
  };

  const isUserOnline = (userId: string | null) => {
    return userId ? onlineUsers.has(userId) : false;
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
            to="/admin/chat"
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow hover:bg-emerald-600 flex items-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat Support
          </Link>
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
                    <div className="mt-1 flex items-center gap-2">
                      <div className="text-xs text-slate-500 flex-1">
                        <button
                          onClick={(e) => handleUserChatClick(event.owner!.id, e)}
                          className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                          title="Chat with user"
                        >
                          {event.owner.fullName}
                          {isUserOnline(event.owner.id) && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Online"></span>
                              <span className="text-[10px] text-emerald-600">Online</span>
                            </span>
                          )}
                        </button>
                        <div className="text-slate-400">
                          {event.owner.phoneNumber || event.owner.email}
                        </div>
                      </div>
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
                    <div className="mt-1 flex items-center gap-2">
                      <div className="text-xs text-slate-500 flex-1">
                        <button
                          onClick={(e) => handleUserChatClick(event.owner!.id, e)}
                          className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                          title="Chat with user"
                        >
                          {event.owner.fullName}
                          {isUserOnline(event.owner.id) && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Online"></span>
                              <span className="text-[10px] text-emerald-600">Online</span>
                            </span>
                          )}
                        </button>
                        <div className="text-slate-400">
                          {event.owner.phoneNumber || event.owner.email}
                        </div>
                      </div>
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
                    <div className="mt-1 flex items-center gap-2">
                      <div className="text-xs text-slate-500 flex-1">
                        <button
                          onClick={(e) => handleUserChatClick(event.owner!.id, e)}
                          className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                          title="Chat with user"
                        >
                          {event.owner.fullName}
                          {isUserOnline(event.owner.id) && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Online"></span>
                              <span className="text-[10px] text-emerald-600">Online</span>
                            </span>
                          )}
                        </button>
                        <div className="text-slate-400">
                          {event.owner.phoneNumber || event.owner.email}
                        </div>
                      </div>
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

