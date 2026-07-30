import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ConfirmDialogComponent } from "./shared/confirm-dialog/confirm-dialog.component";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, ConfirmDialogComponent],
  template: `
    <router-outlet />
    <app-confirm-dialog />
  `,
})
export class App {}
