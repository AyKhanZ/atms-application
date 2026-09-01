import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TagModule } from 'primeng/tag';
import { UserModel } from '../../../../core/models/users/users.models';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { UserDisplayService } from '../../../../core/services/user-display.service';
import { UsersStoreActions, UsersStoreSelectors } from '../../../../store/users';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { ProfileAvatarComponent } from '../../../../shared/components/profile-avatar/profile-avatar.component';

@Component({
  selector: 'app-user-details',
  imports: [DatePipe, TagModule, BackButtonComponent, ProfileAvatarComponent],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly userDisplay = inject(UserDisplayService);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private breadcrumbPath = '';

  readonly user = this.store.selectSignal(UsersStoreSelectors.getItem);
  readonly loading = this.store.selectSignal(UsersStoreSelectors.isLoading);
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
}
