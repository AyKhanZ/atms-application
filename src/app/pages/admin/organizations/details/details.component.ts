import { TooltipModule } from 'primeng/tooltip';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { Permissions } from '../../../../core/enums/permissions.enum';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { ImageUrlService } from '../../../../core/services/image-url.service';
import { OrganizationModel } from '../../../../core/models/organizations/organizations.models';
import { organizationInitials } from '../../../../core/utils/organization.utils';
import {
  OrganizationsStoreActions,
  OrganizationsStoreSelectors,
} from '../../../../store/organizations';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ProfileAvatarComponent } from '../../../../shared/components/profile-avatar/profile-avatar.component';
import { PersonInitialsPipe, PersonNamePipe } from '../../../../shared/pipes/person-name.pipe';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { OrganizationCreateDialogComponent } from '../components/organization-create-dialog/organization-create-dialog.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-details.component',
  imports: [
    TooltipModule,
    LoadingStateComponent,
    BackButtonComponent,
    ButtonModule,
    ConfirmDialogModule,
    AppDatePipe,
    DialogModule,
    HasPermissionDirective,
    OrganizationCreateDialogComponent,
    PersonInitialsPipe,
    PersonNamePipe,
    ProfileAvatarComponent,
    TableModule,
    TagModule,
    TranslocoDirective,
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
  private readonly transloco = inject(TranslocoService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private organizationId: string | null = null;
  private breadcrumbPath = '';

  readonly organization = this.store.selectSignal(OrganizationsStoreSelectors.getItem);
  readonly loading = this.store.selectSignal(OrganizationsStoreSelectors.isLoading);
  readonly isSubmitted = this.store.selectSignal(OrganizationsStoreSelectors.isSubmitted);
  readonly editDialogVisible = signal(false);
  readonly logoPreviewVisible = signal(false);
  readonly Permissions = Permissions;
  readonly employees = computed(() => this.organization()?.users ?? []);
  readonly logoUrl = computed(() => this.imageUrlService.normalize(this.organization()?.logoPath));
  readonly createdAt = computed(() => {
    const value = this.organization()?.createdAt;
    return value && !value.startsWith('0001-') ? value : null;
  });

  constructor() {
    effect(() => {
      const title = this.organization()?.title;
      if (title && this.breadcrumbPath) this.breadcrumbOverride.set(this.breadcrumbPath, title);
    });

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

    this.breadcrumbPath = `/organizations/${this.organizationId}`;
    this.store.dispatch(OrganizationsStoreActions.clearItem());
    this.reload();
  }

  ngOnDestroy(): void {
    this.store.dispatch(OrganizationsStoreActions.clearItem());
    if (this.breadcrumbPath) this.breadcrumbOverride.clear(this.breadcrumbPath);
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
    this.editDialogVisible.set(true);
  }

  confirmDelete(): void {
    const organization = this.organization();
    if (!organization) {
      return;
    }

    this.confirmationService.confirm({
      header: this.transloco.translate('organizations.deleteTitle'),
      message: this.transloco.translate('organizations.deleteMessage', { name: organization.title }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('common.delete'),
      rejectLabel: this.transloco.translate('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () =>
        this.store.dispatch(OrganizationsStoreActions.deleteOrganization({ id: organization.id })),
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

  initials(organization: OrganizationModel): string {
    return organizationInitials(organization.title);
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
