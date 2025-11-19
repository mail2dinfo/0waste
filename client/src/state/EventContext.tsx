import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";

interface EventContextValue {
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export function EventProvider({ children }: PropsWithChildren) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      selectedEventId,
      setSelectedEventId,
    }),
    [selectedEventId]
  );

  return (
    <EventContext.Provider value={value}>{children}</EventContext.Provider>
  );
}

export function useEventContext() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
}











