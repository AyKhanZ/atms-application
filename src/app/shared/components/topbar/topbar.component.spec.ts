import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Roles } from '../../../core/enums/roles.enum';
import { Features } from '../../../store/features.enum';
import { initialUserState } from '../../../store/user/user.state';
import { TopbarComponent } from './topbar.component';

describe('TopbarComponent user menu', () => {
  let store: MockStore;

  const menuLabels = (roles: { code: string }[]) => {
    store.setState({ [Features.User]: { ...initialUserState, roles } });
    const component = TestBed.createComponent(TopbarComponent).componentInstance;
    return component.userMenuItems().map((item) => item.label ?? 'separator');
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [Features.User]: initialUserState } }),
      ],
    })
      // The menu model is what is under test; search and the bell bring their own stores.
      .overrideComponent(TopbarComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    store = TestBed.inject(MockStore);
  });

  it('offers Settings and Logout to an ordinary user', () => {
    expect(menuLabels([{ code: 'Employee' }])).toEqual(['Settings', 'separator', 'Logout']);
  });

  it('offers only Logout to a super admin', () => {
    expect(menuLabels([{ code: Roles.SuperAdmin }])).toEqual(['Logout']);
  });

  it('opens /settings from the menu', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    store.setState({ [Features.User]: { ...initialUserState, roles: [{ code: 'Employee' }] } });
    const component = TestBed.createComponent(TopbarComponent).componentInstance;

    component.userMenuItems()[0].command?.({});

    expect(navigate).toHaveBeenCalledWith(['/settings']);
  });
});
