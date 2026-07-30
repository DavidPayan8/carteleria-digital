
import { Component } from "@angular/core";
import { ConfirmDialogService } from "./confirm-dialog.service";

@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  imports: [],
  templateUrl: "./confirm-dialog.component.html",
})
export class ConfirmDialogComponent {
  constructor(readonly dialog: ConfirmDialogService) {}
}
