import { Component, input } from "@angular/core";

@Component({
  selector: "app-spinner",
  standalone: true,
  template: `
    <div class="flex items-center justify-center" [class.py-16]="!compact()">
      <svg
        class="animate-spin text-on-surface-variant"
        [class.h-5]="compact()"
        [class.w-5]="compact()"
        [class.h-8]="!compact()"
        [class.w-8]="!compact()"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        ></path>
      </svg>
    </div>
  `,
})
export class SpinnerComponent {
  readonly compact = input(false);
}
