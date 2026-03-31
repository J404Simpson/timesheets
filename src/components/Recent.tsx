import { useEffect, useState, Fragment } from "react";
import { getWeekEntries, type WeekEntry } from "../api/timesheet";

type Props = {
  onCreateEntry?: () => void;
  onSelectDate?: (
    date: string,
    hour?: number,
    minute?: number,
    endHour?: number,
    endMinute?: number
  ) => void;
  onEditEntry?: (entry: WeekEntry) => void;
  onGoAdmin?: () => void;
  employeeId?: number;
  showCreateButton?: boolean;
  showAdminButton?: boolean;
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

export default function Recent({
  onCreateEntry,
  onSelectDate,
  onEditEntry,
  onGoAdmin,
  employeeId,
  showCreateButton = true,
  showAdminButton = false,
}: Props): JSX.Element {
  const [entries, setEntries] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selection, setSelection] = useState<TimeRangeSelection | null>(null);
  const [justFinishedSelectionAt, setJustFinishedSelectionAt] = useState<number>(0);
  // 0 = this week, -1 = last week
  const [weekOffset, setWeekOffset] = useState(0);

  const toDateKeyLocal = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    setLoading(true);
    setSelection(null);
    let weekOf: string | undefined;
    if (weekOffset !== 0) {
      const ref = new Date();
      ref.setDate(ref.getDate() + weekOffset * 7);
      weekOf = toDateKeyLocal(ref);
    }
    getWeekEntries(weekOf, employeeId)
      .then(setEntries)
      .catch(() => setError("Failed to load entries"))
      .finally(() => setLoading(false));
  }, [weekOffset, employeeId]);

  // Calculate the reference week's Monday in local time
  const now = new Date();
  const referenceDate = new Date(now);
  referenceDate.setDate(now.getDate() + weekOffset * 7);
  const dayOfWeek = referenceDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });

  const getEntryDateKey = (value: string) => value.split("T")[0];

  const getEntryDisplay = (entry: WeekEntry) => {
    const projectName = entry.project?.name?.trim() ?? "";
    const projectNameLower = projectName.toLowerCase();
    const taskName = entry.task?.name?.trim() ?? "";
    const hoursText = `${Number(entry.hours)}h`;

    if (projectNameLower === "leave") {
      return {
        title: projectName || "Leave",
        subtitle: "",
        hours: "",
      };
    }

    if (projectNameLower === "sustaining") {
      return {
        title: projectName || "Sustaining",
        subtitle: taskName,
        hours: hoursText,
      };
    }

    return {
      title: projectName,
      subtitle: taskName,
      hours: hoursText,
    };
  };

  const getVisibleEntryDisplay = (entry: WeekEntry, rowSpan: number) => {
    const display = getEntryDisplay(entry);
    const isLeave = (entry.project?.name ?? "").trim().toLowerCase() === "leave";

    // Leave is always title-only per requirement.
    if (isLeave) {
      return { title: display.title, subtitle: "", hours: "" };
    }

    // Adapt content to available height.
    // 15 min (rowSpan=1): title only
    // 30-45 min (rowSpan 2-3): title + hours
    // 60+ min (rowSpan>=4): title + subtitle + hours
    if (rowSpan <= 1) {
      return { title: display.title, subtitle: "", hours: "" };
    }

    if (rowSpan <= 3) {
      return { title: display.title, subtitle: "", hours: display.hours };
    }

    return display;
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
    if (!onSelectDate) return;
    if (!isSlotSelectable(date, hour, minute)) return;
    const dateKey = toDateKeyLocal(date);
    const slot = toSlotIndex(hour, minute);

    // If a range is already selected and user clicks within it,
    // keep the existing selection so click can create the full-range entry.
    if (
      selection &&
      selection.dateKey === dateKey &&
      slot >= selection.startSlot &&
      slot <= selection.endSlot
    ) {
      return;
    }

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
    
    // If no drag occurred (start and current are the same), treat as a click
    if (dragState.startSlot === dragState.currentSlot) {
      const [hour, minute] = slotToHourMinute(dragState.startSlot);
      onSelectDate?.(dragState.dateKey, hour, minute);
      setDragState(null);
      return;
    }
    
    // Otherwise, create a selection for the dragged range
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
    if (!onSelectDate) return;
    const slot = toSlotIndex(hour, minute);
    const dateKey = toDateKeyLocal(date);
    
    // If clicking on a selected range, create entry with that range
    if (isCellInSelection(date, slot) && selection) {
      const nowTs = Date.now();
      // Allow immediate click on selection, but prevent accidental double-trigger
      if (nowTs - justFinishedSelectionAt < 100) return;
      
      const [startHour, startMinute] = slotToHourMinute(selection.startSlot);
      const endSlotExclusive = Math.min(96, selection.endSlot + 1);
      const [endHour, endMinute] = endSlotExclusive === 96 ? [23, 45] : slotToHourMinute(endSlotExclusive);
      onSelectDate?.(selection.dateKey, startHour, startMinute, endHour, endMinute);
      setSelection(null);
      return;
    }
    
    // Don't allow single-click shortly after finishing a drag
    const nowTs = Date.now();
    if (nowTs - justFinishedSelectionAt < 250) return;
    
    // Otherwise, create entry starting at this time slot
    if (isSlotSelectable(date, hour, minute)) {
      onSelectDate?.(dateKey, hour, minute);
      setSelection(null);
    }
  };

  const isLeaveEntry = (entry: WeekEntry) => {
    return (entry.project?.name ?? "").trim().toLowerCase() === "leave";
  };

  const getEntryTypeClass = (entry?: WeekEntry) => {
    if (!entry) return "";
    const projectNameLower = (entry.project?.name ?? "").trim().toLowerCase();
    if (projectNameLower === "leave") return "entry-leave";
    if (projectNameLower === "sustaining") return "entry-sustaining";
    return "entry-project";
  };

  const getCellClassName = (
    isHourDivider: boolean,
    isOccupied: boolean,
    isFuture: boolean,
    isToday: boolean,
    isSelected: boolean,
    entry?: WeekEntry
  ) => {
    return `grid-cell quarter ${isHourDivider ? "hour-divider" : ""} ${isOccupied ? "occupied" : ""} ${isFuture ? "future" : ""} ${!isFuture && !isOccupied ? "available" : ""} ${isToday ? "today-col" : ""} ${isSelected ? "selected-range" : ""} ${getEntryTypeClass(entry)}`;
  };

  const getCellTitle = (
    isFuture: boolean,
    isOccupied: boolean,
    isSelected: boolean,
    timeLabel: string,
    entry?: WeekEntry
  ) => {
    if (isFuture) return "Cannot select future time";
    if (entry) return isLeaveEntry(entry) ? "Leave entries cannot be edited" : "Click to edit entry";
    if (!onSelectDate) return "Only existing entries can be edited in this view";
    if (isOccupied) return "Time slot occupied";
    if (isSelected) return "Click highlighted range to create entry";
    return `Click and drag to select time range from ${timeLabel}`;
  };

  const getEntryCursor = (entry?: WeekEntry) => {
    if (!entry) return undefined;
    return isLeaveEntry(entry) ? "not-allowed" : "pointer";
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
                        const slot = toSlotIndex(hour, minute);
                        const slotMinutes = hour * 60 + minute;
                        
                        // Check if this slot is covered by a spanning entry that started earlier
                        const coveringEntry = entries.find((entry) => {
                          const entryDateStr = getEntryDateKey(entry.date);
                          if (entryDateStr !== dateStr) return false;
                          const [startH, startM] = getTimeParts(entry.start_time);
                          const [endH, endM] = getTimeParts(entry.end_time);
                          const startMinutes = startH * 60 + startM;
                          const endMinutes = endH * 60 + endM;
                          return slotMinutes > startMinutes && slotMinutes < endMinutes;
                        });

                        // Skip rendering if this slot is covered by a spanning entry
                        if (coveringEntry) {
                          return null;
                        }

                        const isOccupied = isTimeSlotOccupied(day, hour, minute);
                        const isFuture = !canSelectTimeSlot(day, hour, minute);
                        const isToday = toDateKeyLocal(day) === toDateKeyLocal(now);
                        const entry = getEntryForTimeSlot(day, hour, minute);
                        const isSelected = isCellInSelection(day, slot);

                        // Calculate span if this is the start of an entry
                        let rowSpan = 1;
                        if (entry) {
                          const [startH, startM] = getTimeParts(entry.start_time);
                          const [endH, endM] = getTimeParts(entry.end_time);
                          const startMinutes = startH * 60 + startM;
                          const endMinutes = endH * 60 + endM;
                          const durationMinutes = endMinutes - startMinutes;
                          rowSpan = Math.ceil(durationMinutes / 15);
                        }

                        return (
                          <button
                            key={`${dateStr}-${hour}-${minute}`}
                            className={getCellClassName(isHourDivider, isOccupied, isFuture, isToday, isSelected, entry)}
                            onMouseDown={() => handleSlotMouseDown(day, hour, minute)}
                            onMouseEnter={() => handleSlotMouseEnter(day, hour, minute)}
                            onMouseUp={handleSlotMouseUp}
                            onClick={() => {
                              if (entry) {
                                if (!isLeaveEntry(entry)) {
                                  onEditEntry?.(entry);
                                }
                                return;
                              }
                              handleTimeSlotClick(day, hour, minute);
                            }}
                            disabled={isFuture || (isOccupied && !entry)}
                            title={getCellTitle(isFuture, isOccupied, isSelected, timeLabel, entry)}
                            style={{ 
                              overflow: "hidden", 
                              whiteSpace: "normal", 
                              wordBreak: "break-word", 
                              padding: "2px",
                              gridRow: rowSpan > 1 ? `span ${rowSpan}` : undefined,
                              cursor: getEntryCursor(entry)
                            }}
                          >
                            {entry && (
                              (() => {
                                const display = getVisibleEntryDisplay(entry, rowSpan);
                                return (
                                  <span className="entry-cell-content">
                                    {display.title && (
                                      <div className="entry-cell-project" style={{ fontSize: "8px", fontWeight: "700" }}>
                                        {display.title}
                                      </div>
                                    )}
                                    {display.subtitle && (
                                      <div className="entry-cell-project" style={{ fontSize: "8px" }}>
                                        {display.subtitle}
                                      </div>
                                    )}
                                    {display.hours && (
                                      <div className="entry-cell-hours" style={{ fontSize: "8px", fontWeight: "500" }}>
                                        {display.hours}
                                      </div>
                                    )}
                                  </span>
                                );
                              })()
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

      </div>

      <div className="week-nav">
        <div className="week-nav-group week-nav-start">
          <button
            type="button"
            className="btn week-nav-toggle"
            onClick={() => setWeekOffset(weekOffset === 0 ? -1 : 0)}
            title={weekOffset === 0 ? "View last week" : "Back to this week"}
            aria-label={weekOffset === 0 ? "View last week" : "Back to this week"}
          >
            <span>{weekOffset === 0 ? "Last Week" : "This Week"}</span>
            <span aria-hidden="true">{weekOffset === 0 ? "←" : "→"}</span>
          </button>
        </div>

        <div className="week-nav-group week-nav-center">
          {showCreateButton && (
            <button
              type="button"
              className="btn primary week-nav-create"
              onClick={onCreateEntry}
            >
              New Entry
            </button>
          )}
        </div>

        <div className="week-nav-group week-nav-end">
          {showAdminButton && onGoAdmin && (
            <button
              type="button"
              className="btn week-nav-toggle week-nav-admin"
              onClick={onGoAdmin}
              aria-label="Open admin"
            >
              Admin
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
