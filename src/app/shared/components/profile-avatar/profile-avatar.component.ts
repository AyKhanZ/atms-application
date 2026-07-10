import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ImageUrlService } from '../../../core/services/image-url.service';

@Component({
  selector: 'app-profile-avatar',
  imports: [DialogModule],
  templateUrl: './profile-avatar.component.html',
  styleUrl: './profile-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileAvatarComponent {
  private readonly imageUrlService = inject(ImageUrlService);

  readonly imageUrl = input<string | null | undefined>(null);
  readonly fullName = input('');
  readonly initials = input('U');
  readonly previewEnabled = input(true);

  readonly previewVisible = signal(false);
  private readonly failedImageUrl = signal<string | null>(null);
  readonly normalizedImageUrl = computed(() => this.imageUrlService.normalize(this.imageUrl()));

  readonly canShowImage = computed(() => {
    const imageUrl = this.normalizedImageUrl();
    return Boolean(imageUrl && imageUrl !== this.failedImageUrl());
  });

  openPreview(): void {
    if (!this.previewEnabled() || !this.canShowImage()) {
      return;
    }

    this.previewVisible.set(true);
  }

  onImageError(): void {
    this.failedImageUrl.set(this.normalizedImageUrl());
  }
}
