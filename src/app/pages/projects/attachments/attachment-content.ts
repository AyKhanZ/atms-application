// both libs are loaded only here on demand

// a sheet is for looking, bigger ones are downloaded
export const MAX_SHEET_ROWS = 500;
export const MAX_SHEET_COLUMNS = 50;

export interface SheetPreview {
  name: string;
  rows: string[][];
  // A, B, ... Z, AA like excel
  columns: string[];
  truncated: boolean;
}

// utf-8 first, otherwise windows-1251 (old ru/az notepad and excel files)
// a cut at the size limit can break the last char, a broken tail alone isnt "not utf-8"
export function decodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true });
  } catch {
    return new TextDecoder('windows-1251').decode(bytes);
  }
}

// excel in ru/az locale writes ; instead of , - whatever the first line has more of
export function csvSeparator(text: string): string {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'));
  const count = (separator: string) => firstLine.split(separator).length - 1;
  const candidates = [';', ',', '\t'];
  return candidates.reduce(
    (best, separator) => (count(separator) > count(best) ? separator : best),
    ',',
  );
}

export function columnLetter(index: number): string {
  let letter = '';
  for (let rest = index + 1; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    letter = String.fromCharCode(65 + ((rest - 1) % 26)) + letter;
  }
  return letter;
}

// values as excel shows them, no formulas, no html
export async function readSheets(buffer: ArrayBuffer, csv: boolean): Promise<SheetPreview[]> {
  const XLSX = await import('xlsx');
  // one row over the limit so a cut sheet can say so
  const sheetRows = MAX_SHEET_ROWS + 1;
  const workbook = csv
    ? (() => {
        const text = decodeText(buffer);
        return XLSX.read(text, { type: 'string', FS: csvSeparator(text), sheetRows, raw: true });
      })()
    : XLSX.read(buffer, { type: 'array', sheetRows, cellHTML: false, cellFormula: false });

  return workbook.SheetNames.map((name) => {
    const all = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    });
    const width = Math.min(
      MAX_SHEET_COLUMNS,
      all.reduce((widest, row) => Math.max(widest, row.length), 0),
    );
    const rows = all
      .slice(0, MAX_SHEET_ROWS)
      .map((row) => Array.from({ length: width }, (_, column) => String(row[column] ?? '')));
    return {
      name,
      rows,
      columns: Array.from({ length: width }, (_, column) => columnLetter(column)),
      truncated: all.length > MAX_SHEET_ROWS || all.some((row) => row.length > MAX_SHEET_COLUMNS),
    };
  });
}

// sandboxed iframe so the file cant run scripts, reach storage or restyle the app
// colors are read once from app tokens, the frame cant see our css
function documentFrame(frame: HTMLIFrameElement): Promise<Document> {
  const tokens = getComputedStyle(document.documentElement);
  const backdrop = tokens.getPropertyValue('--app-surface-muted').trim() || '#f7f8fa';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; background: ${backdrop}; }
    .docx-wrapper { align-items: safe center; padding: 1.25rem; background: ${backdrop}; }
    .docx-wrapper > section.docx { max-width: 100%; margin-bottom: 1.25rem; box-shadow: 0 1px 3px rgb(15 23 42 / 12%); }
    @media (max-width: 767px) {
      .docx-wrapper { padding: 0.5rem; }
      .docx-wrapper > section.docx { padding: 1rem !important; }
    }
  </style></head><body><div id="docx-styles"></div><div id="docx-body"></div></body></html>`;

  return new Promise((resolve, reject) => {
    frame.addEventListener(
      'load',
      () =>
        frame.contentDocument
          ? resolve(frame.contentDocument)
          : reject(new Error('No frame document.')),
      { once: true },
    );
    frame.srcdoc = html;
  });
}

// links are kept only for web pages and emails, open in a new tab
export async function renderDocument(
  blob: Blob,
  frame: HTMLIFrameElement,
  narrow: boolean,
): Promise<void> {
  const [{ renderAsync }, page] = await Promise.all([import('docx-preview'), documentFrame(frame)]);
  const styles = page.getElementById('docx-styles');
  const body = page.getElementById('docx-body');
  if (!styles || !body) throw new Error('The document frame did not load.');

  await renderAsync(blob, body, styles, {
    className: 'docx',
    inWrapper: true,
    // on a phone the page reflows instead of a 21cm sheet
    ignoreWidth: narrow,
    ignoreHeight: narrow,
    breakPages: !narrow,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    // altChunk (raw html) would go into an unsandboxed iframe with our origin, a script would run as the user, so its not shown
    renderAltChunks: false,
    experimental: false,
    useBase64URL: false,
  });

  body.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (href.startsWith('#')) return;
    if (!/^(https?:|mailto:)/i.test(href)) {
      link.removeAttribute('href');
      return;
    }
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
}
