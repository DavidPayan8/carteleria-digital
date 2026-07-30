import type { ResolvedItem } from "./scheduler";

export class Renderer {
  private items: ResolvedItem[] = [];
  private index = 0;
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private slideEls: HTMLElement[] = [];

  constructor(
    private readonly container: HTMLElement,
    private readonly onAdvance?: (index: number, total: number) => void,
  ) {}

  setItems(items: ResolvedItem[]): void {
    this.stop();
    this.items = items;
    this.index = 0;
    this.container.innerHTML = "";
    this.slideEls = [];
    if (items.length > 0) this.playCurrent();
  }

  stop(): void {
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
  }

  private buildSlide(item: ResolvedItem): HTMLElement {
    const div = document.createElement("div");
    div.className = "slide";
    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.playbackUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      div.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.playbackUrl;
      div.appendChild(img);
    }
    return div;
  }

  /** Crea el slide bajo demanda (la primera vez que se necesita) y lo reutiliza en las siguientes vueltas. */
  private ensureSlide(index: number): HTMLElement {
    if (!this.slideEls[index]) {
      const el = this.buildSlide(this.items[index]);
      this.container.appendChild(el);
      this.slideEls[index] = el;
    }
    return this.slideEls[index];
  }

  private playCurrent(): void {
    const item = this.items[this.index];
    const current = this.ensureSlide(this.index);

    // Precarga solo el siguiente item, no todos de golpe (importante con playlists largas).
    const nextIndex = (this.index + 1) % this.items.length;
    if (nextIndex !== this.index) this.ensureSlide(nextIndex);

    this.slideEls.forEach((el, i) => el.classList.toggle("visible", i === this.index));

    const durationMs = item.durationSeconds * 1000;
    const video = current.querySelector("video");
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      video.onended = () => this.advance();
      this.advanceTimer = setTimeout(() => this.advance(), durationMs + 3000); // fallback si 'ended' no dispara
    } else {
      this.advanceTimer = setTimeout(() => this.advance(), durationMs);
    }

    this.onAdvance?.(this.index, this.items.length);
  }

  private advance(): void {
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    const prevVideo = this.slideEls[this.index]?.querySelector("video");
    if (prevVideo) prevVideo.pause();
    this.index = (this.index + 1) % this.items.length;
    this.playCurrent();
  }
}
