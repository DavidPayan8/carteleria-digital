import { CommonModule } from "@angular/common";
import { Component, OnInit, effect, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { AuditLog } from "../../core/models/models";
import { AuditService } from "../../core/services/audit.service";
import { WorkspaceService } from "../../core/services/workspace.service";

@Component({
  selector: "app-audit",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./audit.html",
})
export class Audit implements OnInit {
  readonly logs = signal<AuditLog[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = 25;

  constructor(
    private readonly auditService: AuditService,
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
    const organizationId = this.workspace.selectedOrganizationId();
    if (!organizationId) return;
    const result = await firstValueFrom(this.auditService.list({ organizationId, page: this.page() }));
    this.logs.set(result.items);
    this.total.set(result.total);
  }

  async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    await this.load();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  parseSnapshot(json: string): string {
    try {
      return JSON.stringify(JSON.parse(json)).slice(0, 120);
    } catch {
      return json.slice(0, 120);
    }
  }
}
