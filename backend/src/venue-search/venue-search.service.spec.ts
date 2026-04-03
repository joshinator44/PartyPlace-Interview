import { Test, TestingModule } from '@nestjs/testing';
import { VenueSearchService } from './venue-search.service';
import { OpenaiService } from './openai.service';
import { ValidationService } from './validation.service';
import { VenueMatcherService } from './venue-matcher.service';
import type { SearchCriteria } from './types/search-criteria';

const VALID_CRITERIA: SearchCriteria = {
  budget: 2000,
  guestCount: 50,
  location: 'Brooklyn',
  date: '2026-05-05',
  timeOfDay: 'evening',
  occasion: 'Birthday',
};

const MOCK_VENUES = [
  {
    id: 1,
    name: 'Test Venue',
    minBudget: 1500,
    maxGuestCount: 80,
    location: 'Brooklyn',
    availableDays: ['Tuesday'],
    openTimes: ['evening'],
    occasions: ['Birthday'],
  },
];

describe('VenueSearchService', () => {
  let service: VenueSearchService;
  let openaiService: { parseQuery: jest.Mock };
  let validationService: { validate: jest.Mock };
  let venueMatcherService: { matchVenues: jest.Mock };

  beforeEach(async () => {
    openaiService = { parseQuery: jest.fn() };
    validationService = { validate: jest.fn() };
    venueMatcherService = { matchVenues: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VenueSearchService,
        { provide: OpenaiService, useValue: openaiService },
        { provide: ValidationService, useValue: validationService },
        { provide: VenueMatcherService, useValue: venueMatcherService },
      ],
    }).compile();

    service = module.get<VenueSearchService>(VenueSearchService);
  });

  it('should return parsed criteria as appliedFilters', async () => {
    openaiService.parseQuery.mockResolvedValue(VALID_CRITERIA);
    validationService.validate.mockReturnValue(null);
    venueMatcherService.matchVenues.mockReturnValue(MOCK_VENUES);

    const result = await service.search('Birthday in Brooklyn for 50 people');

    expect(result.appliedFilters).toEqual({
      budget: '$2,000',
      guestCount: '50 guests',
      location: 'Brooklyn',
      date: 'Tuesday, May 5, 2026',
      timeOfDay: 'evening',
      occasion: 'Birthday',
    });
  });

  it('should omit null fields from appliedFilters', async () => {
    const criteria: SearchCriteria = {
      budget: null,
      guestCount: null,
      location: 'SoHo',
      date: null,
      timeOfDay: null,
      occasion: 'Birthday',
    };
    openaiService.parseQuery.mockResolvedValue(criteria);
    validationService.validate.mockReturnValue(null);
    venueMatcherService.matchVenues.mockReturnValue([]);

    const result = await service.search('Birthday in SoHo');

    expect(result.appliedFilters).toEqual({
      location: 'SoHo',
      occasion: 'Birthday',
    });
  });

  it('should return matched venues when validation passes', async () => {
    openaiService.parseQuery.mockResolvedValue(VALID_CRITERIA);
    validationService.validate.mockReturnValue(null);
    venueMatcherService.matchVenues.mockReturnValue(MOCK_VENUES);

    const result = await service.search('Birthday in Brooklyn');

    expect(result.venues).toEqual(MOCK_VENUES);
    expect(result.validation).toBeNull();
    expect(venueMatcherService.matchVenues).toHaveBeenCalledWith(
      VALID_CRITERIA,
    );
  });

  it('should return validation errors and empty venues when validation fails', async () => {
    const validationResult = {
      errors: ['Weekend bookings require a minimum budget of $1,500'],
      suggestedQuery: 'party on Friday with a budget of at least $1,500',
    };
    openaiService.parseQuery.mockResolvedValue(VALID_CRITERIA);
    validationService.validate.mockReturnValue(validationResult);

    const result = await service.search('party on Friday for $500');

    expect(result.venues).toEqual([]);
    expect(result.validation).toEqual(validationResult);
    expect(venueMatcherService.matchVenues).not.toHaveBeenCalled();
  });
});
