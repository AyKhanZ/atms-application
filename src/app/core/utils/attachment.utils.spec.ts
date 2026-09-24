import {
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_OFFICE_PREVIEW_BYTES,
  attachmentFileError,
  attachmentIcon,
  attachmentListKey,
  attachmentNameError,
  attachmentPreviewKind,
  attachmentTone,
  canPreviewAttachment,
  formatFileSize,
  splitFileName,
} from './attachment.utils';

const file = (name: string, size: number) => new File([new Uint8Array(size)], name);

describe('attachment utils', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [38 * 1024, '38 KB'],
    [2.4 * 1024 * 1024, '2.4 MB'],
    [25 * 1024 * 1024, '25 MB'],
  ])('formats %d bytes as %s', (bytes, label) => {
    expect(formatFileSize(bytes)).toBe(label);
  });

  it.each([
    ['spec.pdf', 'pi-file-pdf', 'pdf'],
    ['Report.DOCX', 'pi-file-word', 'document'],
    ['rates.xlsx', 'pi-file-excel', 'sheet'],
    ['data.csv', 'pi-file-excel', 'sheet'],
    ['shot.png', 'pi-image', 'image'],
    ['bundle.zip', 'pi-box', 'archive'],
    ['slides.pptx', 'pi-file', 'other'],
    ['links.txt', 'pi-align-left', 'other'],
  ])('draws %s with %s in the %s colour', (name, icon, tone) => {
    expect(attachmentIcon(name)).toBe(icon);
    expect(attachmentTone(name)).toBe(tone);
  });

  it('splits the name at the last dot and keeps a dotfile whole', () => {
    expect(splitFileName('Report.v2.pdf')).toEqual({ base: 'Report.v2', extension: '.pdf' });
    expect(splitFileName('README')).toEqual({ base: 'README', extension: '' });
    expect(splitFileName('.env')).toEqual({ base: '.env', extension: '' });
  });

  it.each([
    ['application/pdf', 'pdf'],
    ['image/webp', 'image'],
    ['text/plain', 'text'],
    ['text/csv', 'sheet'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'sheet'],
    ['application/vnd.ms-excel', 'sheet'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
    ['application/msword', null],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', null],
    ['application/zip', null],
  ])('opens %s as %s', (contentType, kind) => {
    expect(attachmentPreviewKind({ contentType, size: 1024 })).toBe(kind);
  });

  it('previews everything that has a kind, and nothing else', () => {
    expect(canPreviewAttachment({ contentType: 'application/pdf', size: 1 })).toBe(true);
    expect(canPreviewAttachment({ contentType: 'application/msword', size: 1 })).toBe(false);
    expect(canPreviewAttachment({ contentType: 'application/zip', size: 1 })).toBe(false);
  });

  /* A Word or Excel file is a zip unpacked in the browser; a crafted big one could hang the tab. */
  it.each([
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', null],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null],
    ['application/vnd.ms-excel', null],
    ['text/csv', 'sheet'],
    ['application/pdf', 'pdf'],
  ])('past 10 MB opens %s as %s', (contentType, kind) => {
    expect(attachmentPreviewKind({ contentType, size: MAX_OFFICE_PREVIEW_BYTES + 1 })).toBe(kind);
  });

  it('keys each scope apart', () => {
    expect(attachmentListKey({ kind: 'task', workTaskId: '1' })).toBe('task:1');
    expect(attachmentListKey({ kind: 'subtasks', parentWorkTaskId: '1' })).toBe('subtasks:1');
    expect(attachmentListKey({ kind: 'ticket', workTicketId: '1' })).toBe('ticket:1');
  });

  describe('attachmentFileError', () => {
    it('accepts a listed type within the size', () => {
      expect(attachmentFileError(file('spec.pdf', 10))).toBeNull();
    });

    it.each(['virus.exe', 'page.html', 'drawing.svg', 'archive.rar', 'noextension'])(
      'refuses %s',
      (name) => {
        expect(attachmentFileError(file(name, 10))).toContain("isn't supported");
      },
    );

    it('refuses an empty file', () => {
      expect(attachmentFileError(file('empty.pdf', 0))).toBe('This file is empty.');
    });

    it('refuses a file over 25 MB', () => {
      const big = { name: 'big.pdf', size: MAX_ATTACHMENT_SIZE_BYTES + 1 } as File;
      expect(attachmentFileError(big)).toBe('This file is larger than 25 MB.');
    });
  });

  describe('attachmentNameError', () => {
    it.each([
      ['', 'Enter a file name.'],
      ['   ', 'Enter a file name.'],
      ['a'.repeat(201), 'The file name must be 200 characters or fewer.'],
      ['a/b', 'The file name can\'t contain \\ / : * ? " < > |'],
    ])('rejects %j', (name, message) => {
      expect(attachmentNameError(name)).toBe(message);
    });

    it('accepts an ordinary name', () => {
      expect(attachmentNameError('Отчёт за сентябрь')).toBeNull();
    });
  });
});
