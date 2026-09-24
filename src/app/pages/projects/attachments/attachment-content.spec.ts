import { MAX_SHEET_ROWS, columnLetter, csvSeparator, decodeText, readSheets } from './attachment-content';

const utf8 = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe('attachment content', () => {
  it.each([
    ['Name;Amount;Date\n1;2;3', ';'],
    ['Name,Amount,Date\n1,2,3', ','],
    ['Name\tAmount\n1\t2', '\t'],
    ['just one column', ','],
  ])('finds the separator of %j', (text, separator) => {
    expect(csvSeparator(text)).toBe(separator);
  });

  it.each([
    [0, 'A'],
    [25, 'Z'],
    [26, 'AA'],
    [51, 'AZ'],
    [701, 'ZZ'],
    [702, 'AAA'],
  ])('labels column %d as %s', (index, letter) => {
    expect(columnLetter(index)).toBe(letter);
  });

  it('reads UTF-8 as it is', () => {
    expect(decodeText(utf8('Отчёт — Hesabat'))).toBe('Отчёт — Hesabat');
  });

  /* An old Notepad file in Russian: not valid UTF-8, so it is read as Windows-1251. */
  it('falls back to Windows-1251 when the bytes are not UTF-8', () => {
    const cp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]).buffer; // "Привет"

    expect(decodeText(cp1251)).toBe('Привет');
  });

  it('reads a semicolon CSV into rows and lettered columns', async () => {
    const [sheet] = await readSheets(utf8('Name;Amount\nRustam;200\nDiana;150\n'), true);

    expect(sheet.columns).toEqual(['A', 'B']);
    expect(sheet.rows).toEqual([
      ['Name', 'Amount'],
      ['Rustam', '200'],
      ['Diana', '150'],
    ]);
    expect(sheet.truncated).toBe(false);
  });

  it('cuts a long sheet and says so', async () => {
    const csv = Array.from({ length: MAX_SHEET_ROWS + 20 }, (_, index) => `${index},x`).join('\n');

    const [sheet] = await readSheets(utf8(csv), true);

    expect(sheet.rows.length).toBe(MAX_SHEET_ROWS);
    expect(sheet.truncated).toBe(true);
  });
});
