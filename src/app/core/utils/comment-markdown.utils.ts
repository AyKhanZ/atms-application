/**
 * The comment markup (13-comments, «Текст и форматирование»): bold, italic, coloured highlight,
 * code, links, bulleted, numbered and check lists nested up to three levels, `@[user:id]` mentions
 * and `#41` references. The text becomes tokens that the template draws with ordinary elements —
 * HTML in a comment is never parsed, only shown as text, so there is nothing to sanitise. Anything
 * not recognised stays plain text.
 */

/** The marker colours a highlight can take; `==text==` without one is yellow. */
export const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export type CommentInline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; children: CommentInline[] }
  | { kind: 'italic'; children: CommentInline[] }
  | { kind: 'highlight'; color: HighlightColor; children: CommentInline[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'mention'; userId: string }
  | { kind: 'reference'; code: string };

export type CommentListStyle = 'bullets' | 'numbers' | 'checks';

export interface CommentListItem {
  tokens: CommentInline[];
  /** Ticked, for an item of a check list. */
  checked: boolean;
  /** The line of the text it stands on, to tick it there. */
  line: number;
  /** Lists indented under this item. */
  children: CommentList[];
}

export interface CommentList {
  kind: 'list';
  style: CommentListStyle;
  items: CommentListItem[];
}

export type CommentBlock = { kind: 'paragraph'; lines: CommentInline[][] } | CommentList;

/** Deeper than this reads badly, a phone above all: an item further in stays at the third level. */
export const MAX_LIST_LEVEL = 2;
/** Spaces for one level; Tab in the editor adds them. */
export const LIST_INDENT = 2;

const LIST_LINE = /^(\s*)(?:[-*]\s+\[([ xX])\]\s+|([-*])\s+|\d{1,3}[.)]\s+)(.*)$/;

// Earlier alternatives win at the same position: a code span or a link swallows the `#41`, `@`
// and `**` inside it, as the server does when it looks for references.
const INLINE = new RegExp(
  [
    '`(?<code>[^`\\n]+)`',
    '\\[(?<linkText>[^\\]\\n]+)\\]\\((?<linkHref>https?:\\/\\/[^\\s)]+)\\)',
    '@\\[user:(?<mention>[0-9a-fA-F-]{36})\\]',
    '\\*\\*(?<bold>(?:(?!\\*\\*).)+?)\\*\\*',
    `==(?:(?<color>${HIGHLIGHT_COLORS.join('|')}):)?(?<highlight>(?:(?!==).)+?)==`,
    // Not inside a word, so snake_case_names stay as they are.
    '(?<![\\p{L}\\p{N}_])_(?<italic>[^_\\s](?:[^_\\n]*[^_\\s])?)_(?![\\p{L}\\p{N}_])',
    '(?<url>https?:\\/\\/[^\\s<]*[^\\s<.,;:!?)\\]\'"])',
    '(?<![\\p{L}\\p{N}_#])#(?<reference>\\d+)\\b',
  ].join('|'),
  'gu',
);

interface ListLine {
  /** Spaces before the marker, a tab counting as one level. */
  indent: number;
  style: CommentListStyle;
  item: CommentListItem;
}

function listLine(line: string, index: number): ListLine | null {
  const match = LIST_LINE.exec(line);
  if (!match) return null;
  const [, indent, check, bullet, rest] = match;
  return {
    indent: indent.replace(/\t/g, ' '.repeat(LIST_INDENT)).length,
    style: check !== undefined ? 'checks' : bullet !== undefined ? 'bullets' : 'numbers',
    item: {
      tokens: parseInline(rest),
      checked: check !== undefined && check !== ' ',
      line: index,
      children: [],
    },
  };
}

export function parseCommentMarkdown(text: string): CommentBlock[] {
  const blocks: CommentBlock[] = [];
  let paragraph: CommentInline[][] = [];
  // The lists open at each level with the indent they started at, outermost first. A blank or a
  // plain line closes them all.
  const open: { indent: number; list: CommentList }[] = [];

  const closeParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', lines: paragraph });
    paragraph = [];
  };

  // As in Markdown, the level comes from the indent next to the items above, not from a count of
  // spaces: two lines indented alike are one level, however many spaces that is.
  const addItem = ({ indent, style, item }: ListLine) => {
    while ((open.at(-1)?.indent ?? -1) > indent) open.pop();

    const same = open.at(-1);
    if (same && same.indent === indent) {
      if (same.list.style === style) {
        same.list.items.push(item);
        return;
      }
      open.pop();
    }

    const parent = open.at(-1);
    // Past the third level an item stays on the third, beside the one above it.
    if (parent && open.length > MAX_LIST_LEVEL) {
      parent.list.items.push(item);
      return;
    }

    const list: CommentList = { kind: 'list', style, items: [item] };
    if (parent) parent.list.items.at(-1)?.children.push(list);
    else blocks.push(list);
    open.push({ indent, list });
  };

  for (const [index, line] of text.replace(/\r\n?/g, '\n').split('\n').entries()) {
    const item = listLine(line, index);

    if (item) {
      closeParagraph();
      addItem(item);
    } else {
      open.length = 0;
      if (line.trim()) paragraph.push(parseInline(line));
      else closeParagraph();
    }
  }

  closeParagraph();
  return blocks;
}

export function parseInline(text: string): CommentInline[] {
  const tokens: CommentInline[] = [];
  let position = 0;

  for (const match of text.matchAll(INLINE)) {
    if (match.index > position) {
      tokens.push({ kind: 'text', text: text.slice(position, match.index) });
    }
    tokens.push(toToken(match.groups ?? {}));
    position = match.index + match[0].length;
  }

  if (position < text.length) tokens.push({ kind: 'text', text: text.slice(position) });
  return tokens;
}

function toToken(groups: Record<string, string | undefined>): CommentInline {
  const { code, linkText, linkHref, mention, bold, color, highlight, italic, url, reference } =
    groups;
  if (code !== undefined) return { kind: 'code', text: code };
  if (linkText !== undefined && linkHref !== undefined) {
    return { kind: 'link', text: linkText, href: linkHref };
  }
  if (mention !== undefined) return { kind: 'mention', userId: mention.toLowerCase() };
  if (bold !== undefined) return { kind: 'bold', children: parseInline(bold) };
  if (highlight !== undefined) {
    return {
      kind: 'highlight',
      color: HIGHLIGHT_COLORS.find((known) => known === color) ?? 'yellow',
      children: parseInline(highlight),
    };
  }
  if (italic !== undefined) return { kind: 'italic', children: parseInline(italic) };
  if (url !== undefined) return { kind: 'link', text: url, href: url };
  return { kind: 'reference', code: reference ?? '' };
}
