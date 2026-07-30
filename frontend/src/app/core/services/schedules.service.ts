import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Schedule } from "../models/models";

export interface CreateScheduleInput {
  playlistId: string;
  screenId?: string;
  screenGroupId?: string;
  locationId?: string;
  screenZoneId?: string;
  name: string;
  priority?: number;
  startDate: string;
  endDate?: string;
  daysOfWeek?: number;
  startTime?: string;
  endTime?: string;
}

@Injectable({ providedIn: "root" })
export class SchedulesService {
  private readonly base = `${environment.apiUrl}/schedules`;

  constructor(private readonly http: HttpClient) {}

  list(params?: { screenId?: string; screenGroupId?: string; locationId?: string; screenZoneId?: string }) {
    return this.http.get<Schedule[]>(this.base, { params: { ...params } as Record<string, string> });
  }

  create(data: CreateScheduleInput) {
    return this.http.post<Schedule>(this.base, data);
  }

  update(id: string, data: Partial<CreateScheduleInput>) {
    return this.http.patch<Schedule>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
