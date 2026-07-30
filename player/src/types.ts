export interface Session {
  apiBase: string;
  screenId: string;
  token: string;
  pollingIntervalSeconds: number;
}

export interface PairResponse {
  screenId: string;
  token: string;
  pollingIntervalSeconds: number;
}

export type MediaKind = "image" | "video";

export interface PlaylistItemDto {
  id: string;
  type: MediaKind;
  durationSeconds: number;
  transitionType: string;
  url: string;
}

export interface PlaylistDto {
  id: string;
  name: string;
  version: string;
  defaultItemDurationSeconds: number;
  orientation: number;
  items: PlaylistItemDto[];
}

export interface ZoneDto {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  playlist: PlaylistDto | null;
}

export type CurrentPlaylistResponse =
  | { pollingIntervalSeconds: number; layout: "single"; playlist: PlaylistDto | null }
  | { pollingIntervalSeconds: number; layout: "zones"; zones: ZoneDto[] };

// Representación interna, unificada: una pantalla sin zonas configuradas se
// normaliza a una única zona "full" que ocupa el 100% — así el resto del
// player (caché, renderer) no necesita dos caminos de código distintos.
export interface NormalizedZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  playlist: PlaylistDto | null;
}
