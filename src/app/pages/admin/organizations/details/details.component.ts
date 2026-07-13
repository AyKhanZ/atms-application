import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { Permissions } from '../../../../core/enums/permissions.enum';
import { ImageUrlService } from '../../../../core/services/image-url.service';
import { OrganizationModel, OrganizationUserModel } from '../../../../core/models/organizations/organizations.models';
import { OrganizationsStoreActions, OrganizationsStoreSelectors } from '../../../../store/organizations';
import { UserStoreSelectors } from '../../../../store/user';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ProfileAvatarComponent } from '../../../../shared/components/profile-avatar/profile-avatar.component';
import { OrganizationCreateDialogComponent } from '../components/organization-create-dialog/organization-create-dialog.component';

@Component({
  selector: 'app-details.component',
  imports: [
    BackButtonComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePipe,
    DialogModule,
    OrganizationCreateDialogComponent,
    ProfileAvatarComponent,
    TagModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly imageUrlService = inject(ImageUrlService);
  private organizationId: string | null = null;

  readonly organization = this.store.selectSignal(OrganizationsStoreSelectors.getItem);
  readonly loading = this.store.selectSignal(OrganizationsStoreSelectors.isLoading);
  readonly isSubmitted = this.store.selectSignal(OrganizationsStoreSelectors.isSubmitted);
  readonly permissions = this.store.selectSignal(UserStoreSelectors.getPermissions);
  readonly editDialogVisible = signal(false);
  readonly logoPreviewVisible = signal(false);
  readonly canEdit = computed(() => this.permissions().includes(Permissions.Organization.Edit));
  readonly canDelete = computed(() => this.permissions().includes(Permissions.Organization.Delete));
  readonly employees = computed(() => this.organization()?.users ?? []);
  readonly logoUrl = computed(() => this.imageUrlService.normalize(this.organization()?.logoPath));
  readonly createdAt = computed(() => {
    const value = this.organization()?.createdAt;
    return value && !value.startsWith('0001-') ? value : null;
  });

  constructor() {
    this.actions$
      .pipe(ofType(OrganizationsStoreActions.updateOrganizationSuccess), takeUntilDestroyed())
      .subscribe(() => this.reload());

    this.actions$
      .pipe(ofType(OrganizationsStoreActions.deleteOrganizationSuccess), takeUntilDestroyed())
      .subscribe(() => this.back());
  }

  ngOnInit(): void {
    this.organizationId = this.route.snapshot.paramMap.get('id');
    if (!this.organizationId) {
      void this.router.navigate(['../'], { relativeTo: this.route });
      return;
    }

    this.store.dispatch(OrganizationsStoreActions.clearItem());
    this.reload();
  }

  ngOnDestroy(): void {
    this.store.dispatch(OrganizationsStoreActions.clearItem());
  }

  back(): void {
    const returnUrl = history.state?.returnUrl;

    if (typeof returnUrl === 'string') {
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    void this.router.navigate(['../'], { relativeTo: this.route });
  }

  openEdit(): void {
    if (!this.canEdit()) {
      return;
    }

    this.editDialogVisible.set(true);
  }

  confirmDelete(): void {
    const organization = this.organization();
    if (!organization || !this.canDelete()) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Delete organization',
      message: `Are you sure you want to delete ${organization.title}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => this.store.dispatch(OrganizationsStoreActions.deleteOrganization({ id: organization.id })),
    });
  }

  onSaved(): void {
    this.editDialogVisible.set(false);
    this.reload();
  }

  openLogoPreview(): void {
    if (this.logoUrl()) {
      this.logoPreviewVisible.set(true);
    }
  }

  initials(value: OrganizationModel | OrganizationUserModel): string {
    const parts = 'title' in value ? [value.title] : [value.name, value.surname];
    return parts.join(' ').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'O';
  }

  fullName(user: OrganizationUserModel): string {
    return [user.name, user.surname].filter(Boolean).join(' ') || 'Unnamed user';
  }

  display(value: string | number | null | undefined): string {
    return value === undefined || value === null || value === '' ? '-' : String(value);
  }

  private reload(): void {
    if (!this.organizationId) {
      return;
    }

    this.store.dispatch(OrganizationsStoreActions.loadOrganization({ id: this.organizationId }));
  }
}
