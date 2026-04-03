import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { SearchCriteria } from './types/search-criteria';
import type { Venue } from './types/search-response';

@Injectable()
export class VenueMatcherService implements OnModuleInit {
  private venues: Venue[] = [];
  private readonly logger = new Logger(VenueMatcherService.name);

  onModuleInit() {
    const filePath = join(__dirname, '..', '..', 'data', 'venues.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown[];
    this.venues = raw.filter((entry) => {
      const v = entry as Record<string, unknown>;
      if (!v.id || !v.name) {
        this.logger.warn(`Skipping malformed venue entry: ${JSON.stringify(v)}`);
        return false;
      }
      return true;
    }) as Venue[];
  }

  matchVenues(criteria: SearchCriteria): Venue[] {
    return this.venues.filter((venue) => {
      if (!venue.id || !venue.name) {
        this.logger.warn(`Skipping malformed venue: ${JSON.stringify(venue)}`);
        return false;
      }

      if (criteria.location !== null) {
        if (!venue.location) return false;
        const search = criteria.location.toLowerCase();
        const loc = venue.location.toLowerCase();
        if (!loc.includes(search) && !search.includes(loc)) {
          return false;
        }
      }

      if (criteria.guestCount !== null) {
        if (
          venue.maxGuestCount !== null &&
          venue.maxGuestCount < criteria.guestCount
        ) {
          return false;
        }
      }

      if (criteria.budget !== null) {
        if (
          venue.minBudget !== null &&
          venue.minBudget > criteria.budget
        ) {
          return false;
        }
      }

      if (criteria.date !== null) {
        if (!Array.isArray(venue.availableDays)) return false;
        const eventDate = new Date(criteria.date + 'T00:00:00');
        const dayName = eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
        });
        if (!venue.availableDays.includes(dayName)) {
          return false;
        }
      }

      if (criteria.timeOfDay !== null) {
        if (!Array.isArray(venue.openTimes)) return false;
        if (!venue.openTimes.includes(criteria.timeOfDay)) {
          return false;
        }
      }

      if (criteria.occasion !== null) {
        if (!Array.isArray(venue.occasions)) return false;
        const searchOccasion = criteria.occasion.toLowerCase();
        if (
          !venue.occasions.some((o) => o.toLowerCase() === searchOccasion)
        ) {
          return false;
        }
      }

      return true;
    });
  }
}
