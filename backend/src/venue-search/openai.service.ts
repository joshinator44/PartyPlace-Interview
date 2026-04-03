import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { SearchCriteria } from './types/search-criteria';

@Injectable()
export class OpenaiService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenaiService.name);

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async parseQuery(query: string): Promise<SearchCriteria> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a venue search assistant. Extract search parameters from natural language queries about event venues in NYC.

Return a JSON object with these fields (use null for any field you cannot confidently extract):
- budget: number or null (dollar amount)
- guestCount: number or null
- location: string or null (NYC neighborhood name)
- date: string or null (ISO format YYYY-MM-DD)
- timeOfDay: "morning" | "afternoon" | "evening" | "night" | null
- occasion: string or null (one of: Birthday, Wedding, Engagement, Graduation, Anniversary, Reunion, Fundraiser, Office Party, Holiday Party, Happy hour, Bachelor/Bachelorette)

Infer timeOfDay from context: "dinner" → evening, "brunch" → morning, "late night" → night, "lunch" → afternoon.`,
          },
          { role: 'user', content: query },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'search_criteria',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                budget: { type: ['number', 'null'] },
                guestCount: { type: ['number', 'null'] },
                location: { type: ['string', 'null'] },
                date: { type: ['string', 'null'] },
                timeOfDay: { type: ['string', 'null'] },
                occasion: { type: ['string', 'null'] },
              },
              required: [
                'budget',
                'guestCount',
                'location',
                'date',
                'timeOfDay',
                'occasion',
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new HttpException(
          'Could not interpret your request — try rephrasing',
          502,
        );
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content) as Record<string, unknown>;
      } catch {
        this.logger.error(`Failed to parse OpenAI response: ${content}`);
        throw new HttpException(
          'Could not interpret your request — try rephrasing',
          502,
        );
      }

      return this.sanitizeCriteria(parsed);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      const status = (error as any)?.status;
      if (status === 401) {
        this.logger.error('OpenAI authentication failed');
        throw new HttpException('AI service configuration error', 502);
      }
      if (status === 429) {
        this.logger.warn('OpenAI rate limit hit');
        throw new HttpException(
          'Too many requests — please try again in a moment',
          429,
        );
      }

      this.logger.error(`OpenAI error: ${(error as Error).message}`);
      throw new HttpException('AI service temporarily unavailable', 502);
    }
  }

  private sanitizeCriteria(raw: Record<string, unknown>): SearchCriteria {
    return {
      budget:
        typeof raw.budget === 'number' ? raw.budget : null,
      guestCount:
        typeof raw.guestCount === 'number' ? raw.guestCount : null,
      location:
        typeof raw.location === 'string' ? raw.location : null,
      date:
        typeof raw.date === 'string' ? raw.date : null,
      timeOfDay:
        typeof raw.timeOfDay === 'string' ? raw.timeOfDay : null,
      occasion:
        typeof raw.occasion === 'string' ? raw.occasion : null,
    };
  }
}
