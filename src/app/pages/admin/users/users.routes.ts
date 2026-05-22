import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/guards/permission.guard';
import { Permissions } from '../../../core/enums/permissions.enum';
import { UsersFilterService } from '../../../core/services/users-filter.service';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/users-list.component')
      .then((c) => c.UsersListComponent),
    // UsersFilterService — провайдим на уровне роута (не root)
    // чтобы ActivatedRoute внутри сервиса видел правильный контекст
    providers: [UsersFilterService],
    canActivate: [permissionGuard(Permissions.User.View)],
  },
];
