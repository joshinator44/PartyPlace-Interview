import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ValidationService } from './validation.service';
import { VenueMatcherService } from './venue-matcher.service';
import type { SearchCriteria } from './types/search-criteria';
import type { SearchResponse } from './types/search-response';

@Injectable()
export class VenueSearchService {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly validationService: ValidationService,
    private readonly venueMatcherService: VenueMatcherService,
  ) {}

  async search(query: string): Promise<SearchResponse> {
    const criteria = await this.openaiService.parseQuery(query);
    const appliedFilters = this.buildAppliedFilters(criteria);

    const validation = this.validationService.validate(criteria, query);
    if (validation) {
      return {
        venues: [],
        appliedFilters,
        validation,
      };
    }

    const venues = this.venueMatcherService.matchVenues(criteria);

    return {
      venues,
      appliedFilters,
      validation: null,
    };
  }

  private buildAppliedFilters(
    criteria: SearchCriteria,
  ): Record<string, string> {
    const filters: Record<string, string> = {};

    if (criteria.budget !== null) {
      filters.budget = `$${criteria.budget.toLocaleString()}`;
    }
    if (criteria.guestCount !== null) {
      filters.guestCount = `${criteria.guestCount} guests`;
    }
    if (criteria.location !== null) {
      filters.location = criteria.location;
    }
    if (criteria.date !== null) {
      const date = new Date(criteria.date + 'T00:00:00');
      filters.date = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (criteria.timeOfDay !== null) {
      filters.timeOfDay = criteria.timeOfDay;
    }
    if (criteria.occasion !== null) {
      filters.occasion = criteria.occasion;
    }

    return filters;
  }
}
