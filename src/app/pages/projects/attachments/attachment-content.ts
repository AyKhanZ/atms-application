/**
 * Turning a downloaded file into something the preview can draw. The two libraries are loaded
 * only here, on demand: nobody pays for them until a document or a sheet is actually opened.
 */

/** A sheet is looked at, not worked in: past this the file is a download away. */
export const MAX_SHEET_ROWS = 500;
export const MAX_SHEET_COLUMNS = 50;

export interface SheetPreview {
  name: string;
  rows: string[][];
  /** Letters over the columns, the way Excel labels them: A, B, … Z, AA. */
  columns: string[];
  truncated: boolean;
}

/**
 * UTF-8 first; a file that is not valid UTF-8 is read as Windows-1251, which is what an older
 * Russian or Azerbaijani Notepad or Excel file most likely is. A cut at a size limit can split the
 * last character, so a broken tail alone does not count as "not UTF-8".
 */
export function decodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes, { stream: true });
  } catch {
    return new TextDecoder('windows-1251').decode(bytes);
  }
}

/**
 * Excel in a Russian or Azerbaijani locale writes CSV with semicolons, elsewhere with commas.
 * Whichever the first line holds more of is the separator.
 */
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

/** Every sheet as plain text cells: values as Excel would display them, no formulas, no HTML. */
export async function readSheets(buffer: ArrayBuffer, csv: boolean): Promise<SheetPreview[]> {
  const XLSX = await import('xlsx');
  // One row over the limit is read, so a cut sheet can say so.
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

/**
 * The page a document is drawn into: its own document inside a sandboxed iframe, so whatever the
 * file contains cannot run a script, reach the app's storage or restyle the app. Drawing is done
 * from here, by the app; the frame itself never runs code. Colours come from the app's tokens,
 * read once, since the frame cannot see the app's stylesheet.
 */
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

/**
 * Draws a .docx into a sandboxed frame. Links the document carries are kept only when they go to
 * a web page or an e-mail address, and open in a new tab.
 */
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
    // On a phone the page reflows to the screen instead of being a 21 cm sheet to pan around.
    ignoreWidth: narrow,
    ignoreHeight: narrow,
    breakPages: !narrow,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    // A Word file can carry a piece of raw HTML ("altChunk"); docx-preview would put it in an
    // iframe of its own with our origin and no sandbox — a script in a .docx would run as the
    // signed-in user. It is not shown at all.
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
