import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { OpenaiService } from './openai.service';

const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe('OpenaiService', () => {
  let service: OpenaiService;

  beforeEach(async () => {
    mockCreate.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenaiService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    service = module.get<OpenaiService>(OpenaiService);
  });

  it('should parse a natural language query into SearchCriteria', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              budget: 2000,
              guestCount: 50,
              location: 'Brooklyn',
              date: '2026-05-05',
              timeOfDay: 'evening',
              occasion: 'Birthday',
            }),
          },
        },
      ],
    });

    const result = await service.parseQuery(
      'Birthday in Brooklyn for 50 people on May 5th with a $2000 budget',
    );

    expect(result).toEqual({
      budget: 2000,
      guestCount: 50,
      location: 'Brooklyn',
      date: '2026-05-05',
      timeOfDay: 'evening',
      occasion: 'Birthday',
    });
  });

  it('should handle partial extraction with null fields', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              budget: null,
              guestCount: null,
              location: 'SoHo',
              date: null,
              timeOfDay: null,
              occasion: 'Birthday',
            }),
          },
        },
      ],
    });

    const result = await service.parseQuery('Birthday party in SoHo');

    expect(result.location).toBe('SoHo');
    expect(result.occasion).toBe('Birthday');
    expect(result.budget).toBeNull();
    expect(result.guestCount).toBeNull();
    expect(result.date).toBeNull();
    expect(result.timeOfDay).toBeNull();
  });

  it('should throw 502 for authentication errors (401)', async () => {
    const error = new Error('Incorrect API key') as any;
    error.status = 401;
    mockCreate.mockRejectedValue(error);

    await expect(service.parseQuery('test')).rejects.toThrow(HttpException);
    await expect(service.parseQuery('test')).rejects.toMatchObject({
      status: 502,
    });
  });

  it('should throw 429 for rate limit errors', async () => {
    const error = new Error('Rate limit exceeded') as any;
    error.status = 429;
    mockCreate.mockRejectedValue(error);

    await expect(service.parseQuery('test')).rejects.toThrow(HttpException);
    await expect(service.parseQuery('test')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('should throw 502 for timeout/network errors', async () => {
    const error = new Error('Connection timeout');
    mockCreate.mockRejectedValue(error);

    await expect(service.parseQuery('test')).rejects.toThrow(HttpException);
    await expect(service.parseQuery('test')).rejects.toMatchObject({
      status: 502,
    });
  });

  it('should throw 502 for unparseable responses', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not valid json' } }],
    });

    await expect(service.parseQuery('test')).rejects.toThrow(HttpException);
    await expect(service.parseQuery('test')).rejects.toMatchObject({
      status: 502,
    });
  });
});
