import { HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { AttachmentListModel, AttachmentModel } from '../../core/models/attachments';
import { AttachmentUploadFilesService } from '../../core/services/attachment-upload-files.service';
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

  const upload = () => {
    TestBed.inject(AttachmentUploadFilesService).put('u1', new File(['x'], 'a.pdf'));
    actions.next(
      Actions.upload({
        uploadId: 'u1',
        listKey: 'task:t',
        projectId: 'p',
        workTaskId: 't',
        fileName: 'a.pdf',
        size: 1,
      }),
    );
  };

  it('drops the answer for a list that was cleared', () => {
    effects.loadList$.subscribe((action) => emitted.push(action));
    actions.next(
      Actions.loadList({
        listKey: 'task:t',
        projectId: 'p',
        scope: { kind: 'task', workTaskId: 't' },
      }),
    );
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

  /* The file waits in the registry only while it may still be sent. */
  it('lets go of the file once it has landed', () => {
    effects.upload$.subscribe((action) => emitted.push(action));
    upload();
    uploadResponse.next(new HttpResponse({ body: attachment }));

    expect(TestBed.inject(AttachmentUploadFilesService).get('u1')).toBeUndefined();
  });

  it('keeps the file for Retry after a lost connection, and not after a refusal', () => {
    const files = TestBed.inject(AttachmentUploadFilesService);
    effects.upload$.subscribe((action) => emitted.push(action));

    upload();
    uploadResponse.error(new HttpErrorResponse({ status: 0 }));
    expect(files.get('u1')).toBeDefined();

    uploadResponse = new Subject<HttpEvent<AttachmentModel>>();
    upload();
    uploadResponse.error(new HttpErrorResponse({ status: 400 }));
    expect(files.get('u1')).toBeUndefined();
  });

  /* Only three go at once. The fourth, cancelled while it waited, used to be sent anyway as soon
     as the first finished: its cancel came before it was listening. */
  it('never sends a file cancelled while it waited for its turn', () => {
    const service = TestBed.inject(AttachmentsService) as unknown as {
      upload: (
        projectId: string,
        workTaskId: string,
        file: File,
      ) => Subject<HttpEvent<AttachmentModel>>;
    };
    const files = TestBed.inject(AttachmentUploadFilesService);
    const started: string[] = [];
    const responses: Subject<HttpEvent<AttachmentModel>>[] = [];
    service.upload = (_projectId, _workTaskId, file) => {
      started.push(file.name);
      const response = new Subject<HttpEvent<AttachmentModel>>();
      responses.push(response);
      return response;
    };
    effects.upload$.subscribe((action) => emitted.push(action));
    effects.releaseFiles$.subscribe();

    for (const name of ['1', '2', '3', '4']) {
      files.put(name, new File(['x'], `${name}.pdf`));
      actions.next(
        Actions.upload({
          uploadId: name,
          listKey: 'task:t',
          projectId: 'p',
          workTaskId: 't',
          fileName: `${name}.pdf`,
          size: 1,
        }),
      );
    }
    actions.next(Actions.dismissUpload({ uploadId: '4' }));
    responses[0].next(new HttpResponse({ body: attachment }));
    responses[0].complete();

    expect(started).toEqual(['1.pdf', '2.pdf', '3.pdf']);
    expect(emitted.some((action) => 'uploadId' in action && action.uploadId === '4')).toBe(false);
  });

  it('stops listening to an upload that was cancelled', () => {
    effects.upload$.subscribe((action) => emitted.push(action));
    upload();
    actions.next(Actions.dismissUpload({ uploadId: 'u1' }));
    uploadResponse.next(new HttpResponse({ body: attachment }));

    expect(emitted).toEqual([]);
  });
});
