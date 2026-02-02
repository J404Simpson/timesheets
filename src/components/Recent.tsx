import React, { useEffect, useState } from "react";
import { getWeekEntries, WeekEntry } from "../api/timesheet";

type Props = {
  onSelectDate?: (date: string, hour?: number) => void;
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

  const isHourOccupied = (date: Date, hour: number): boolean => {
    const dateStr = date.toISOString().split("T")[0];
    return entries.some((entry) => {
      if (!entry.date.startsWith(dateStr)) return false;
      const startHour = parseInt(entry.start_time.split(":")[0], 10);
      const endHour = parseInt(entry.end_time.split(":")[0], 10);
      return hour >= startHour && hour < endHour;
    });
  };

  const canSelectHour = (date: Date, hour: number): boolean => {
    // Cannot select future date/time
    const targetDateTime = new Date(date);
    targetDateTime.setHours(hour, 0, 0, 0);
    return targetDateTime <= now;
  };

  const handleHourClick = (date: Date, hour: number) => {
    if (!canSelectHour(date, hour)) return;
    const dateStr = date.toISOString().split("T")[0];
    onSelectDate?.(dateStr, hour);
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
      <div className="week-calendar">
        {weekDays.map((day) => {
          const dayEntries = getEntriesForDate(day);
          const isToday = day.toDateString() === now.toDateString();
          const dateStr = day.toISOString().split("T")[0];
          const isPastDay = day.toDateString() < now.toDateString();

          return (
            <div
              key={day.toISOString()}
              className={`week-day ${isToday ? "today" : ""}`}
            >
              <div className="week-day-header">
                <div className="week-day-name">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="week-day-date">
                  {day.getDate()}
                </div>
              </div>
              <div className="week-day-hours-grid">
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i;
                  const isOccupied = isHourOccupied(day, hour);
                  const isFuture = !canSelectHour(day, hour);
                  const formattedHour = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;

                  return (
                    <button
                      key={`${dateStr}-${hour}`}
                      className={`hour-block ${isOccupied ? "occupied" : ""} ${isFuture ? "future" : ""} ${!isFuture && !isOccupied ? "available" : ""}`}
                      onClick={() => handleHourClick(day, hour)}
                      disabled={isFuture || isOccupied}
                      title={isFuture ? "Cannot select future time" : isOccupied ? "Time slot occupied" : `Click to add entry for ${formattedHour}`}
                    >
                      <span className="hour-label">{hour}:00</span>
                    </button>
                  );
                })}
              </div>
              {dayEntries.length > 0 && (
                <div className="week-day-summary">
                  <div className="summary-title muted">Entries</div>
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="entry-item-compact">
                      <div className="entry-time-compact">
                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      </div>
                      {entry.project && <div className="entry-project-compact">{entry.project.name}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}