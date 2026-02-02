import React, { useEffect, useState } from "react";
import { getWeekEntries, WeekEntry } from "../api/timesheet";

type Props = {
  onSelectDate?: (date: string) => void;
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

          return (
            <div
              key={day.toISOString()}
              className={`week-day ${isToday ? "today" : ""}`}
              onClick={() => onSelectDate?.(dateStr)}
              style={{ cursor: onSelectDate ? "pointer" : "default" }}
            >
              <div className="week-day-header">
                <div className="week-day-name">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="week-day-date">
                  {day.getDate()}
                </div>
              </div>
              <div className="week-day-entries">
                {dayEntries.length === 0 ? (
                  <div className="no-entries muted">No entries</div>
                ) : (
                  dayEntries.map((entry) => (
                    <div key={entry.id} className="entry-item">
                      <div className="entry-time">
                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      </div>
                      <div className="entry-details">
                        {entry.project && <div className="entry-project">{entry.project.name}</div>}
                        {entry.project_phase?.phase && (
                          <div className="entry-phase muted">{entry.project_phase.phase.name}</div>
                        )}
                        {entry.task && <div className="entry-task muted">{entry.task.name}</div>}
                      </div>
                      <div className="entry-hours muted">{Number(entry.hours)} hrs</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}