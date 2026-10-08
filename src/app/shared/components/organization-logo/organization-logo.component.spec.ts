import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganizationLogoComponent } from './organization-logo.component';

describe('OrganizationLogoComponent', () => {
  let fixture: ComponentFixture<OrganizationLogoComponent>;

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationLogoComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(OrganizationLogoComponent);
    fixture.componentRef.setInput('title', 'Kapital Bank');
  });

  it('shows the logo image when a path is given', () => {
    fixture.componentRef.setInput('logoPath', 'organizations/kapital.png');
    fixture.detectChanges();

    const img = element().querySelector('img');
    expect(img?.getAttribute('src')).toContain('/app/images/organizations/kapital.png');
    expect(element().querySelector('.organization-logo')?.getAttribute('aria-label')).toBe(
      'Kapital Bank',
    );
  });

  it.each([null, undefined, ''])('shows initials when the path is %j', (logoPath) => {
    fixture.componentRef.setInput('logoPath', logoPath);
    fixture.detectChanges();

    expect(element().querySelector('img')).toBeNull();
    expect(element().textContent?.trim()).toBe('KB');
  });

  // A long list asks only for the logos on screen.
  it('loads the logo lazily', () => {
    fixture.componentRef.setInput('logoPath', 'organizations/apple.jpg');
    fixture.detectChanges();

    expect(element().querySelector('img')?.getAttribute('loading')).toBe('lazy');
  });

  it('falls back to initials when the image fails to load', () => {
    fixture.componentRef.setInput('logoPath', 'organizations/missing.png');
    fixture.detectChanges();

    element().querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element().querySelector('img')).toBeNull();
    expect(element().textContent?.trim()).toBe('KB');
  });
});
