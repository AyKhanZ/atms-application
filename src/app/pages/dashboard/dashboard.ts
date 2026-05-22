import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthStoreActions, AuthStoreSelectors } from '../../store/auth';
import { JsonPipe } from '@angular/common';
import { UserStoreSelectors } from '../../store/user';

@Component({
  selector: 'app-dashboard',
  imports: [JsonPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly store = inject(Store);
  accessModel = this.store.selectSignal(AuthStoreSelectors.getAccessModel);
  meModel = this.store.selectSignal(UserStoreSelectors.getMe);
}
