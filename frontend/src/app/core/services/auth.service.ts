import { HttpClient } from "@angular/common/http";
import { Injectable, computed, signal } from "@angular/core";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthUser } from "../models/models";

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface StoredSession {
  token: string;
  user: AuthUser;
  roles: { roleId: number; locationId: string | null }[];
}

const STORAGE_KEY = "signageflow.session";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly sessionSignal = signal<StoredSession | null>(this.readStoredSession());

  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly roleIds = computed(() => this.sessionSignal()?.roles.map((r) => r.roleId) ?? []);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  get token(): string | null {
    return this.sessionSignal()?.token ?? null;
  }

  hasRole(...roleIds: number[]): boolean {
    return this.roleIds().some((r) => roleIds.includes(r));
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password }),
    );
    const roles = this.decodeRolesFromToken(response.token);
    const session: StoredSession = { token: response.token, user: response.user, roles };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSignal.set(null);
    this.router.navigateByUrl("/login");
  }

  private decodeRolesFromToken(token: string): { roleId: number; locationId: string | null }[] {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.roles ?? [];
    } catch {
      return [];
    }
  }

  private readStoredSession(): StoredSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }
}
