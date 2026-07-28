import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Media } from "../models/models";

@Injectable({ providedIn: "root" })
export class MediaService {
  private readonly base = `${environment.apiUrl}/media`;

  constructor(private readonly http: HttpClient) {}

  list(organizationId?: string) {
    return this.http.get<Media[]>(this.base, { params: organizationId ? { organizationId } : {} });
  }

  upload(file: File, organizationId: string, extra?: { durationSeconds?: number; width?: number; height?: number }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("organizationId", organizationId);
    if (extra?.durationSeconds !== undefined) formData.append("durationSeconds", String(extra.durationSeconds));
    if (extra?.width !== undefined) formData.append("width", String(extra.width));
    if (extra?.height !== undefined) formData.append("height", String(extra.height));
    return this.http.post<Media>(this.base, formData);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
