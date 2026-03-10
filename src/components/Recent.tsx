import { useEffect, useState, Fragment } from "react";
import { getWeekEntries, type WeekEntry } from "../api/timesheet";

type Props = {
  onSelectDate?: (
    date: string,
    hour?: number,
    minute?: number,
    endHour?: number,
    endMinute?: number
  ) => void;
};

type TimeRangeSelection = {
  dateKey: string;
  startSlot: number;
  endSlot: number;
};

type DragState = {
  dateKey: string;
  startSlot: number;
  currentSlot: number;
  active: boolean;
};

export default function Recent({ onSelectDate }: Props): JSX.Element {
  const [entries, setEntries] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selection, setSelection] = useState<TimeRangeSelection | null>(null);
  const [justFinishedSelectionAt, setJustFinishedSelectionAt] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    getWeekEntries()
      .then(setEntries)
      .catch(() => setError("Failed to load entries"))
      .finally(() => setLoading(false));
  }, []);

  // Calculate current week (Monday to Sunday) in local time
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

  const toDateKeyLocal = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getEntryDateKey = (value: string) => value.split("T")[0];

  const getEntriesForDate = (date: Date) => {
    const dateStr = toDateKeyLocal(date);
    return entries.filter((e) => getEntryDateKey(e.date) === dateStr);
  };

  const getTimeParts = (value: string): [number, number] => {
    const timePart = value.includes("T") ? value.split("T")[1] : value;
    const [h, m] = timePart.split(":").map((part) => parseInt(part, 10));
    return [h || 0, m || 0];
  };

  const isTimeSlotOccupied = (date: Date, hour: number, minute: number): boolean => {
    const dateStr = toDateKeyLocal(date);
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
    const dateStr = toDateKeyLocal(date);
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
    const targetDateTime = new Date(date);
    targetDateTime.setHours(hour, minute, 0, 0);
    return targetDateTime <= now;
  };

  const toSlotIndex = (hour: number, minute: number) => hour * 4 + Math.floor(minute / 15);

  const slotToHourMinute = (slot: number): [number, number] => {
    const normalized = Math.max(0, Math.min(95, slot));
    return [Math.floor(normalized / 4), (normalized % 4) * 15];
  };

  const isSlotSelectable = (date: Date, hour: number, minute: number) => {
    // Avoid selecting the last quarter-hour of the day because end-time options
    // in New Entry cannot represent 24:00.
    if (hour === 23 && minute === 45) return false;
    return canSelectTimeSlot(date, hour, minute) && !isTimeSlotOccupied(date, hour, minute);
  };

  const isRangeSelectable = (date: Date, startSlot: number, endSlot: number) => {
    const min = Math.min(startSlot, endSlot);
    const max = Math.max(startSlot, endSlot);
    for (let slot = min; slot <= max; slot++) {
      const [hour, minute] = slotToHourMinute(slot);
      if (!isSlotSelectable(date, hour, minute)) {
        return false;
      }
    }
    return true;
  };

  const isCellInSelection = (date: Date, slot: number) => {
    if (!selection) return false;
    const dateKey = toDateKeyLocal(date);
    if (dateKey !== selection.dateKey) return false;
    return slot >= selection.startSlot && slot <= selection.endSlot;
  };

  const handleSlotMouseDown = (date: Date, hour: number, minute: number) => {
    if (!isSlotSelectable(date, hour, minute)) return;
    const dateKey = toDateKeyLocal(date);
    const slot = toSlotIndex(hour, minute);
    setDragState({ dateKey, startSlot: slot, currentSlot: slot, active: true });
    setSelection(null);
  };

  const handleSlotMouseEnter = (date: Date, hour: number, minute: number) => {
    if (!dragState?.active) return;
    const dateKey = toDateKeyLocal(date);
    if (dateKey !== dragState.dateKey) return;
    const slot = toSlotIndex(hour, minute);
    const [startHour, startMinute] = slotToHourMinute(dragState.startSlot);
    const dragDate = new Date(date);
    if (!isRangeSelectable(dragDate, dragState.startSlot, slot)) {
      if (!isSlotSelectable(dragDate, startHour, startMinute)) {
        setDragState(null);
      }
      return;
    }
    setDragState((prev) => (prev ? { ...prev, currentSlot: slot } : prev));
  };

  const handleSlotMouseUp = () => {
    if (!dragState?.active) return;
    const startSlot = Math.min(dragState.startSlot, dragState.currentSlot);
    const endSlot = Math.max(dragState.startSlot, dragState.currentSlot);
    setSelection({ dateKey: dragState.dateKey, startSlot, endSlot });
    setDragState(null);
    setJustFinishedSelectionAt(Date.now());
  };

  useEffect(() => {
    if (!dragState?.active) return;
    const onWindowMouseUp = () => {
      handleSlotMouseUp();
    };
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [dragState]);

  const handleTimeSlotClick = (date: Date, hour: number, minute: number) => {
    const nowTs = Date.now();
    if (nowTs - justFinishedSelectionAt < 250) return;

    const slot = toSlotIndex(hour, minute);
    const dateKey = toDateKeyLocal(date);
    
    // If clicking on a selected range, create entry with that range
    if (isCellInSelection(date, slot) && selection) {
      const [startHour, startMinute] = slotToHourMinute(selection.startSlot);
      const endSlotExclusive = Math.min(96, selection.endSlot + 1);
      const [endHour, endMinute] = endSlotExclusive === 96 ? [23, 45] : slotToHourMinute(endSlotExclusive);
      onSelectDate?.(selection.dateKey, startHour, startMinute, endHour, endMinute);
      setSelection(null);
      return;
    }
    
    // Otherwise, create entry starting at this time slot
    if (isSlotSelectable(date, hour, minute)) {
      onSelectDate?.(dateKey, hour, minute);
      setSelection(null);
    }
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
            const isToday = toDateKeyLocal(day) === toDateKeyLocal(now);
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
                <div className="grid-time-cell span-4">
                  <span className="time-label">{hourLabel}</span>
                </div>

                {/* Four quarter-hour rows per hour */}
                {Array.from({ length: 4 }, (_, quarter) => {
                  const minute = quarter * 15;
                  const timeLabel = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                  const isHourDivider = minute === 45;

                  return (
                    <Fragment key={`hour-${hour}-q-${quarter}`}>
                      {weekDays.map((day) => {
                        const dateStr = toDateKeyLocal(day);
                        const isOccupied = isTimeSlotOccupied(day, hour, minute);
                        const isFuture = !canSelectTimeSlot(day, hour, minute);
                        const isToday = toDateKeyLocal(day) === toDateKeyLocal(now);
                        const entry = getEntryForTimeSlot(day, hour, minute);
                        const slot = toSlotIndex(hour, minute);
                        const isSelected = isCellInSelection(day, slot);

                        return (
                          <button
                            key={`${dateStr}-${hour}-${minute}`}
                            className={`grid-cell quarter ${isHourDivider ? "hour-divider" : ""} ${isOccupied ? "occupied" : ""} ${isFuture ? "future" : ""} ${!isFuture && !isOccupied ? "available" : ""} ${isToday ? "today-col" : ""} ${isSelected ? "selected-range" : ""}`}
                            onMouseDown={() => handleSlotMouseDown(day, hour, minute)}
                            onMouseEnter={() => handleSlotMouseEnter(day, hour, minute)}
                            onMouseUp={handleSlotMouseUp}
                            onClick={() => handleTimeSlotClick(day, hour, minute)}
                            disabled={isFuture || isOccupied}
                            title={
                              isFuture
                                ? "Cannot select future time"
                                : isOccupied
                                  ? "Time slot occupied"
                                  : isSelected
                                    ? "Click highlighted range to create entry"
                                    : `Click and drag to select time range from ${timeLabel}`
                            }
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
