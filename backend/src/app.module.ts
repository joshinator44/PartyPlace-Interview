import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VenueSearchModule } from './venue-search/venue-search.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), VenueSearchModule],
})
export class AppModule {}
