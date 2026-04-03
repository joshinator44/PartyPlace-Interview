import { Injectable } from '@nestjs/common';
import type { SearchCriteria } from './types/search-criteria';
import type { ValidationResult } from './types/search-response';

const WEEKEND_DAYS = ['Friday', 'Saturday', 'Sunday'];
const MIN_WEEKEND_BUDGET = 1500;
const MIN_ADVANCE_DAYS = 3;
const MIN_GUESTS = 10;

@Injectable()
export class ValidationService {
  validate(
    criteria: SearchCriteria,
    originalQuery: string,
  ): ValidationResult | null {
    const errors: string[] = [];
    const fixes: string[] = [];

    if (criteria.date !== null) {
      const eventDate = new Date(criteria.date + 'T00:00:00');
      const dayName = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
      });

      // Weekend minimum budget
      if (
        WEEKEND_DAYS.includes(dayName) &&
        criteria.budget !== null &&
        criteria.budget < MIN_WEEKEND_BUDGET
      ) {
        errors.push(
          'Weekend bookings require a minimum budget of $1,500',
        );
        fixes.push(`with a budget of at least $${MIN_WEEKEND_BUDGET.toLocaleString()}`);
      }

      // Advance booking
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs = eventDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < MIN_ADVANCE_DAYS) {
        errors.push('Events must be booked at least 3 days in advance');
        const suggested = new Date();
        suggested.setDate(suggested.getDate() + MIN_ADVANCE_DAYS);
        fixes.push(
          `on ${suggested.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} or later`,
        );
      }
    }

    // Guest minimum
    if (criteria.guestCount !== null && criteria.guestCount < MIN_GUESTS) {
      errors.push(
        'A minimum of 10 guests is required for venue bookings',
      );
      fixes.push(`for at least ${MIN_GUESTS} guests`);
    }

    if (errors.length === 0) {
      return null;
    }

    const suggestedQuery =
      fixes.length > 0
        ? `${originalQuery} (${fixes.join(', ')})`
        : originalQuery;

    return { errors, suggestedQuery };
  }
}
