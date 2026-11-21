// server/src/routes/meetup.ts
// Certified campus meetup location catalog routes

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/db';
import { meetupLocations } from '../db/schema/meetup_locations';
import type { CampusMeetupLocation } from '../../../shared/types';

export const meetupRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapMeetupLocation = (r: any): CampusMeetupLocation => ({
  id: r.id,
  name: r.name,
  description: r.description ?? undefined,
  campusZone: r.campusZone ?? r.campus_zone,
  safeZoneCertified: r.safeZoneCertified ?? r.safe_zone_certified ?? true,
  operatingHours: r.operatingHours ?? r.operating_hours,
  latitude: r.latitude ? parseFloat(r.latitude) : undefined,
  longitude: r.longitude ? parseFloat(r.longitude) : undefined,
  createdAt: new Date(r.createdAt ?? r.created_at).toISOString(),
});

/**
 * GET /api/meetup-locations
 * Public list of certified safe campus exchange zones.
 */
meetupRouter.get('/', async (_req, res, next) => {
  try {
    const db = getDb();
    const records = await db.select().from(meetupLocations);
    const data = (records as any[]).map(mapMeetupLocation);

    res.status(200).json({
      success: true,
      data,
      message: `Found ${data.length} certified campus meetup location(s).`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/meetup-locations/:id
 * Details for a specific campus location.
 */
meetupRouter.get('/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const [record] = await db
      .select()
      .from(meetupLocations)
      .where(eq(meetupLocations.id, req.params.id));

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'LOCATION_NOT_FOUND',
        message: 'Campus meetup location not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: mapMeetupLocation(record),
    });
  } catch (err) {
    next(err);
  }
});

