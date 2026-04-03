const FILTER_ICONS: Record<string, string> = {
  location: "\u{1F4CD}",
  guestCount: "\u{1F465}",
  occasion: "\u{1F389}",
  date: "\u{1F4C5}",
  timeOfDay: "\u{1F552}",
  budget: "\u{1F4B0}",
};

interface AppliedFiltersProps {
  filters: Record<string, string>;
}

export default function AppliedFilters({ filters }: AppliedFiltersProps) {
  const entries = Object.entries(filters);
  if (entries.length === 0) return null;

  return (
    <div className="applied-filters">
      {entries.map(([key, value]) => (
        <span key={key} className="filter-chip">
          {FILTER_ICONS[key] || ""} {value}
        </span>
      ))}
    </div>
  );
}
