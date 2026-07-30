import { Injectable, signal } from "@angular/core";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
}

const CLOSED_STATE: ConfirmDialogState = {
  open: false,
  title: "",
  message: "",
  confirmText: "Aceptar",
  cancelText: "Cancelar",
  danger: false,
};

@Injectable({ providedIn: "root" })
export class ConfirmDialogService {
  readonly state = signal<ConfirmDialogState>(CLOSED_STATE);

  private resolver: ((result: boolean) => void) | null = null;

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    this.resolver?.(false);
    this.state.set({
      open: true,
      title: options.title ?? "Confirmar",
      message: options.message,
      confirmText: options.confirmText ?? "Aceptar",
      cancelText: options.cancelText ?? "Cancelar",
      danger: options.danger ?? false,
    });
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(result: boolean): void {
    this.state.set(CLOSED_STATE);
    this.resolver?.(result);
    this.resolver = null;
  }
}
