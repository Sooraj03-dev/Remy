// shared/types/meetup.ts
// Shared Campus Meetup types for safe physical exchange zones

export interface CampusMeetupLocation {
  id: string;
  name: string;
  description?: string;
  campusZone: string;
  safeZoneCertified: boolean;
  operatingHours: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

