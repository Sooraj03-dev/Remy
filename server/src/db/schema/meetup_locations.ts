// server/src/db/schema/meetup_locations.ts
// Drizzle schema for certified campus meetup zones

import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const meetupLocations = pgTable('meetup_locations', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  campusZone: text('campus_zone').notNull(),
  safeZoneCertified: boolean('safe_zone_certified').default(true).notNull(),
  operatingHours: text('operating_hours').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 6 }),
  longitude: numeric('longitude', { precision: 10, scale: 6 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type MeetupLocationRecord = typeof meetupLocations.$inferSelect;
export type NewMeetupLocationRecord = typeof meetupLocations.$inferInsert;

