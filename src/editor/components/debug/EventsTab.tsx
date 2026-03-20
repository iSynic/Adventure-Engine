import { useState, useRef, useEffect } from "react";
import type { Engine } from "../../../engine/core/Engine";
import type { DebugEvent, DebugEventCategory } from "../../../engine/debug/DebugEventLog";

const EVENT_CATEGORIES: DebugEventCategory[] = ["verb", "script", "room", "flag", "variable", "inventory", "dialogue", "event"];

export function EventsTab({
  engine,
  events,
}: {
  engine: Engine;
  events: DebugEvent[];
}) {
  const [eventFilter, setEventFilter] = useState<Set<DebugEventCategory>>(new Set(EVENT_CATEGORIES));
  const eventLogRef = useRef<HTMLDivElement>(null);

  const filteredEvents = events.filter((e) => eventFilter.has(e.category));

  const toggleEventCategory = (cat: DebugEventCategory) => {
    setEventFilter((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="debug-events-panel">
      <div className="debug-event-filters">
        {EVENT_CATEGORIES.map((cat) => (
          <label key={cat} className="debug-event-filter-toggle">
            <input type="checkbox" checked={eventFilter.has(cat)} onChange={() => toggleEventCategory(cat)} />
            <span className={`debug-event-cat debug-event-cat-${cat}`}>{cat}</span>
          </label>
        ))}
        <button className="debug-event-clear" onClick={() => engine.debugEventLog.clear()}>Clear</button>
      </div>
      <div className="debug-event-log" ref={eventLogRef}>
        {filteredEvents.length === 0 && (
          <div className="debug-empty">No events recorded</div>
        )}
        {filteredEvents.map((evt) => {
          const time = new Date(evt.timestamp);
          const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}:${time.getSeconds().toString().padStart(2, "0")}.${time.getMilliseconds().toString().padStart(3, "0")}`;
          return (
            <div key={evt.id} className="debug-event-row">
              <span className="debug-event-time">{timeStr}</span>
              <span className={`debug-event-cat debug-event-cat-${evt.category}`}>{evt.category}</span>
              <span className="debug-event-msg">{evt.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
