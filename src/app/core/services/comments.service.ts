import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import {
  CommentModel,
  CommentPageModel,
  CreateCommentCommand,
  UpdateCommentCommand,
} from '../models/comments';

/** Comments on one page: enough to read the recent discussion without scrolling far. */
export const COMMENTS_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private readonly http = inject(HttpClient);

  getComments(
    projectId: string,
    workTaskId: string,
    cursor?: string | null,
  ): Observable<CommentPageModel> {
    let params = new HttpParams().set('workTaskId', workTaskId).set('pageSize', COMMENTS_PAGE_SIZE);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<CommentPageModel>(this.url(projectId), { params });
  }

  /** One comment still there: what a pushed change puts on screen instead of a whole page. */
  getComment(projectId: string, commentId: string): Observable<CommentModel> {
    return this.http.get<CommentModel>(`${this.url(projectId)}/${commentId}`);
  }

  create(projectId: string, command: CreateCommentCommand): Observable<CommentModel> {
    return this.http.post<CommentModel>(this.url(projectId), command);
  }

  update(
    projectId: string,
    commentId: string,
    command: UpdateCommentCommand,
  ): Observable<CommentModel> {
    return this.http.put<CommentModel>(`${this.url(projectId)}/${commentId}`, command);
  }

  delete(projectId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(projectId)}/${commentId}`);
  }

  private url(projectId: string): string {
    return `${projectApiUrl}/project/${projectId}/comments`;
  }
}
