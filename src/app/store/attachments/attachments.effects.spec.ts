import { HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { AttachmentListModel, AttachmentModel } from '../../core/models/attachments';
import { AttachmentsService } from '../../core/services/attachments.service';
import * as Actions from './attachments.actions';
import { AttachmentsEffects } from './attachments.effects';

describe('AttachmentsEffects', () => {
  let actions: Subject<Action>;
  let listResponse: Subject<AttachmentListModel>;
  let uploadResponse: Subject<HttpEvent<AttachmentModel>>;
  let emitted: Action[];
  let effects: AttachmentsEffects;

  beforeEach(() => {
    actions = new Subject<Action>();
    listResponse = new Subject<AttachmentListModel>();
    uploadResponse = new Subject<HttpEvent<AttachmentModel>>();
    emitted = [];
    TestBed.configureTestingModule({
      providers: [
        AttachmentsEffects,
        provideMockActions(() => actions),
        {
          provide: AttachmentsService,
          useValue: { getAttachments: () => listResponse, upload: () => uploadResponse },
        },
      ],
    });
    effects = TestBed.inject(AttachmentsEffects);
  });

  const attachment: AttachmentModel = {
    id: 'a',
    fileName: 'a.pdf',
    contentType: 'application/pdf',
    size: 1,
    createdAt: '2026-09-22T10:00:00Z',
    createdBy: { id: 'u', name: 'A', surname: 'B' },
    workTask: { id: 't', code: '1', name: 'Task' },
  };

  const upload = () =>
    actions.next(
      Actions.upload({ uploadId: 'u1', listKey: 'task:t', projectId: 'p', workTaskId: 't', file: new File(['x'], 'a.pdf') }),
    );

  it('drops the answer for a list that was cleared', () => {
    effects.loadList$.subscribe((action) => emitted.push(action));
    actions.next(Actions.loadList({ listKey: 'task:t', projectId: 'p', scope: { kind: 'task', workTaskId: 't' } }));
    actions.next(Actions.clearList({ listKey: 'task:t' }));
    listResponse.next({ items: [], hasMore: false });

    expect(emitted).toEqual([]);
  });

  it('reports progress and then the stored file', () => {
    effects.upload$.subscribe((action) => emitted.push(action));
    upload();
    uploadResponse.next({ type: HttpEventType.UploadProgress, loaded: 50, total: 200 });
    uploadResponse.next(new HttpResponse({ body: attachment }));

    expect(emitted).toEqual([
      Actions.uploadProgress({ uploadId: 'u1', progress: 25 }),
      Actions.uploadSuccess({ uploadId: 'u1', listKey: 'task:t', attachment }),
    ]);
  });

  it('turns a refused upload into the server message', () => {
    effects.upload$.subscribe((action) => emitted.push(action));
    upload();
    uploadResponse.error(
      new HttpErrorResponse({
        status: 400,
        error: { errors: [{ field: 'File', error: 'This file type is not supported.' }] },
      }),
    );

    expect(emitted).toEqual([
      Actions.uploadFailure({
        uploadId: 'u1',
        error: 'This file type is not supported.',
        retryable: false,
      }),
    ]);
  });

  it('says the file is too large when the server cuts the request off', () => {
    effects.upload$.subscribe((action) => emitted.push(action));
    upload();
    uploadResponse.error(new HttpErrorResponse({ status: 413 }));

    expect(emitted).toEqual([
      Actions.uploadFailure({
        uploadId: 'u1',
        error: 'This file is larger than 25 MB.',
        retryable: false,
      }),
    ]);
  });

  /* No answer is not a verdict on the file: only this failure offers Retry. */
  it('lets a lost connection be retried', () => {
    effects.upload$.subscribe((action) => emitted.push(action));
    upload();
    uploadResponse.error(new HttpErrorResponse({ status: 0 }));

    expect(emitted).toEqual([
      Actions.uploadFailure({
        uploadId: 'u1',
        error: 'The server could not be reached. Check the connection and retry.',
        retryable: true,
      }),
    ]);
  });

  it('stops listening to an upload that was cancelled', () => {
    effects.upload$.subscribe((action) => emitted.push(action));
    upload();
    actions.next(Actions.dismissUpload({ uploadId: 'u1' }));
    uploadResponse.next(new HttpResponse({ body: attachment }));

    expect(emitted).toEqual([]);
  });
});
