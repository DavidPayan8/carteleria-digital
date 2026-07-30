import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Location } from "../models/models";

@Injectable({ providedIn: "root" })
export class LocationsService {
  private readonly base = `${environment.apiUrl}/locations`;

  constructor(private readonly http: HttpClient) {}

  list(organizationId?: string) {
    return this.http.get<Location[]>(this.base, {
      params: organizationId ? { organizationId } : {},
    });
  }

  create(data: { organizationId: string; name: string; address?: string; timeZone?: string }) {
    return this.http.post<Location>(this.base, data);
  }

  update(id: string, data: Partial<{ name: string; address: string; timeZone: string }>) {
    return this.http.patch<Location>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
