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
  return candidates.reduce((best, separator) => (count(separator) > count(best) ? separator : best), ',');
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
      truncated:
        all.length > MAX_SHEET_ROWS || all.some((row) => row.length > MAX_SHEET_COLUMNS),
    };
  });
}

/**
 * Draws a .docx into `container`. Links the document carries are kept only when they go to a web
 * page or an e-mail address: a `javascript:` link inside a Word file is how such a preview would
 * be turned against the person looking at it.
 */
export async function renderDocument(blob: Blob, container: HTMLElement, narrow: boolean): Promise<void> {
  const { renderAsync } = await import('docx-preview');
  container.replaceChildren();
  await renderAsync(blob, container, undefined, {
    className: 'docx',
    inWrapper: true,
    // On a phone the page reflows to the screen instead of being a 21 cm sheet to pan around.
    ignoreWidth: narrow,
    ignoreHeight: narrow,
    breakPages: !narrow,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    experimental: false,
    useBase64URL: false,
  });

  container.querySelectorAll('a[href]').forEach((link) => {
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
