import { Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-account",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./account.html",
})
export class AccountPage {
  currentPassword = "";
  newPassword = "";
  confirmPassword = "";

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  constructor(readonly auth: AuthService) {}

  async submit(): Promise<void> {
    this.error.set(null);
    this.success.set(false);
    if (!this.currentPassword || !this.newPassword) return;
    if (this.newPassword.length < 8) {
      this.error.set("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error.set("Las contraseñas nuevas no coinciden.");
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(this.auth.changePassword(this.currentPassword, this.newPassword));
      this.success.set(true);
      this.currentPassword = "";
      this.newPassword = "";
      this.confirmPassword = "";
    } catch (err) {
      this.error.set(this.extractError(err) ?? "No se pudo cambiar la contraseña.");
    } finally {
      this.saving.set(false);
    }
  }

  private extractError(err: unknown): string | null {
    if (err && typeof err === "object" && "error" in err) {
      const body = (err as { error?: { error?: string } }).error;
      return body?.error ?? null;
    }
    return null;
  }
}
