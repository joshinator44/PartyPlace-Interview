import { Controller, Post, Body } from '@nestjs/common';
import { VenueSearchService } from './venue-search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import type { SearchResponse } from './types/search-response';

@Controller('venues')
export class VenueSearchController {
  constructor(private readonly venueSearchService: VenueSearchService) {}

  @Post('search')
  async search(@Body() dto: SearchQueryDto): Promise<SearchResponse> {
    return this.venueSearchService.search(dto.query);
  }
}
