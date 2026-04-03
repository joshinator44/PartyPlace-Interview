import { Module } from '@nestjs/common';
import { VenueSearchController } from './venue-search.controller';
import { VenueSearchService } from './venue-search.service';
import { OpenaiService } from './openai.service';
import { ValidationService } from './validation.service';
import { VenueMatcherService } from './venue-matcher.service';

@Module({
  controllers: [VenueSearchController],
  providers: [
    VenueSearchService,
    OpenaiService,
    ValidationService,
    VenueMatcherService,
  ],
})
export class VenueSearchModule {}
