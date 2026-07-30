import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { ManagedUser } from "../models/models";

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  roleId: number;
  organizationId?: string;
  locationId?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  password?: string;
  roleId?: number;
  locationId?: string;
}

@Injectable({ providedIn: "root" })
export class UsersService {
  private readonly base = `${environment.apiUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  list() {
    return this.http.get<ManagedUser[]>(this.base);
  }

  create(data: CreateUserInput) {
    return this.http.post<ManagedUser>(this.base, data);
  }

  update(id: string, data: UpdateUserInput) {
    return this.http.patch<ManagedUser>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
