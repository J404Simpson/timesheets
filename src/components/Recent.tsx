import { useEffect, useState, Fragment } from "react";
import { getWeekEntries, type WeekEntry } from "../api/timesheet";

type Props = {
  onSelectDate?: (date: string, hour?: number, minute?: number) => void;
};

export default function Recent({ onSelectDate }: Props): JSX.Element {
  const [entries, setEntries] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getWeekEntries()
      .then(setEntries)
      .catch(() => setError("Failed to load entries"))
      .finally(() => setLoading(false));
  }, []);

  // Calculate current week (Monday to Sunday) in UTC to align with entry dates
  const now = new Date();
  const nowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeekUtc = nowUtc.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = dayOfWeekUtc === 0 ? -6 : 1 - dayOfWeekUtc;
  const mondayUtc = new Date(nowUtc);
  mondayUtc.setUTCDate(nowUtc.getUTCDate() + diffToMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mondayUtc);
    day.setUTCDate(mondayUtc.getUTCDate() + i);
    return day;
  });

  const formatTime = (timeStr: string) => {
    // timeStr is ISO or HH:MM:SS format
    const match = timeStr.match(/(\d{2}):(\d{2})/);
    if (!match) return timeStr;
    const [, h, m] = match;
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  const toDateKeyUTC = (value: Date) => {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getEntryDateKey = (value: string) => value.split("T")[0];

  const getEntriesForDate = (date: Date) => {
    const dateStr = toDateKeyUTC(date);
    return entries.filter((e) => getEntryDateKey(e.date) === dateStr);
  };

  const getTimeParts = (value: string): [number, number] => {
    const timePart = value.includes("T") ? value.split("T")[1] : value;
    const [h, m] = timePart.split(":").map((part) => parseInt(part, 10));
    return [h || 0, m || 0];
  };

  const isTimeSlotOccupied = (date: Date, hour: number, minute: number): boolean => {
    const dateStr = toDateKeyUTC(date);
    const slotMinutes = hour * 60 + minute;
    
    return entries.some((entry) => {
      const entryDateStr = getEntryDateKey(entry.date);
      if (entryDateStr !== dateStr) return false;
      const [startH, startM] = getTimeParts(entry.start_time);
      const [endH, endM] = getTimeParts(entry.end_time);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const getEntryForTimeSlot = (date: Date, hour: number, minute: number): WeekEntry | undefined => {
    const dateStr = toDateKeyUTC(date);
    const slotMinutes = hour * 60 + minute;

    return entries.find((entry) => {
      const entryDateStr = getEntryDateKey(entry.date);
      if (entryDateStr !== dateStr) return false;
      const [startH, startM] = getTimeParts(entry.start_time);
      const [endH, endM] = getTimeParts(entry.end_time);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return slotMinutes === startMinutes;
    });
  };

  const canSelectTimeSlot = (date: Date, hour: number, minute: number): boolean => {
    // Cannot select future date/time (compare in UTC)
    const targetDateTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute, 0, 0));
    return targetDateTime <= now;
  };

  const handleTimeSlotClick = (date: Date, hour: number, minute: number) => {
    if (!canSelectTimeSlot(date, hour, minute)) return;
    const dateStr = toDateKeyUTC(date);
    onSelectDate?.(dateStr, hour, minute);
  };

  if (loading) {
    return (
      <section className="recent-activity">
        <h3>Recent</h3>
        <p className="muted">Loading...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="recent-activity">
        <h3>Recent</h3>
        <p className="muted">{error}</p>
      </section>
    );
  }

  return (
    <section className="recent-activity">
      <h3>This Week</h3>
      <div className="week-grid-container">
        <div className="week-grid">
          {/* Header row with days */}
          <div className="grid-header grid-time-label">Time</div>
          {weekDays.map((day) => {
            const isToday = toDateKeyUTC(day) === toDateKeyUTC(now);
            return (
              <div key={day.toISOString()} className={`grid-header grid-day-header ${isToday ? "today" : ""}`}>
                <div className="grid-day-name">
                  {day.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                </div>
                <div className="grid-day-date">
                  {day.getUTCDate()}
                </div>
              </div>
            );
          })}

          {/* Time slots rows */}
          {Array.from({ length: 24 }, (_, hour) => {
            const hourLabel = `${hour.toString().padStart(2, "0")}:00`;

            return (
              <Fragment key={`hour-${hour}`}>
                {/* Time label spans the full hour */}
                <div className="grid-time-cell span-2">
                  <span className="time-label">{hourLabel}</span>
                </div>

                {/* Two half-hour rows per hour */}
                {Array.from({ length: 2 }, (_, half) => {
                  const minute = half * 30;
                  const timeLabel = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                  const isHalfDivider = minute === 30;

                  return (
                    <Fragment key={`hour-${hour}-h-${half}`}>
                      {weekDays.map((day) => {
                        const dateStr = toDateKeyUTC(day);
                        const isOccupied = isTimeSlotOccupied(day, hour, minute);
                        const isFuture = !canSelectTimeSlot(day, hour, minute);
                        const isToday = toDateKeyUTC(day) === toDateKeyUTC(now);
                        const entry = getEntryForTimeSlot(day, hour, minute);

                        return (
                          <button
                            key={`${dateStr}-${hour}-${minute}`}
                            className={`grid-cell half ${isHalfDivider ? "half-divider" : ""} ${isOccupied ? "occupied" : ""} ${isFuture ? "future" : ""} ${!isFuture && !isOccupied ? "available" : ""} ${isToday ? "today-col" : ""}`}
                            onClick={() => handleTimeSlotClick(day, hour, minute)}
                            disabled={isFuture || isOccupied}
                            title={isFuture ? "Cannot select future time" : isOccupied ? "Time slot occupied" : `Click to add entry for ${timeLabel} on ${day.toLocaleDateString()}`}
                            style={{ overflow: "hidden", whiteSpace: "normal", wordBreak: "break-word", padding: "2px" }}
                          >
                            {entry && (
                              <span className="entry-cell-content">
                                <div className="entry-cell-time" style={{ fontSize: "9px", fontWeight: "600" }}>{formatTime(entry.start_time)}</div>
                                {entry.project && <div className="entry-cell-project" style={{ fontSize: "8px" }}>{entry.project.name}</div>}
                                <div className="entry-cell-hours" style={{ fontSize: "8px", fontWeight: "500" }}>{Number(entry.hours)}h</div>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </div>

        {/* Entries summary below grid */}
        {entries.length > 0 && (
          <div className="week-entries-summary">
            <h4>This Week's Entries</h4>
            <div className="entries-by-day">
              {weekDays.map((day) => {
                const dayEntries = getEntriesForDate(day);
                if (dayEntries.length === 0) return null;
                
                return (
                  <div key={day.toISOString()} className="day-entries">
                    <div className="day-entries-header">
                      {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="entry-summary">
                        <span className="entry-time-summary">
                          {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                        </span>
                        {entry.project != null && <span className="entry-project-summary">{entry.project.name}</span>}
                        <span className="entry-hours-summary">{Number(entry.hours)}h</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
