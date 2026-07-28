import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { Media } from "../../core/models/models";
import { MediaService } from "../../core/services/media.service";
import { WorkspaceService } from "../../core/services/workspace.service";

function readImageMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

function readVideoMeta(file: File): Promise<{ width: number; height: number; durationSeconds: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, durationSeconds: Math.round(video.duration) });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => resolve({ width: 0, height: 0, durationSeconds: 0 });
    video.src = url;
  });
}

@Component({
  selector: "app-media",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./media.html",
})
export class MediaLibrary implements OnInit {
  readonly media = signal<Media[]>([]);
  readonly uploading = signal(false);

  constructor(
    private readonly mediaService: MediaService,
    readonly workspace: WorkspaceService,
  ) {
    effect(() => {
      if (this.workspace.selectedOrganizationId()) void this.load();
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const orgId = this.workspace.selectedOrganizationId();
    if (!orgId) return;
    this.media.set(await firstValueFrom(this.mediaService.list(orgId)));
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const orgId = this.workspace.selectedOrganizationId();
    if (!file || !orgId) return;

    this.uploading.set(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const meta: { width: number; height: number; durationSeconds?: number } = isVideo
        ? await readVideoMeta(file)
        : await readImageMeta(file);
      await firstValueFrom(
        this.mediaService.upload(file, orgId, {
          width: meta.width || undefined,
          height: meta.height || undefined,
          durationSeconds: meta.durationSeconds || undefined,
        }),
      );
      await this.load();
    } finally {
      this.uploading.set(false);
      input.value = "";
    }
  }

  async remove(id: string): Promise<void> {
    if (!confirm("¿Borrar este archivo? También se eliminará de las playlists que lo usen.")) return;
    await firstValueFrom(this.mediaService.delete(id));
    await this.load();
  }

  formatSize(bytes: string): string {
    const n = Number(bytes);
    if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / 1024).toFixed(0)} KB`;
  }
}
