export interface Venue {
  id: number;
  name: string;
  minBudget: number | null;
  maxGuestCount: number | null;
  location: string;
  availableDays: string[];
  openTimes: string[];
  occasions: string[];
}

export interface ValidationResult {
  errors: string[];
  suggestedQuery: string;
}

export interface SearchResponse {
  venues: Venue[];
  appliedFilters: Record<string, string>;
  validation: ValidationResult | null;
}
