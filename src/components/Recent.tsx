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

  // Calculate current week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
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

  const getEntriesForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return entries.filter((e) => e.date.startsWith(dateStr));
  };

  const isTimeSlotOccupied = (date: Date, hour: number, minute: number): boolean => {
    const dateStr = date.toISOString().split("T")[0];
    const slotMinutes = hour * 60 + minute;
    
    return entries.some((entry) => {
      if (!entry.date.startsWith(dateStr)) return false;
      const [startH, startM] = entry.start_time.split(":").map(Number);
      const [endH, endM] = entry.end_time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const canSelectTimeSlot = (date: Date, hour: number, minute: number): boolean => {
    // Cannot select future date/time
    const targetDateTime = new Date(date);
    targetDateTime.setHours(hour, minute, 0, 0);
    return targetDateTime <= now;
  };

  const handleTimeSlotClick = (date: Date, hour: number, minute: number) => {
    if (!canSelectTimeSlot(date, hour, minute)) return;
    const dateStr = date.toISOString().split("T")[0];
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
            const isToday = day.toDateString() === now.toDateString();
            return (
              <div key={day.toISOString()} className={`grid-header grid-day-header ${isToday ? "today" : ""}`}>
                <div className="grid-day-name">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="grid-day-date">
                  {day.getDate()}
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
                        const dateStr = day.toISOString().split("T")[0];
                        const isOccupied = isTimeSlotOccupied(day, hour, minute);
                        const isFuture = !canSelectTimeSlot(day, hour, minute);
                        const isToday = day.toDateString() === now.toDateString();

                        return (
                          <button
                            key={`${dateStr}-${hour}-${minute}`}
                            className={`grid-cell half ${isHalfDivider ? "half-divider" : ""} ${isOccupied ? "occupied" : ""} ${isFuture ? "future" : ""} ${!isFuture && !isOccupied ? "available" : ""} ${isToday ? "today-col" : ""}`}
                            onClick={() => handleTimeSlotClick(day, hour, minute)}
                            disabled={isFuture || isOccupied}
                            title={isFuture ? "Cannot select future time" : isOccupied ? "Time slot occupied" : `Click to add entry for ${timeLabel} on ${day.toLocaleDateString()}`}
                          />
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
                        {entry.project && <span className="entry-project-summary">{entry.project.name}</span>}
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
