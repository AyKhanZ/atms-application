import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageSwitcherComponent } from '../../components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.html',
  styleUrls: ['./auth-layout.scss'],
  imports: [RouterOutlet, LanguageSwitcherComponent],
})
export class AuthLayoutComponent {}
