export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  timeZone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Screen {
  id: string;
  locationId: string;
  screenGroupId: string | null;
  name: string;
  orientation: number; // 0=landscape, 1=portrait
  resolutionWidth: number | null;
  resolutionHeight: number | null;
  pollingIntervalSeconds: number;
  pairingCode: string | null;
  pairingCodeExpiresAt: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  lastSeenIp: string | null;
  playerVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  organizationId: string;
  type: number; // 0=image, 1=video
  fileName: string;
  mimeType: string;
  sizeBytes: string; // BigInt serializado como string
  blobContainer: string;
  blobPath: string;
  thumbnailBlobPath: string | null;
  durationSeconds: string | null;
  width: number | null;
  height: number | null;
  uploadedByUserId: string | null;
  createdAt: string;
  url: string;
  thumbnailUrl: string | null;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  mediaId: string;
  sortOrder: number;
  durationSecondsOverride: number | null;
  transitionType: string;
  media?: Media;
}

export interface Playlist {
  id: string;
  organizationId: string;
  locationId: string | null;
  name: string;
  defaultItemDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
  items?: PlaylistItem[];
}

export interface Schedule {
  id: string;
  playlistId: string;
  screenId: string | null;
  screenGroupId: string | null;
  locationId: string | null;
  name: string;
  priority: number;
  startDate: string;
  endDate: string | null;
  daysOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  entityName: string;
  entityId: string;
  organizationId: string | null;
  performedByUserId: string | null;
  performedBy: { id: string; email: string; fullName: string } | null;
  dataSnapshot: string;
  performedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string | null;
}

// Roles seed: 1=SuperAdmin, 2=OrgAdmin, 3=LocationAdmin, 4=Viewer
export const ROLE = {
  SuperAdmin: 1,
  OrgAdmin: 2,
  LocationAdmin: 3,
  Viewer: 4,
} as const;

export const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const DAY_BITS = [1, 2, 4, 8, 16, 32, 64];
