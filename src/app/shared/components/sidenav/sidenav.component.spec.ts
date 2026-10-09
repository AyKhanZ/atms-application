import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Roles } from '../../../core/enums/roles.enum';
import { Features } from '../../../store/features.enum';
import { initialUserState } from '../../../store/user/user.state';
import { SidenavComponent } from './sidenav.component';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
describe('SidenavComponent', () => {
  let store: MockStore;

  const settingsLink = (roles: { code: string }[]) => {
    store.setState({ [Features.User]: { ...initialUserState, roles } });
    const fixture = TestBed.createComponent(SidenavComponent);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('a[href="/settings"]');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavComponent],
      providers: [...translocoTestingProviders(), 
        provideRouter([]),
        provideMockStore({ initialState: { [Features.User]: initialUserState } }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
  });

  it('shows Settings to an ordinary user', () => {
    expect(settingsLink([{ code: 'Employee' }])).not.toBeNull();
  });

  it('hides Settings from a super admin', () => {
    expect(settingsLink([{ code: Roles.SuperAdmin }])).toBeNull();
  });
});
