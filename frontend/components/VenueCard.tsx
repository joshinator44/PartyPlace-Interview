import type { Venue } from "../types";

interface VenueCardProps {
  venue: Venue;
}

export default function VenueCard({ venue }: VenueCardProps) {
  return (
    <div className="venue-card">
      <div className="venue-card-header">
        <div>
          <h3 className="venue-name">{venue.name}</h3>
          <p className="venue-meta">
            {"\u{1F4CD}"} {venue.location} &middot; {"\u{1F465}"} Up to{" "}
            {venue.maxGuestCount ?? "N/A"} guests
          </p>
        </div>
        {venue.minBudget !== null && (
          <div className="venue-price">
            From ${venue.minBudget.toLocaleString()}
          </div>
        )}
      </div>
      <div className="venue-occasions">
        {venue.occasions.map((occasion) => (
          <span key={occasion} className="occasion-tag">
            {occasion}
          </span>
        ))}
      </div>
      <p className="venue-availability">
        Available: {venue.availableDays.join(", ")} &middot;{" "}
        {venue.openTimes.join(", ")}
      </p>
    </div>
  );
}
