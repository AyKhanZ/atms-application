import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BreadcrumbsComponent } from '../../components/breadcrumbs/breadcrumbs.component';
import { SidenavComponent } from '../../components/sidenav/sidenav.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, SidenavComponent, TopbarComponent, BreadcrumbsComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayoutComponent {
  layout = inject(LayoutService);
}
