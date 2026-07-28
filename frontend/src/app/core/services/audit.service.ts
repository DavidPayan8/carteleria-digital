import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { AuditLog } from "../models/models";

export interface AuditLogPage {
  total: number;
  page: number;
  pageSize: number;
  items: AuditLog[];
}

@Injectable({ providedIn: "root" })
export class AuditService {
  private readonly base = `${environment.apiUrl}/audit`;

  constructor(private readonly http: HttpClient) {}

  list(params?: { organizationId?: string; entityName?: string; page?: number }) {
    return this.http.get<AuditLogPage>(this.base, {
      params: { ...params } as Record<string, string | number>,
    });
  }
}
