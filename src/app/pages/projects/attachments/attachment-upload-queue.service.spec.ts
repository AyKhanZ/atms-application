import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AttachmentUploadModel } from '../../../core/models/attachments';
import { AttachmentUploadFilesService } from '../../../core/services/attachment-upload-files.service';
import { AttachmentsStoreActions, AttachmentsStoreSelectors } from '../../../store/attachments';
import { AttachmentUploadQueueService } from './attachment-upload-queue.service';

describe('AttachmentUploadQueueService', () => {
  let store: MockStore;
  let queue: AttachmentUploadQueueService;
  let files: AttachmentUploadFilesService;
  let dispatched: { type: string; uploadId?: string; fileName?: string }[];

  const pdf = (name = 'spec.pdf') => new File(['%PDF'], name);

  function uploads(...items: Partial<AttachmentUploadModel>[]): void {
    store.overrideSelector(
      AttachmentsStoreSelectors.getUploads,
      items.map((item, index) => ({
        uploadId: `u${index}`,
        listKey: 'task:t',
        fileName: `f${index}.pdf`,
        size: 1,
        progress: 0,
        error: null,
        retryable: false,
        ...item,
      })),
    );
    store.refreshState();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AttachmentUploadQueueService, provideMockStore()],
    });
    store = TestBed.inject(MockStore);
    uploads();
    files = TestBed.inject(AttachmentUploadFilesService);
    queue = TestBed.inject(AttachmentUploadQueueService);
    queue.target.set({ projectId: 'p', workTaskId: 't', listKey: 'task:t', kind: 'subtask' });
    dispatched = [];
    store.scannedActions$.subscribe((action) => dispatched.push(action));
  });

  const sent = () => dispatched.filter((action) => action.type === AttachmentsStoreActions.upload.type);

  it('sends every accepted file, keeping it for the effect, and no File in the action', () => {
    queue.add([pdf('a.pdf'), pdf('b.pdf')], 0);

    expect(sent().map((action) => action.fileName)).toEqual(['a.pdf', 'b.pdf']);
    expect(sent().every((action) => files.get(action.uploadId!) instanceof File)).toBe(true);
    expect(JSON.stringify(sent())).not.toContain('File');
  });

  it('refuses a wrong type before sending and says why', () => {
    queue.add([new File(['x'], 'notes.md'), pdf()], 0);

    expect(sent().length).toBe(1);
    expect(queue.refused()).toEqual([
      expect.objectContaining({ fileName: 'notes.md', reason: expect.stringContaining("isn't supported") }),
    ]);
  });

  /* The server stops at 100; the files past the room left are refused here, not one by one there. */
  it('refuses the files past the room left, counting files on their way', () => {
    uploads({}, {});

    queue.add([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')], 97);

    expect(sent().map((action) => action.fileName)).toEqual(['a.pdf']);
    expect(queue.refused().map((item) => item.fileName)).toEqual(['b.pdf', 'c.pdf']);
    expect(queue.refused()[0].reason).toBe('This subtask can hold 100 files. Delete some to add more.');
  });

  it('shows in flight and network failures as rows, and refusals only in the banner', () => {
    uploads(
      { fileName: 'going.pdf' },
      { fileName: 'dropped.pdf', error: 'No connection', retryable: true },
      { fileName: 'refused.pdf', error: 'Too big', retryable: false },
      { fileName: 'other-task.pdf', listKey: 'task:x' },
    );

    expect(queue.rows().map((row) => row.fileName)).toEqual(['going.pdf', 'dropped.pdf']);
    expect(queue.refused().map((item) => item.fileName)).toEqual(['refused.pdf']);
  });

  it('sends a dropped file again under a new id and forgets the old one', () => {
    uploads({ uploadId: 'old', error: 'No connection', retryable: true });
    files.put('old', pdf('again.pdf'));

    queue.retry('old');

    expect(dispatched).toContainEqual(AttachmentsStoreActions.dismissUpload({ uploadId: 'old' }));
    expect(sent().map((action) => action.fileName)).toEqual(['again.pdf']);
    expect(sent()[0].uploadId).not.toBe('old');
  });

  it('clears the banner when new files are picked', () => {
    queue.add([new File(['x'], 'a.md')], 0);
    queue.add([pdf()], 0);

    expect(queue.refused()).toEqual([]);
  });

  it('does nothing without a task to add to', () => {
    queue.target.set(null);
    queue.add([pdf()], 0);

    expect(sent()).toEqual([]);
  });
});
