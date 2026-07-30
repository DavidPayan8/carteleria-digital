import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Screen } from "../models/models";

@Injectable({ providedIn: "root" })
export class ScreensService {
  private readonly base = `${environment.apiUrl}/screens`;

  constructor(private readonly http: HttpClient) {}

  list(locationId?: string) {
    return this.http.get<Screen[]>(this.base, { params: locationId ? { locationId } : {} });
  }

  get(id: string) {
    return this.http.get<Screen>(`${this.base}/${id}`);
  }

  create(data: { locationId: string; name: string; orientation?: number; screenGroupId?: string }) {
    return this.http.post<Screen>(this.base, data);
  }

  update(id: string, data: { name?: string; orientation?: number; screenGroupId?: string | null }) {
    return this.http.patch<Screen>(`${this.base}/${id}`, data);
  }

  regeneratePairingCode(id: string) {
    return this.http.post<{ pairingCode: string; expiresAt: string }>(`${this.base}/${id}/pairing-code`, {});
  }

  unpair(id: string) {
    return this.http.post<{ id: string }>(`${this.base}/${id}/unpair`, {});
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
