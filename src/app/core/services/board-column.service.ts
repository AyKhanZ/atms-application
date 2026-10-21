import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { BoardColumnModel } from '../models/board-columns';

@Injectable({ providedIn: 'root' })
export class BoardColumnService {
  private readonly http = inject(HttpClient);
  private readonly url = `${projectApiUrl}/board-columns`;

  getAll(): Observable<BoardColumnModel[]> {
    return this.http.get<BoardColumnModel[]>(this.url);
  }
}
