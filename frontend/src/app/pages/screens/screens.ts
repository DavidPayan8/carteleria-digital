import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { Screen } from "../../core/models/models";
import { ScreensService } from "../../core/services/screens.service";
import { WorkspaceService } from "../../core/services/workspace.service";

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

@Component({
  selector: "app-screens",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./screens.html",
})
export class Screens implements OnInit {
  readonly screens = signal<Screen[]>([]);
  readonly showForm = signal(false);
  readonly lastPairing = signal<{ screenName: string; code: string; expiresAt: string } | null>(null);
  name = "";
  orientation = 0;

  constructor(
    private readonly screensService: ScreensService,
    readonly workspace: WorkspaceService,
  ) {
    effect(() => {
      if (this.workspace.selectedLocationId()) void this.load();
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  isOnline = isOnline;

  private async load(): Promise<void> {
    const locationId = this.workspace.selectedLocationId();
    if (!locationId) return;
    this.screens.set(await firstValueFrom(this.screensService.list(locationId)));
  }

  async create(): Promise<void> {
    const locationId = this.workspace.selectedLocationId();
    if (!locationId || !this.name) return;
    const screen = await firstValueFrom(
      this.screensService.create({ locationId, name: this.name, orientation: this.orientation }),
    );
    this.name = "";
    this.showForm.set(false);
    if (screen.pairingCode && screen.pairingCodeExpiresAt) {
      this.lastPairing.set({ screenName: screen.name, code: screen.pairingCode, expiresAt: screen.pairingCodeExpiresAt });
    }
    await this.load();
  }

  async regenerateCode(screen: Screen): Promise<void> {
    const result = await firstValueFrom(this.screensService.regeneratePairingCode(screen.id));
    this.lastPairing.set({ screenName: screen.name, code: result.pairingCode, expiresAt: result.expiresAt });
    await this.load();
  }

  async remove(id: string): Promise<void> {
    if (!confirm("¿Borrar esta pantalla?")) return;
    await firstValueFrom(this.screensService.delete(id));
    await this.load();
  }
}
