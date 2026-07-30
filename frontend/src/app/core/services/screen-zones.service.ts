import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { ScreenZone } from "../models/models";

export interface ScreenZoneInput {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

@Injectable({ providedIn: "root" })
export class ScreenZonesService {
  private readonly base = `${environment.apiUrl}/screen-zones`;

  constructor(private readonly http: HttpClient) {}

  list(screenId: string) {
    return this.http.get<ScreenZone[]>(this.base, { params: { screenId } });
  }

  create(screenId: string, data: ScreenZoneInput) {
    return this.http.post<ScreenZone>(this.base, { screenId, ...data });
  }

  update(id: string, data: Partial<ScreenZoneInput>) {
    return this.http.patch<ScreenZone>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
