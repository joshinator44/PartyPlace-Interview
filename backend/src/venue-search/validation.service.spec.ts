import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import type { SearchCriteria } from './types/search-criteria';

function makeCriteria(
  overrides: Partial<SearchCriteria> = {},
): SearchCriteria {
  return {
    budget: null,
    guestCount: null,
    location: null,
    date: null,
    timeOfDay: null,
    occasion: null,
    ...overrides,
  };
}

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('weekend minimum budget rule', () => {
    it('should return error when weekend booking has budget below $1500', () => {
      // Friday May 8, 2026 is a Friday
      const criteria = makeCriteria({ date: '2026-05-08', budget: 500 });
      const result = service.validate(criteria, 'party on Friday for $500');

      expect(result).not.toBeNull();
      expect(result!.errors).toContain(
        'Weekend bookings require a minimum budget of $1,500',
      );
    });

    it('should pass when weekend booking has budget >= $1500', () => {
      const criteria = makeCriteria({ date: '2026-05-08', budget: 1500 });
      const result = service.validate(criteria, 'party on Friday for $1500');

      expect(result).toBeNull();
    });

    it('should skip rule when budget is not provided', () => {
      const criteria = makeCriteria({ date: '2026-05-08', budget: null });
      const result = service.validate(criteria, 'party on Friday');

      expect(result).toBeNull();
    });

    it('should skip rule on weekdays', () => {
      // May 6, 2026 is a Wednesday
      const criteria = makeCriteria({ date: '2026-05-06', budget: 500 });
      const result = service.validate(
        criteria,
        'party on Wednesday for $500',
      );

      expect(result).toBeNull();
    });
  });

  describe('advance booking rule', () => {
    it('should return error when date is less than 3 days away', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const criteria = makeCriteria({ date: dateStr });
      const result = service.validate(criteria, `party on ${dateStr}`);

      expect(result).not.toBeNull();
      expect(result!.errors).toContain(
        'Events must be booked at least 3 days in advance',
      );
    });

    it('should pass when date is exactly 3 days away', () => {
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);
      const dateStr = threeDays.toISOString().split('T')[0];

      const criteria = makeCriteria({ date: dateStr });
      const result = service.validate(criteria, `party on ${dateStr}`);

      // Should not have advance booking error (may have weekend error depending on day)
      if (result) {
        expect(result.errors).not.toContain(
          'Events must be booked at least 3 days in advance',
        );
      }
    });

    it('should skip rule when date is not provided', () => {
      const criteria = makeCriteria({ date: null });
      const result = service.validate(criteria, 'party sometime');

      expect(result).toBeNull();
    });
  });

  describe('guest minimum rule', () => {
    it('should return error when guest count is less than 10', () => {
      const criteria = makeCriteria({ guestCount: 5 });
      const result = service.validate(criteria, 'party for 5 people');

      expect(result).not.toBeNull();
      expect(result!.errors).toContain(
        'A minimum of 10 guests is required for venue bookings',
      );
    });

    it('should pass when guest count is 10 or more', () => {
      const criteria = makeCriteria({ guestCount: 10 });
      const result = service.validate(criteria, 'party for 10 people');

      expect(result).toBeNull();
    });

    it('should skip rule when guest count is not provided', () => {
      const criteria = makeCriteria({ guestCount: null });
      const result = service.validate(criteria, 'party');

      expect(result).toBeNull();
    });
  });

  describe('multiple rule failures', () => {
    it('should return all errors when multiple rules fail', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      // Find next Saturday from tomorrow
      const daysUntilSat = (6 - tomorrow.getDay() + 7) % 7 || 7;
      const nextSaturday = new Date();
      nextSaturday.setDate(nextSaturday.getDate() + 1 + daysUntilSat);
      // But we need it within 3 days — use tomorrow if it's a weekend day
      // Just use a date that's tomorrow for advance booking fail
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const criteria = makeCriteria({
        date: tomorrowStr,
        guestCount: 3,
      });
      const result = service.validate(criteria, 'party tomorrow for 3');

      expect(result).not.toBeNull();
      expect(result!.errors.length).toBeGreaterThanOrEqual(2);
      expect(result!.errors).toContain(
        'Events must be booked at least 3 days in advance',
      );
      expect(result!.errors).toContain(
        'A minimum of 10 guests is required for venue bookings',
      );
    });
  });

  describe('suggested query', () => {
    it('should include a suggested query when validation fails', () => {
      const criteria = makeCriteria({ guestCount: 3 });
      const result = service.validate(criteria, 'party for 3 people');

      expect(result).not.toBeNull();
      expect(result!.suggestedQuery).toBeDefined();
      expect(result!.suggestedQuery.length).toBeGreaterThan(0);
    });
  });
});
