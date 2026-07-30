import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnDestroy, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./login.html",
})
export class Login implements OnDestroy {
  email = "";
  password = "";
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly retryAfterSeconds = signal(0);

  readonly isRateLimited = computed(() => this.retryAfterSeconds() > 0);
  readonly retryLabel = computed(() => {
    const s = this.retryAfterSeconds();
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m > 0 ? `${m} min ${rem}s` : `${rem}s`;
  });

  private countdownHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async submit(): Promise<void> {
    if (this.isRateLimited()) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl("/dashboard");
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 429) {
        const retryAfter = Number(err.headers.get("Retry-After")) || 60;
        this.startCountdown(retryAfter);
        this.error.set("Demasiados intentos de inicio de sesión. Espera antes de volver a intentarlo.");
      } else {
        this.error.set("Email o contraseña incorrectos.");
      }
    } finally {
      this.loading.set(false);
    }
  }

  private startCountdown(seconds: number): void {
    if (this.countdownHandle) clearInterval(this.countdownHandle);
    this.retryAfterSeconds.set(seconds);
    this.countdownHandle = setInterval(() => {
      const next = this.retryAfterSeconds() - 1;
      this.retryAfterSeconds.set(Math.max(next, 0));
      if (next <= 0 && this.countdownHandle) {
        clearInterval(this.countdownHandle);
        this.countdownHandle = null;
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownHandle) clearInterval(this.countdownHandle);
  }
}
