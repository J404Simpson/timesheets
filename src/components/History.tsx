import React from "react";

type HistoryItem = {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
};

type Props = {
  items?: HistoryItem[];
};

export default function History({ items }: Props): JSX.Element {
  if (!items || items.length === 0) {
    return (
      <section className="placeholder history-activity">
        <h3>History</h3>
        <p className="muted">
          No historical activity yet — create your first timesheet.
        </p>
      </section>
    );
  }

  return (
    <section className="history-activity">
      <h3>History</h3>
      <ul className="history-list">
        {items.map((it) => (
          <li key={it.id} className="history-item">
            <div className="history-title">{it.title}</div>
            {it.subtitle && <div className="muted history-sub">{it.subtitle}</div>}
            {it.date && <div className="history-date muted">{it.date}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}