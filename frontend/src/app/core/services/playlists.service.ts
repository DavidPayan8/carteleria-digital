import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Playlist, PlaylistItem } from "../models/models";

@Injectable({ providedIn: "root" })
export class PlaylistsService {
  private readonly base = `${environment.apiUrl}/playlists`;

  constructor(private readonly http: HttpClient) {}

  list(params?: { organizationId?: string; locationId?: string }) {
    return this.http.get<Playlist[]>(this.base, { params: { ...params } as Record<string, string> });
  }

  get(id: string) {
    return this.http.get<Playlist>(`${this.base}/${id}`);
  }

  create(data: { organizationId: string; locationId?: string; name: string; defaultItemDurationSeconds?: number }) {
    return this.http.post<Playlist>(this.base, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addItem(
    playlistId: string,
    data: { mediaId: string; sortOrder: number; durationSecondsOverride?: number; transitionType?: string },
  ) {
    return this.http.post<PlaylistItem>(`${this.base}/${playlistId}/items`, data);
  }

  updateItem(
    playlistId: string,
    itemId: string,
    data: { durationSecondsOverride?: number; transitionType?: string },
  ) {
    return this.http.patch<PlaylistItem>(`${this.base}/${playlistId}/items/${itemId}`, data);
  }

  removeItem(playlistId: string, itemId: string) {
    return this.http.delete<void>(`${this.base}/${playlistId}/items/${itemId}`);
  }

  reorderItems(playlistId: string, order: { itemId: string; sortOrder: number }[]) {
    return this.http.post<void>(`${this.base}/${playlistId}/items/reorder`, order);
  }
}
