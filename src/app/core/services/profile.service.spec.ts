import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { adminApiUrl } from '../constants/api-url.constants';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  const command = {
    name: 'Leyla',
    surname: 'Mammadova',
    phoneNumber: '+994501234567',
    position: 'Project manager',
    languageId: 2,
    birthDate: '1990-05-12',
    genderId: 2,
    maritalStatusId: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // The server binds the form fields by name; a renamed field would silently arrive empty.
  it('sends the profile as multipart with the field names the API binds', () => {
    const avatar = new File(['x'], 'me.png', { type: 'image/png' });

    service.update({ ...command, avatar }).subscribe();

    const request = http.expectOne(`${adminApiUrl}/profile/settings`);
    expect(request.request.method).toBe('PUT');
    const body = request.request.body as FormData;
    expect(Object.fromEntries([...body.entries()].filter(([key]) => key !== 'avatar'))).toEqual({
      name: 'Leyla',
      surname: 'Mammadova',
      phoneNumber: '+994501234567',
      position: 'Project manager',
      languageId: '2',
      birthDate: '1990-05-12',
      genderId: '2',
      maritalStatusId: '1',
    });
    expect((body.get('avatar') as File).name).toBe('me.png');
    request.flush({});
  });

  it('leaves the avatar out when no new photo was chosen', () => {
    service.update({ ...command, avatar: null }).subscribe();

    const request = http.expectOne(`${adminApiUrl}/profile/settings`);
    expect((request.request.body as FormData).has('avatar')).toBe(false);
    request.flush({});
  });
});
