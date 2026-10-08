import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import {
  AttachmentListModel,
  AttachmentModel,
  AttachmentScope,
  AttachmentTreeModel,
} from '../models/attachments';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private readonly http = inject(HttpClient);

  getAttachments(projectId: string, scope: AttachmentScope): Observable<AttachmentListModel> {
    const params = new HttpParams().set(...scopeParam(scope));
    return this.http.get<AttachmentListModel>(`${this.url(projectId)}/attachments`, { params });
  }

  getTree(projectId: string): Observable<AttachmentTreeModel> {
    return this.http.get<AttachmentTreeModel>(`${this.url(projectId)}/attachments/tree`);
  }

  // one request per file so every file has its own progress and error
  upload(
    projectId: string,
    workTaskId: string,
    file: File,
  ): Observable<HttpEvent<AttachmentModel>> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<AttachmentModel>(
      `${this.url(projectId)}/work-tasks/${workTaskId}/attachments`,
      body,
      { reportProgress: true, observe: 'events' },
    );
  }

  // without extension, server keeps the original one
  rename(projectId: string, attachmentId: string, fileName: string): Observable<void> {
    return this.http.patch<void>(`${this.url(projectId)}/attachments/${attachmentId}`, {
      fileName,
    });
  }

  delete(projectId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(projectId)}/attachments/${attachmentId}`);
  }

  // through HttpClient not a plain link, the token goes in a header
  getContent(projectId: string, attachmentId: string, inline = false): Observable<Blob> {
    const params = inline ? new HttpParams().set('inline', true) : undefined;
    return this.http.get(`${this.url(projectId)}/attachments/${attachmentId}/content`, {
      params,
      responseType: 'blob',
    });
  }

  private url(projectId: string): string {
    return `${projectApiUrl}/project/${projectId}`;
  }
}

function scopeParam(scope: AttachmentScope): [string, string] {
  switch (scope.kind) {
    case 'task':
      return ['workTaskId', scope.workTaskId];
    case 'subtasks':
      return ['parentWorkTaskId', scope.parentWorkTaskId];
    case 'ticket':
      return ['workTicketId', scope.workTicketId];
  }
}
