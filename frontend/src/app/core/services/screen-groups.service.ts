import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { ScreenGroup } from "../models/models";

@Injectable({ providedIn: "root" })
export class ScreenGroupsService {
  private readonly base = `${environment.apiUrl}/screen-groups`;

  constructor(private readonly http: HttpClient) {}

  list(locationId: string) {
    return this.http.get<ScreenGroup[]>(this.base, { params: { locationId } });
  }

  create(locationId: string, name: string) {
    return this.http.post<ScreenGroup>(this.base, { locationId, name });
  }

  update(id: string, name: string) {
    return this.http.patch<ScreenGroup>(`${this.base}/${id}`, { name });
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
