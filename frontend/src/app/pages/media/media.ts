
import { Component, OnInit, effect, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { Media } from "../../core/models/models";
import { MediaService } from "../../core/services/media.service";
import { WorkspaceService } from "../../core/services/workspace.service";
import { ConfirmDialogService } from "../../shared/confirm-dialog/confirm-dialog.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

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

// Algunos navegadores no decodifican frames de forma fiable en un <video> nunca
// insertado en el documento, así que lo montamos oculto mientras dura la captura.
function captureFrame(video: HTMLVideoElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width === 0 || canvas.height === 0) {
      resolve(null);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
  });
}

function readVideoMeta(
  file: File,
): Promise<{ width: number; height: number; durationSeconds: number; thumbnail: Blob | null }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
    const url = URL.createObjectURL(file);

    let settled = false;
    const finish = async (thumbnail: Blob | null) => {
      if (settled) return;
      settled = true;
      const width = video.videoWidth;
      const height = video.videoHeight;
      const durationSeconds = Math.round(video.duration) || 0;
      URL.revokeObjectURL(url);
      video.remove();
      resolve({ width, height, durationSeconds, thumbnail });
    };

    // Si el evento "seeked" no llega (pasa en algunos navegadores/formatos), no dejamos
    // la subida colgada indefinidamente: capturamos lo que haya en pantalla o abandonamos.
    const timeout = setTimeout(() => void finish(null), 4000);

    video.onloadedmetadata = () => {
      // Salta un poco hacia dentro del video: el primer frame suele salir en negro/vacío.
      const target = Math.min(1, (video.duration || 0) / 2);
      if (target > 0) {
        video.currentTime = target;
      } else {
        clearTimeout(timeout);
        void captureFrame(video).then(finish);
      }
    };
    video.onseeked = () => {
      clearTimeout(timeout);
      void captureFrame(video).then(finish);
    };
    video.onerror = () => {
      clearTimeout(timeout);
      void finish(null);
    };
    document.body.appendChild(video);
    video.src = url;
  });
}

@Component({
  selector: "app-media",
  standalone: true,
  imports: [SpinnerComponent],
  templateUrl: "./media.html",
})
export class MediaLibrary implements OnInit {
  readonly media = signal<Media[]>([]);
  readonly uploading = signal(false);
  readonly loading = signal(false);

  constructor(
    private readonly mediaService: MediaService,
    private readonly confirmDialog: ConfirmDialogService,
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
    this.loading.set(true);
    try {
      this.media.set(await firstValueFrom(this.mediaService.list(orgId)));
    } finally {
      this.loading.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const orgId = this.workspace.selectedOrganizationId();
    if (!file || !orgId) return;

    this.uploading.set(true);
    try {
      const isVideo = file.type.startsWith("video/");
      let width = 0;
      let height = 0;
      let durationSeconds: number | undefined;
      let thumbnail: Blob | undefined;
      if (isVideo) {
        const meta = await readVideoMeta(file);
        width = meta.width;
        height = meta.height;
        durationSeconds = meta.durationSeconds || undefined;
        thumbnail = meta.thumbnail ?? undefined;
      } else {
        const meta = await readImageMeta(file);
        width = meta.width;
        height = meta.height;
      }
      await firstValueFrom(
        this.mediaService.upload(file, orgId, {
          width: width || undefined,
          height: height || undefined,
          durationSeconds,
          thumbnail,
        }),
      );
      await this.load();
    } finally {
      this.uploading.set(false);
      input.value = "";
    }
  }

  async remove(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: "¿Borrar este archivo? También se eliminará de las playlists que lo usen.",
      confirmText: "Borrar",
      danger: true,
    });
    if (!confirmed) return;
    await firstValueFrom(this.mediaService.delete(id));
    await this.load();
  }

  formatSize(bytes: string): string {
    const n = Number(bytes);
    if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / 1024).toFixed(0)} KB`;
  }
}
