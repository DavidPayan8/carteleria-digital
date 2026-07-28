import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Organization } from "../models/models";

@Injectable({ providedIn: "root" })
export class OrganizationsService {
  private readonly base = `${environment.apiUrl}/organizations`;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<Organization[]>(this.base);
  }

  create(data: { name: string; slug: string }) {
    return this.http.post<Organization>(this.base, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
