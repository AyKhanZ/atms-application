import { AttachmentModel } from '../../core/models/attachments';
import { AuthStoreActions } from '../auth';
import * as Actions from './attachments.actions';
import { attachmentsReducer } from './attachments.reducer';
import { AttachmentsState, initialAttachmentsState } from './attachments.state';

function file(id: string, fileName = `${id}.pdf`): AttachmentModel {
  return {
    id,
    fileName,
    contentType: 'application/pdf',
    size: 1,
    createdAt: '2026-09-22T10:00:00Z',
    createdBy: { id: 'u', name: 'A', surname: 'B' },
    workTask: { id: 't', code: '1', name: 'Task' },
  };
}

const withLists = (lists: AttachmentsState['lists']): AttachmentsState => ({
  ...initialAttachmentsState,
  lists,
});

const list = (...items: AttachmentModel[]) => ({ items, hasMore: false, loading: false, error: null });

describe('attachmentsReducer', () => {
  /* Opening the tab again must not blank the rows while the list is read. */
  it('keeps the rows already shown while a list reloads', () => {
    const state = attachmentsReducer(
      withLists({ 'task:1': list(file('a')) }),
      Actions.loadList({ listKey: 'task:1', projectId: 'p', scope: { kind: 'task', workTaskId: '1' } }),
    );

    expect(state.lists['task:1'].items.map((item) => item.id)).toEqual(['a']);
    expect(state.lists['task:1'].loading).toBe(true);
  });

  it('puts a landed upload on top of its list and drops its progress row', () => {
    const uploading = attachmentsReducer(
      withLists({ 'task:1': list(file('a')) }),
      Actions.upload({
        uploadId: 'u1',
        listKey: 'task:1',
        projectId: 'p',
        workTaskId: '1',
        fileName: 'b.pdf',
        size: 1,
      }),
    );
    expect(uploading.uploads).toEqual([
      {
        uploadId: 'u1',
        listKey: 'task:1',
        fileName: 'b.pdf',
        size: 1,
        progress: 0,
        error: null,
        retryable: false,
      },
    ]);

    const landed = attachmentsReducer(
      uploading,
      Actions.uploadSuccess({ uploadId: 'u1', listKey: 'task:1', attachment: file('b') }),
    );

    expect(landed.uploads).toEqual([]);
    expect(landed.lists['task:1'].items.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('keeps a failed upload with its reason until it is dismissed', () => {
    let state = attachmentsReducer(
      initialAttachmentsState,
      Actions.upload({ uploadId: 'u1', listKey: 'task:1', projectId: 'p', workTaskId: '1', fileName: 'b.pdf', size: 1 }),
    );
    state = attachmentsReducer(state, Actions.uploadFailure({ uploadId: 'u1', error: 'Too big', retryable: false }));
    expect(state.uploads[0].error).toBe('Too big');

    state = attachmentsReducer(state, Actions.dismissUpload({ uploadId: 'u1' }));
    expect(state.uploads).toEqual([]);
  });

  it('renames and removes a file in every list that shows it', () => {
    const initial = withLists({ 'task:1': list(file('a'), file('b')), 'ticket:k': list(file('a')) });

    const renamed = attachmentsReducer(
      attachmentsReducer(initial, Actions.rename({ projectId: 'p', attachmentId: 'a', baseName: 'new', fileName: 'new.pdf' })),
      Actions.renameSuccess({ attachmentId: 'a', fileName: 'new.pdf' }),
    );
    expect(renamed.lists['task:1'].items[0].fileName).toBe('new.pdf');
    expect(renamed.lists['ticket:k'].items[0].fileName).toBe('new.pdf');
    expect(renamed.pendingIds).toEqual([]);

    const removed = attachmentsReducer(renamed, Actions.removeSuccess({ attachmentId: 'a' }));
    expect(removed.lists['task:1'].items.map((item) => item.id)).toEqual(['b']);
    expect(removed.lists['ticket:k'].items).toEqual([]);
  });

  it('marks a file pending while it changes and clears it when the change fails', () => {
    const pending = attachmentsReducer(initialAttachmentsState, Actions.remove({ projectId: 'p', attachmentId: 'a' }));
    expect(pending.pendingIds).toEqual(['a']);

    const failed = attachmentsReducer(
      pending,
      Actions.removeFailure({ attachmentId: 'a', error: { status: 403, message: null } }),
    );
    expect(failed.pendingIds).toEqual([]);
  });

  it('drops only the cleared list and tree', () => {
    const state = attachmentsReducer(
      attachmentsReducer(
        {
          ...withLists({ 'task:1': list(), 'task:2': list() }),
          trees: { p1: { tree: null, loading: false, error: null }, p2: { tree: null, loading: false, error: null } },
        },
        Actions.clearList({ listKey: 'task:1' }),
      ),
      Actions.clearTree({ projectId: 'p1' }),
    );

    expect(Object.keys(state.lists)).toEqual(['task:2']);
    expect(Object.keys(state.trees)).toEqual(['p2']);
  });

  it('forgets everything when the session ends', () => {
    const state = attachmentsReducer(withLists({ 'task:1': list(file('a')) }), AuthStoreActions.logoutCompleted());

    expect(state).toEqual(initialAttachmentsState);
  });
});
