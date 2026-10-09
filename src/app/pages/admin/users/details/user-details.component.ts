import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../../core/i18n/active-language';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { UserStatus } from '../../../../core/enums/user-status.enum';
import { UserModel } from '../../../../core/models/users/users.models';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { UserDisplayService } from '../../../../core/services/user-display.service';
import { isSuperAdmin } from '../../../../core/utils/super-admin.utils';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import {
  ConfirmDialogComponent,
  confirmTone,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { OrganizationLogoComponent } from '../../../../shared/components/organization-logo/organization-logo.component';
import { ProfileAvatarComponent } from '../../../../shared/components/profile-avatar/profile-avatar.component';
import { UserStoreSelectors } from '../../../../store/user';
import { UsersStoreActions, UsersStoreSelectors } from '../../../../store/users';

@Component({
  selector: 'app-user-details',
  imports: [
    AppDatePipe,
    RouterLink,
    ButtonModule,
    TagModule,
    BackButtonComponent,
    ConfirmDialogComponent,
    OrganizationLogoComponent,
    ProfileAvatarComponent,
    TranslocoDirective,
  ],
  providers: [ConfirmationService],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly userDisplay = inject(UserDisplayService);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private readonly me = this.store.selectSignal(UserStoreSelectors.getMe);
  private readonly myRoles = this.store.selectSignal(UserStoreSelectors.getRoles);
  private breadcrumbPath = '';

  protected readonly UserStatus = UserStatus;

  // organization page returns here, not to the list
  protected returnUrl = '';

  readonly user = this.store.selectSignal(UsersStoreSelectors.getItem);
  readonly loading = this.store.selectSignal(UsersStoreSelectors.isLoading);
  readonly submitted = this.store.selectSignal(UsersStoreSelectors.isSubmitted);
  readonly statusAction = computed(() => {
    currentLanguage();
    const person = this.user();
    const me = this.me();
    // only the super admin switches people on and off, never on themselves or another super admin
    if (!person || !me || !isSuperAdmin(this.myRoles())) return null;
    if (person.id === me.id || isSuperAdmin(person.roles ?? [])) return null;

    if (person.userStatus?.id === UserStatus.Active) {
      return {
        label: this.transloco.translate('users.deactivate'),
        icon: 'pi pi-ban',
        userStatusId: UserStatus.Inactive,
      };
    }

    if (person.userStatus?.id === UserStatus.Inactive) {
      return {
        label: this.transloco.translate('users.activate'),
        icon: 'pi pi-check',
        userStatusId: UserStatus.Active,
      };
    }

    return null;
  });
  readonly fullName = computed(() => this.userDisplay.fullName(this.user()));
  readonly roles = computed(
    () =>
      this.user()
        ?.roles?.map((role) => role.name || role.code)
        .filter(Boolean) ?? [],
  );

  constructor() {
    effect(() => {
      const name = this.fullName();
      if (name && this.breadcrumbPath) this.breadcrumbOverride.set(this.breadcrumbPath, name);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['../'], { relativeTo: this.route });
      return;
    }

    this.breadcrumbPath = `/users/${id}`;
    this.returnUrl = this.router.url;

    this.store.dispatch(UsersStoreActions.clearItem());
    this.store.dispatch(UsersStoreActions.loadUser({ id }));
  }

  ngOnDestroy(): void {
    this.store.dispatch(UsersStoreActions.clearItem());
    if (this.breadcrumbPath) this.breadcrumbOverride.clear(this.breadcrumbPath);
  }

  back(): void {
    const returnUrl = history.state?.returnUrl;

    if (typeof returnUrl === 'string') {
      void this.router.navigateByUrl(returnUrl);
      return;
    }

    void this.router.navigate(['../'], {
      relativeTo: this.route,
    });
  }

  initials(user: UserModel): string {
    return this.userDisplay.initials(user);
  }

  display(value: string | number | boolean | null | undefined): string {
    return value === undefined || value === null || value === '' ? '-' : String(value);
  }

  userStatus(user: UserModel): string {
    return this.userDisplay.status(user);
  }

  statusSeverity(user: UserModel) {
    return this.userDisplay.statusSeverity(user);
  }

  confirmStatusChange(): void {
    const person = this.user();
    const action = this.statusAction();
    if (!person || !action) return;

    const deactivating = action.userStatusId === UserStatus.Inactive;
    this.confirmation.confirm({
      key: 'userStatus',
      header: this.transloco.translate(deactivating ? 'users.deactivateTitle' : 'users.activateTitle'),
      message: this.transloco.translate(deactivating ? 'users.deactivateMessage' : 'users.activateMessage', {
        name: this.fullName(),
      }),
      acceptLabel: action.label,
      rejectLabel: this.transloco.translate('common.cancel'),
      acceptButtonProps: confirmTone(deactivating ? 'danger' : 'warning'),
      accept: () =>
        this.store.dispatch(
          UsersStoreActions.updateUserStatus({
            id: person.id,
            command: { userStatusId: action.userStatusId },
          }),
        ),
    });
  }
}
