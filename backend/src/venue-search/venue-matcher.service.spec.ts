import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { VenueMatcherService } from './venue-matcher.service';
import type { SearchCriteria } from './types/search-criteria';
import type { Venue } from './types/search-response';

const TEST_VENUES: Venue[] = [
  {
    id: 1,
    name: 'SoHo Skyline Loft',
    minBudget: 2500,
    maxGuestCount: 80,
    location: 'SoHo',
    availableDays: ['Friday', 'Saturday', 'Sunday'],
    openTimes: ['afternoon', 'evening', 'night'],
    occasions: ['Birthday', 'Engagement', 'Graduation'],
  },
  {
    id: 2,
    name: 'Chelsea Corner Studio',
    minBudget: 900,
    maxGuestCount: 25,
    location: 'Chelsea',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    openTimes: ['morning', 'afternoon', 'evening'],
    occasions: ['Birthday', 'Graduation'],
  },
  {
    id: 3,
    name: 'Midtown Grand Hall',
    minBudget: 3000,
    maxGuestCount: 150,
    location: 'Midtown',
    availableDays: ['Thursday', 'Friday', 'Saturday'],
    openTimes: ['afternoon', 'evening', 'night'],
    occasions: ['Wedding', 'Engagement', 'Office Party', 'Holiday Party'],
  },
  {
    id: 4,
    name: 'Null Budget Venue',
    minBudget: null,
    maxGuestCount: 50,
    location: 'Brooklyn',
    availableDays: ['Saturday'],
    openTimes: ['evening'],
    occasions: ['Birthday'],
  },
  {
    id: 5,
    name: 'Null Capacity Venue',
    minBudget: 1000,
    maxGuestCount: null,
    location: 'Queens',
    availableDays: ['Sunday'],
    openTimes: ['afternoon'],
    occasions: ['Reunion'],
  },
];

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

describe('VenueMatcherService', () => {
  let service: VenueMatcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VenueMatcherService],
    }).compile();

    service = module.get<VenueMatcherService>(VenueMatcherService);
    // Inject test venues instead of loading from file
    service['venues'] = [...TEST_VENUES];
  });

  it('should return all venues when no criteria provided', () => {
    const result = service.matchVenues(makeCriteria());
    expect(result).toHaveLength(TEST_VENUES.length);
  });

  describe('location filter', () => {
    it('should filter by location (case-insensitive substring)', () => {
      const result = service.matchVenues(makeCriteria({ location: 'soho' }));
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('SoHo Skyline Loft');
    });

    it('should match when venue location contains search term', () => {
      const result = service.matchVenues(
        makeCriteria({ location: 'Chelsea' }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chelsea Corner Studio');
    });
  });

  describe('guestCount filter', () => {
    it('should return venues with enough capacity', () => {
      const result = service.matchVenues(makeCriteria({ guestCount: 100 }));
      expect(result.every((v) => v.maxGuestCount === null || v.maxGuestCount >= 100)).toBe(true);
      expect(result.map((v) => v.name)).toContain('Midtown Grand Hall');
      expect(result.map((v) => v.name)).not.toContain('Chelsea Corner Studio');
    });

    it('should include venues with null maxGuestCount', () => {
      const result = service.matchVenues(makeCriteria({ guestCount: 30 }));
      expect(result.map((v) => v.name)).toContain('Null Capacity Venue');
    });
  });

  describe('budget filter', () => {
    it('should return venues within budget', () => {
      const result = service.matchVenues(makeCriteria({ budget: 1000 }));
      expect(result.every((v) => v.minBudget === null || v.minBudget <= 1000)).toBe(true);
      expect(result.map((v) => v.name)).toContain('Chelsea Corner Studio');
      expect(result.map((v) => v.name)).not.toContain('SoHo Skyline Loft');
    });

    it('should include venues with null minBudget', () => {
      const result = service.matchVenues(makeCriteria({ budget: 500 }));
      expect(result.map((v) => v.name)).toContain('Null Budget Venue');
    });
  });

  describe('dayOfWeek filter', () => {
    it('should filter by day derived from date', () => {
      // May 8, 2026 is a Friday
      const result = service.matchVenues(makeCriteria({ date: '2026-05-08' }));
      expect(result.every((v) => v.availableDays.includes('Friday'))).toBe(
        true,
      );
      expect(result.map((v) => v.name)).toContain('SoHo Skyline Loft');
      expect(result.map((v) => v.name)).toContain('Chelsea Corner Studio');
    });
  });

  describe('timeOfDay filter', () => {
    it('should filter by time of day', () => {
      const result = service.matchVenues(
        makeCriteria({ timeOfDay: 'morning' }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Chelsea Corner Studio');
    });
  });

  describe('occasion filter', () => {
    it('should filter by occasion (case-insensitive)', () => {
      const result = service.matchVenues(
        makeCriteria({ occasion: 'wedding' }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Midtown Grand Hall');
    });
  });

  describe('multiple filters', () => {
    it('should narrow results with multiple criteria', () => {
      const result = service.matchVenues(
        makeCriteria({
          occasion: 'Birthday',
          timeOfDay: 'evening',
          guestCount: 50,
        }),
      );
      // SoHo Skyline Loft: Birthday + evening + 80 capacity ✓
      // Chelsea Corner: Birthday + evening + 25 capacity ✗ (too small)
      // Null Budget: Birthday + evening + 50 capacity ✓
      expect(result.map((v) => v.name)).toContain('SoHo Skyline Loft');
      expect(result.map((v) => v.name)).not.toContain('Chelsea Corner Studio');
    });
  });

  describe('malformed data handling', () => {
    it('should skip venues missing id and log warning', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      service['venues'] = [
        { name: 'No ID Venue' } as any,
        ...TEST_VENUES,
      ];

      const result = service.matchVenues(makeCriteria());
      expect(result).toHaveLength(TEST_VENUES.length);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should skip venues missing name and log warning', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      service['venues'] = [{ id: 99 } as any, ...TEST_VENUES];

      const result = service.matchVenues(makeCriteria());
      expect(result).toHaveLength(TEST_VENUES.length);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
