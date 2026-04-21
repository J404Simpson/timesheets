import { useEffect, useRef, useState, Fragment, type ReactNode } from "react";
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
  footerEndContent?: ReactNode;
  refreshToken?: number;
  allowPreviousWeekEdits?: boolean;
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

type HoverState = {
  dateKey: string;
  slot: number;
};

export default function Recent({
  onCreateEntry,
  onSelectDate,
  onEditEntry,
  onGoAdmin,
  employeeId,
  showCreateButton = true,
  showAdminButton = false,
  footerEndContent,
  refreshToken,
  allowPreviousWeekEdits = false,
}: Props): JSX.Element {
  const [entries, setEntries] = useState<WeekEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selection, setSelection] = useState<TimeRangeSelection | null>(null);
  const [justFinishedSelectionAt, setJustFinishedSelectionAt] = useState<number>(0);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const weekGridRef = useRef<HTMLDivElement | null>(null);
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
  }, [weekOffset, employeeId, refreshToken]);

  // Calculate the reference week's Monday in local time
  const now = new Date();
  const isMondayLocal = now.getDay() === 1;
  const referenceDate = new Date(now);
  referenceDate.setDate(now.getDate() + weekOffset * 7);
  const dayOfWeek = referenceDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMonday);

  const isPreviousWeekLocked =
    weekOffset === -1 &&
    !isMondayLocal &&
    !allowPreviousWeekEdits;

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
    const notesName = (entry.notes ?? "").trim();
    const hoursText = `${Number(entry.hours)}h`;

    if (projectNameLower === "leave") {
      return {
        title: projectName || "Leave",
        subtitle: "",
        hours: "",
      };
    }

    if (projectNameLower === "holiday") {
      return {
        title: projectName || "Holiday",
        subtitle: notesName,
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
    const projectNameLower = (entry.project?.name ?? "").trim().toLowerCase();
    const isLeave = projectNameLower === "leave";
    const isHoliday = projectNameLower === "holiday";

    // Leave is always title-only per requirement.
    if (isLeave) {
      return { title: display.title, subtitle: "", hours: "" };
    }

    if (isHoliday) {
      if (rowSpan <= 1) {
        return { title: display.title, subtitle: "", hours: "" };
      }

      return { title: display.title, subtitle: display.subtitle, hours: "" };
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

  const isHalfHourSlotOccupied = (date: Date, hour: number, minute: number): boolean => {
    const dateStr = toDateKeyLocal(date);
    const slotMinutes = hour * 60 + minute;
    const slotEndMinutes = slotMinutes + 30;

    return entries.some((entry) => {
      const entryDateStr = getEntryDateKey(entry.date);
      if (entryDateStr !== dateStr) return false;
      const [startH, startM] = getTimeParts(entry.start_time);
      const [endH, endM] = getTimeParts(entry.end_time);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return startMinutes < slotEndMinutes && endMinutes > slotMinutes;
    });
  };

  const getEntryForTimeSlot = (date: Date, hour: number, minute: number): WeekEntry | undefined => {
    const dateStr = toDateKeyLocal(date);
    const slotMinutes = hour * 60 + minute;

    return entries.find((entry) => {
      const entryDateStr = getEntryDateKey(entry.date);
      if (entryDateStr !== dateStr) return false;
      const [startH, startM] = getTimeParts(entry.start_time);
      const startMinutes = startH * 60 + startM;
      return slotMinutes === startMinutes;
    });
  };

  const canSelectTimeSlot = (date: Date, hour: number, minute: number): boolean => {
    // Cannot select future date/time, but allow the full current hour.
    // Example: at 16:00, allow selecting 16:00-16:45 (entry can end at 17:00).
    const targetDateTime = new Date(date);
    targetDateTime.setHours(hour, minute, 0, 0);

    const targetDateKey = toDateKeyLocal(targetDateTime);
    const todayKey = toDateKeyLocal(now);

    if (targetDateKey < todayKey) return true;
    if (targetDateKey > todayKey) return false;

    const nextHourStart = new Date(now);
    nextHourStart.setMinutes(0, 0, 0);
    nextHourStart.setHours(nextHourStart.getHours() + 1);

    return targetDateTime < nextHourStart;
  };

  const toSlotIndex = (hour: number, minute: number) => hour * 2 + Math.floor(minute / 30);

  const normalizeToHalfHour = (minute: number) => (minute >= 30 ? 30 : 0);

  const slotToHourMinute = (slot: number): [number, number] => {
    const normalized = Math.max(0, Math.min(47, slot));
    return [Math.floor(normalized / 2), (normalized % 2) * 30];
  };

  const isSlotSelectable = (date: Date, hour: number, minute: number) => {
    // Avoid selecting the last half-hour of the day because end-time options
    // in New Entry cannot represent 24:00.
    if (hour === 23 && minute === 30) return false;
    return canSelectTimeSlot(date, hour, minute) && !isHalfHourSlotOccupied(date, hour, minute);
  };

  const getLastSelectableSlotInRange = (date: Date, startSlot: number, targetSlot: number) => {
    const direction = targetSlot >= startSlot ? 1 : -1;
    let lastSelectableSlot = startSlot;

    for (let slot = startSlot; direction > 0 ? slot <= targetSlot : slot >= targetSlot; slot += direction) {
      const [hour, minute] = slotToHourMinute(slot);
      if (!isSlotSelectable(date, hour, minute)) {
        break;
      }
      lastSelectableSlot = slot;
    }

    return lastSelectableSlot;
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
    if (isPreviousWeekLocked) return;
    const snappedMinute = normalizeToHalfHour(minute);
    if (!isSlotSelectable(date, hour, snappedMinute)) return;
    const dateKey = toDateKeyLocal(date);
    const slot = toSlotIndex(hour, snappedMinute);

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
    const snappedMinute = normalizeToHalfHour(minute);
    const slot = toSlotIndex(hour, snappedMinute);
    const [startHour, startMinute] = slotToHourMinute(dragState.startSlot);
    const dragDate = new Date(date);
    if (!isRangeSelectable(dragDate, dragState.startSlot, slot)) {
      if (!isSlotSelectable(dragDate, startHour, startMinute)) {
        setDragState(null);
        return;
      }

      const clampedSlot = getLastSelectableSlotInRange(dragDate, dragState.startSlot, slot);
      setDragState((prev) => (prev ? { ...prev, currentSlot: clampedSlot } : prev));
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

  useEffect(() => {
    const grid = weekGridRef.current;
    if (!grid) return;

    // Each hour occupies 4 quarter slots × 8px min-height = 32px.
    // Scroll so 7am is at the top (below the sticky header).
    const scrollToHour = () => {
      const target = grid.querySelector<HTMLElement>('[data-hour="7"]');
      if (!target) return;
      const headerEl = grid.querySelector<HTMLElement>(".grid-header");
      const headerHeight = headerEl?.getBoundingClientRect().height ?? 56;
      const containerRect = grid.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top - headerHeight + grid.scrollTop;
      grid.scrollTop = Math.max(0, offset);
    };

    // Run after paint so layout is settled
    const raf = requestAnimationFrame(() => {
      scrollToHour();
    });
    return () => cancelAnimationFrame(raf);
  }, [loading, weekOffset, employeeId]);

  const handleTimeSlotClick = (date: Date, hour: number, minute: number) => {
    if (!onSelectDate) return;
    if (isPreviousWeekLocked) return;
    const snappedMinute = normalizeToHalfHour(minute);
    const slot = toSlotIndex(hour, snappedMinute);
    const dateKey = toDateKeyLocal(date);
    
    // If clicking on a selected range, create entry with that range
    if (isCellInSelection(date, slot) && selection) {
      const nowTs = Date.now();
      // Allow immediate click on selection, but prevent accidental double-trigger
      if (nowTs - justFinishedSelectionAt < 100) return;
      
      const [startHour, startMinute] = slotToHourMinute(selection.startSlot);
      const endSlotExclusive = Math.min(48, selection.endSlot + 1);
      const [endHour, endMinute] = endSlotExclusive === 48 ? [23, 30] : slotToHourMinute(endSlotExclusive);
      onSelectDate?.(selection.dateKey, startHour, startMinute, endHour, endMinute);
      setSelection(null);
      return;
    }
    
    // Don't allow single-click shortly after finishing a drag
    const nowTs = Date.now();
    if (nowTs - justFinishedSelectionAt < 250) return;
    
    // Otherwise, create entry starting at this time slot
    if (isSlotSelectable(date, hour, snappedMinute)) {
      onSelectDate?.(dateKey, hour, snappedMinute);
      setSelection(null);
    }
  };

  const isLeaveEntry = (entry: WeekEntry) => {
    return ["leave", "holiday"].includes((entry.project?.name ?? "").trim().toLowerCase());
  };

  const getEntryTypeClass = (entry?: WeekEntry) => {
    if (!entry) return "";
    const projectNameLower = (entry.project?.name ?? "").trim().toLowerCase();
    if (projectNameLower === "holiday") return "entry-holiday";
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
    isSlotHover: boolean,
    isWeekend: boolean,
    isWorkingHour: boolean,
    entry?: WeekEntry
  ) => {
    return `grid-cell quarter ${isHourDivider ? "hour-divider" : ""} ${isOccupied ? "occupied" : ""} ${isFuture ? "future" : ""} ${!isFuture && !isOccupied ? "available" : ""} ${isToday ? "today-col" : ""} ${isSelected ? "selected-range" : ""} ${isSlotHover ? "slot-hover" : ""} ${isWeekend ? "weekend" : ""} ${isWorkingHour ? "working-hours" : ""} ${getEntryTypeClass(entry)}`;
  };

  const getCellTitle = (
    isFuture: boolean,
    isOccupied: boolean,
    isSelected: boolean,
    timeLabel: string,
    entry?: WeekEntry
  ) => {
    if (isPreviousWeekLocked) {
      return "Previous week entries can only be changed on Monday unless you are an admin";
    }
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
        <div className="week-grid" ref={weekGridRef} onMouseLeave={() => setHoverState(null)}>
          {/* Header row with days */}
          <div className="grid-header grid-time-label">Time</div>
          {weekDays.map((day) => {
            const isToday = toDateKeyLocal(day) === toDateKeyLocal(now);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dayKey = toDateKeyLocal(day);
            const dayTotal = entries
              .filter((e) => getEntryDateKey(e.date) === dayKey)
              .reduce((sum, e) => sum + Number(e.hours), 0);
            const dayTotalDisplay = dayTotal > 0
              ? `${parseFloat(dayTotal.toFixed(2))}hrs`
              : null;
            return (
              <div key={day.toISOString()} className={`grid-header grid-day-header ${isToday ? "today" : ""} ${isWeekend ? "weekend" : ""}`}>
                <div className="grid-day-title">
                  <span className="grid-day-name">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="grid-day-date">
                    {day.getDate()}
                  </span>
                </div>
                <div className={`grid-day-hours ${dayTotalDisplay ? "has-value" : "is-empty"}`}>
                  {dayTotalDisplay ?? "\u00A0"}
                </div>
              </div>
            );
          })}

          {/* Time slots rows */}
          {Array.from({ length: 24 }, (_, hour) => {
            const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
            const isWorkingHour = hour >= 7 && hour < 19;

            return (
              <Fragment key={`hour-${hour}`}>
                {/* Time label spans the full hour */}
                <div className={`grid-time-cell span-4 ${isWorkingHour ? "working-hours-label" : ""}`} data-hour={hour}>
                  <span className="time-label">{hourLabel}</span>
                </div>

                {/* Four quarter-hour rows per hour; selection snaps to half-hours */}
                {Array.from({ length: 4 }, (_, quarter) => {
                  const minute = quarter * 15;
                  const snappedMinute = normalizeToHalfHour(minute);
                  const timeLabel = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
                  const isHourDivider = minute === 15 || minute === 45;

                  return (
                    <Fragment key={`hour-${hour}-q-${quarter}`}>
                      {weekDays.map((day) => {
                        const dateStr = toDateKeyLocal(day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const slot = toSlotIndex(hour, snappedMinute);
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

                        const isOccupied = isHalfHourSlotOccupied(day, hour, snappedMinute);
                        const isFuture = !canSelectTimeSlot(day, hour, snappedMinute);
                        const isToday = toDateKeyLocal(day) === toDateKeyLocal(now);
                        const entry = getEntryForTimeSlot(day, hour, minute);
                        const isSelected = isCellInSelection(day, slot);
                        const isDragPreview = !!dragState?.active && dragState.dateKey === dateStr && (
                          slot >= Math.min(dragState.startSlot, dragState.currentSlot) &&
                          slot <= Math.max(dragState.startSlot, dragState.currentSlot)
                        );
                        const isSlotHover =
                          !dragState?.active &&
                          hoverState?.dateKey === dateStr &&
                          hoverState?.slot === slot;

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
                            className={getCellClassName(isHourDivider, isOccupied, isFuture, isToday, isSelected || isDragPreview, isSlotHover, isWeekend, isWorkingHour, entry)}
                            onMouseDown={() => handleSlotMouseDown(day, hour, minute)}
                            onMouseEnter={() => {
                              setHoverState({ dateKey: dateStr, slot });
                              handleSlotMouseEnter(day, hour, minute);
                            }}
                            onMouseUp={handleSlotMouseUp}
                            onClick={() => {
                              if (entry) {
                                if (isPreviousWeekLocked) {
                                  return;
                                }
                                if (!isLeaveEntry(entry)) {
                                  onEditEntry?.(entry);
                                }
                                return;
                              }
                              handleTimeSlotClick(day, hour, snappedMinute);
                            }}
                            disabled={isFuture || (isOccupied && !entry) || isPreviousWeekLocked}
                            title={getCellTitle(isFuture, isOccupied, isSelected, timeLabel, entry)}
                            style={{ 
                              overflow: "hidden", 
                              whiteSpace: "normal", 
                              wordBreak: "break-word", 
                              padding: rowSpan <= 1 ? "0 1px" : "2px",
                              lineHeight: rowSpan <= 1 ? 1 : undefined,
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
              disabled={isPreviousWeekLocked}
              title={
                isPreviousWeekLocked
                  ? "Previous week entries can only be created on Monday unless you are an admin"
                  : undefined
              }
            >
              New Entry
            </button>
          )}
        </div>

        <div className="week-nav-group week-nav-end">
          {footerEndContent ??
            (showAdminButton && onGoAdmin && (
            <button
              type="button"
              className="btn week-nav-toggle week-nav-admin"
              onClick={onGoAdmin}
              aria-label="Open admin"
            >
              Admin
            </button>
            ))}
        </div>
      </div>
    </section>
  );
}
