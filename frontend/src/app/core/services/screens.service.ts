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

  create(data: { locationId: string; name: string; orientation?: number }) {
    return this.http.post<Screen>(this.base, data);
  }

  regeneratePairingCode(id: string) {
    return this.http.post<{ pairingCode: string; expiresAt: string }>(`${this.base}/${id}/pairing-code`, {});
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
