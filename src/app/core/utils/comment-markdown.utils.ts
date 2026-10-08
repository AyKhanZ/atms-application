// html in a comment is never parsed, only shown as text, so nothing to sanitize
// anything not recognised stays plain text

// plain ==text== is yellow
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
  checked: boolean;
  // line in the text, to tick it there
  line: number;
  children: CommentList[];
}

export interface CommentList {
  kind: 'list';
  style: CommentListStyle;
  items: CommentListItem[];
}

export type CommentBlock = { kind: 'paragraph'; lines: CommentInline[][] } | CommentList;

// deeper reads badly on a phone, further items stay on the third level
export const MAX_LIST_LEVEL = 2;
export const LIST_INDENT = 2;

const LIST_LINE = /^(\s*)(?:[-*]\s+\[([ xX])\]\s+|([-*])\s+|\d{1,3}[.)]\s+)(.*)$/;

// earlier alternatives win: code span or link swallow #41, @ and ** inside, same as the server
const INLINE = new RegExp(
  [
    '`(?<code>[^`\\n]+)`',
    '\\[(?<linkText>[^\\]\\n]+)\\]\\((?<linkHref>https?:\\/\\/[^\\s)]+)\\)',
    '@\\[user:(?<mention>[0-9a-fA-F-]{36})\\]',
    '\\*\\*(?<bold>(?:(?!\\*\\*).)+?)\\*\\*',
    `==(?:(?<color>${HIGHLIGHT_COLORS.join('|')}):)?(?<highlight>(?:(?!==).)+?)==`,
    // not inside a word, so snake_case stays
    '(?<![\\p{L}\\p{N}_])_(?<italic>[^_\\s](?:[^_\\n]*[^_\\s])?)_(?![\\p{L}\\p{N}_])',
    '(?<url>https?:\\/\\/[^\\s<]*[^\\s<.,;:!?)\\]\'"])',
    '(?<![\\p{L}\\p{N}_#])#(?<reference>\\d+)\\b',
  ].join('|'),
  'gu',
);

interface ListLine {
  // tab counts as one level
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
  // open lists per level, a blank or plain line closes them all
  const open: { indent: number; list: CommentList }[] = [];

  const closeParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', lines: paragraph });
    paragraph = [];
  };

  // level comes from the indent of the items above, not the count of spaces (like markdown)
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
