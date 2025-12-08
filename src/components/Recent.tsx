import React from "react";

type RecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
};

type Props = {
  items?: RecentItem[];
};

export default function Recent({ items }: Props): JSX.Element {
  if (!items || items.length === 0) {
    return (
      <section className="placeholder recent-activity">
        <h3>Recent</h3>
        <p className="muted">
          No recent activity yet — create your first timesheet.
        </p>
      </section>
    );
  }

  return (
    <section className="recent-activity">
      <h3>Recent</h3>
      <ul className="recent-list">
        {items.map((it) => (
          <li key={it.id} className="recent-item">
            <div className="recent-title">{it.title}</div>
            {it.subtitle && <div className="muted recent-sub">{it.subtitle}</div>}
            {it.date && <div className="recent-date muted">{it.date}</div>}
          </li>
        ))}
      </ul>
    </section>
  );
}