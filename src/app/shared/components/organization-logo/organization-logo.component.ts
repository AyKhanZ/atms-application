import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ImageUrlService } from '../../../core/services/image-url.service';
import { organizationInitials } from '../../../core/utils/organization.utils';

/**
 * Small square logo of an organization, or its initials when there is no image.
 * Size is set from outside with `--organization-logo-size` (default 2.25rem).
 */
@Component({
  selector: 'app-organization-logo',
  imports: [],
  templateUrl: './organization-logo.component.html',
  styleUrl: './organization-logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationLogoComponent {
  private readonly imageUrlService = inject(ImageUrlService);

  readonly logoPath = input<string | null | undefined>(null);
  readonly title = input.required<string>();

  private readonly failedImageUrl = signal<string | null>(null);
  private readonly imageUrl = computed(() => this.imageUrlService.normalize(this.logoPath()));

  readonly visibleImageUrl = computed(() => {
    const imageUrl = this.imageUrl();
    return imageUrl && imageUrl !== this.failedImageUrl() ? imageUrl : null;
  });
  readonly initials = computed(() => organizationInitials(this.title()));

  onImageError(): void {
    this.failedImageUrl.set(this.imageUrl());
  }
}
