"use client";

import { useState } from "react";
import SearchBar from "../components/SearchBar";
import AppliedFilters from "../components/AppliedFilters";
import VenueCard from "../components/VenueCard";
import ValidationError from "../components/ValidationError";
import type { SearchResponse } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function Home() {
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [externalQuery, setExternalQuery] = useState<string | undefined>();

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_URL}/api/venues/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          body?.message || `Server error (${res.status}). Please try again.`;
        setError(message);
        return;
      }

      const data: SearchResponse = await res.json();
      setResponse(data);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggest = (suggestedQuery: string) => {
    setExternalQuery(suggestedQuery);
    handleSearch(suggestedQuery);
  };

  return (
    <main className="container">
      <header className="hero">
        <h1>PartyPlace</h1>
        <p>Find the perfect venue for your event</p>
      </header>

      <SearchBar
        onSearch={handleSearch}
        isLoading={isLoading}
        externalQuery={externalQuery}
      />

      {error && (
        <div className="error-box">
          <p>{error}</p>
        </div>
      )}

      {response && (
        <div className="results-section">
          <AppliedFilters filters={response.appliedFilters} />

          {response.validation && (
            <ValidationError
              validation={response.validation}
              onSuggest={handleSuggest}
            />
          )}

          {!response.validation && response.venues.length > 0 && (
            <>
              <p className="results-count">
                {response.venues.length} venue{response.venues.length !== 1 ? "s" : ""} found
              </p>
              {response.venues.map((venue) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </>
          )}

          {!response.validation && response.venues.length === 0 && (
            <p className="no-results">
              No venues match your criteria. Try broadening your search.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
