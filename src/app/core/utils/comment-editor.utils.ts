import {
  CommentBlock,
  CommentList,
  CommentListItem,
  HighlightColor,
  LIST_INDENT,
  MAX_LIST_LEVEL,
  parseCommentMarkdown,
} from './comment-markdown.utils';
import { NamedPerson, personFullName } from './person-name.utils';

/** The editor's text and selection: what every toolbar action reads and returns. */
export interface TextEdit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** `@` or `#` being typed right before the caret, with what follows it so far. */
export interface EditorTrigger {
  char: '@' | '#';
  query: string;
  /** Where the `@` or `#` stands. */
  start: number;
}

/** A person as a mention needs them: the id stored in the text and the name shown in the field. */
export interface MentionPerson extends NamedPerson {
  id: string;
}

const MENTION_TOKEN = /@\[user:([0-9a-fA-F-]{36})\]/g;

// A name may have one space in it ("@Aykhan Ze"), a code or a word may not.
const TRIGGER = /(?:^|[\s(])(?:(@)([\p{L}\p{N}.'-]*(?: [\p{L}\p{N}.'-]*)?)|(#)([\p{L}\p{N}]*))$/u;

/**
 * Bold, italic and code: wraps the selection, or unwraps it when it is already wrapped. Without a
 * selection it inserts the marks around a placeholder and selects the placeholder, so typing
 * replaces it.
 */
export function toggleWrap(edit: TextEdit, mark: string, placeholder: string): TextEdit {
  const { text, selectionStart: start, selectionEnd: end } = edit;
  const before = text.slice(start - mark.length, start);
  const after = text.slice(end, end + mark.length);

  if (start !== end && before === mark && after === mark) {
    return {
      text:
        text.slice(0, start - mark.length) + text.slice(start, end) + text.slice(end + mark.length),
      selectionStart: start - mark.length,
      selectionEnd: end - mark.length,
    };
  }

  const inner = start === end ? placeholder : text.slice(start, end);
  return {
    text: text.slice(0, start) + mark + inner + mark + text.slice(end),
    selectionStart: start + mark.length,
    selectionEnd: start + mark.length + inner.length,
  };
}

/** Bulleted or numbered list over every line the selection touches; again to take it off. */
export type ListKind = 'bullets' | 'numbers' | 'checks';

const LIST_MARKERS: Record<ListKind, RegExp> = {
  bullets: /^[-*]\s+(?!\[[ xX]\]\s)/,
  numbers: /^\d{1,3}[.)]\s+/,
  checks: /^[-*]\s+\[[ xX]\]\s+/,
};

export function toggleList(edit: TextEdit, kind: ListKind): TextEdit {
  const { text, selectionStart, selectionEnd } = edit;
  const from = text.lastIndexOf('\n', selectionStart - 1) + 1;
  const newline = text.indexOf('\n', selectionEnd);
  const to = newline === -1 ? text.length : newline;
  // The indent of a nested item stays; only the marker after it changes.
  const lines = text
    .slice(from, to)
    .split('\n')
    .map((line) => {
      const indent = /^\s*/.exec(line)?.[0] ?? '';
      return { indent, body: line.slice(indent.length) };
    });
  const marker = LIST_MARKERS[kind];
  const listed = lines.every(({ body }) => marker.test(body));

  const changed = lines
    .map(({ indent, body }, index) => {
      if (listed) return indent + body.replace(marker, '');
      const bare = body.replace(/^(?:[-*]\s+\[[ xX]\]|[-*]|\d{1,3}[.)])\s+/, '');
      const prefix = kind === 'numbers' ? `${index + 1}.` : kind === 'checks' ? '- [ ]' : '-';
      return `${indent}${prefix} ${bare}`;
    })
    .join('\n');

  return {
    text: text.slice(0, from) + changed + text.slice(to),
    selectionStart: from,
    selectionEnd: from + changed.length,
  };
}

const LIST_LINE = /^(\s*)(?:([-*])\s+(\[[ xX]\]\s+)?|(\d{1,3})([.)])\s+)(.*)$/;

/**
 * Enter at the end of a list line starts the next item — `- `, `2. `, `- [ ] ` — as in Azure DevOps
 * and every editor. Enter on an empty item ends the list instead. Null when the line is no list.
 */
export function continueList(edit: TextEdit): TextEdit | null {
  const { text, selectionStart: caret, selectionEnd } = edit;
  if (caret !== selectionEnd) return null;

  const from = text.lastIndexOf('\n', caret - 1) + 1;
  const newline = text.indexOf('\n', caret);
  const to = newline === -1 ? text.length : newline;
  if (caret !== to) return null;

  const match = LIST_LINE.exec(text.slice(from, to));
  if (!match) return null;
  const [, indent, bullet, check, number, dot, rest] = match;

  if (!rest.trim()) {
    return { text: text.slice(0, from) + text.slice(to), selectionStart: from, selectionEnd: from };
  }

  const marker = bullet ? `${bullet} ${check ? '[ ] ' : ''}` : `${Number(number) + 1}${dot} `;
  const inserted = `\n${indent}${marker}`;
  const position = caret + inserted.length;
  return {
    text: text.slice(0, caret) + inserted + text.slice(caret),
    selectionStart: position,
    selectionEnd: position,
  };
}

/**
 * Tab and Shift+Tab on list lines: one level in or out, two spaces each, three levels at most.
 * Null when no selected line is a list line, so Tab in plain text still moves the focus on.
 */
export function indentList(edit: TextEdit, direction: 1 | -1): TextEdit | null {
  const { text, selectionStart, selectionEnd } = edit;
  const from = text.lastIndexOf('\n', selectionStart - 1) + 1;
  const newline = text.indexOf('\n', Math.max(selectionEnd, selectionStart));
  const to = newline === -1 ? text.length : newline;
  const lines = text.slice(from, to).split('\n');
  if (!lines.some((line) => LIST_LINE.test(line))) return null;

  const deepest = ' '.repeat(LIST_INDENT * MAX_LIST_LEVEL);
  const step = ' '.repeat(LIST_INDENT);
  const deltas: number[] = [];
  const changed = lines.map((line) => {
    if (!LIST_LINE.test(line)) {
      deltas.push(0);
      return line;
    }
    if (direction === 1) {
      const add = line.startsWith(deepest) ? '' : step;
      deltas.push(add.length);
      return add + line;
    }
    const remove = /^ {0,2}/.exec(line)?.[0].length ?? 0;
    deltas.push(-remove);
    return line.slice(remove);
  });

  const total = deltas.reduce((sum, delta) => sum + delta, 0);
  return {
    text: text.slice(0, from) + changed.join('\n') + text.slice(to),
    selectionStart: Math.max(from, selectionStart + deltas[0]),
    selectionEnd: Math.max(from, selectionEnd + total),
  };
}

/**
 * The highlight button with its colour: wraps the selection in `==green:…==` (yellow is plain
 * `==…==`); on a highlight already there it changes the colour, or takes it off when the colour
 * is the same.
 */
export function toggleHighlight(edit: TextEdit, color: HighlightColor): TextEdit {
  const { text, selectionStart: start, selectionEnd: end } = edit;
  const open = color === 'yellow' ? '==' : `==${color}:`;
  const before = /==(?:([a-z]+):)?$/.exec(text.slice(0, start));

  if (start !== end && before && text.startsWith('==', end)) {
    const current = before[1] ?? 'yellow';
    const openStart = start - before[0].length;
    const inner = text.slice(start, end);
    const wrapped = current === color ? inner : open + inner + '==';
    const innerStart = current === color ? openStart : openStart + open.length;
    return {
      text: text.slice(0, openStart) + wrapped + text.slice(end + 2),
      selectionStart: innerStart,
      selectionEnd: innerStart + inner.length,
    };
  }

  const inner = start === end ? 'highlighted text' : text.slice(start, end);
  return {
    text: text.slice(0, start) + open + inner + '==' + text.slice(end),
    selectionStart: start + open.length,
    selectionEnd: start + open.length + inner.length,
  };
}

/**
 * Ticks or unticks the check-list item on the given line of the stored text. A ticked item is done
 * with everything nested under it; an item opened again is no longer done above it either.
 */
export function toggleCheck(text: string, line: number): string {
  const path = pathTo(parseCommentMarkdown(text), line);
  const item = path?.at(-1);
  if (!path || !item) return text;

  const checked = !item.checked;
  const lines = text.split('\n');
  const mark = (target: CommentListItem) => {
    lines[target.line] = lines[target.line].replace(CHECK_BOX, `$1${checked ? 'x' : ' '}$2`);
  };
  const markInside = (target: CommentListItem): void => {
    mark(target);
    target.children.forEach((list) => list.items.forEach(markInside));
  };
  markInside(item);
  if (!checked) path.slice(0, -1).forEach(mark);
  return lines.join('\n');
}

/** The box of a check-list line; a line of another list has none and stays as it is. */
const CHECK_BOX = /^(\s*[-*]\s+\[)[ xX](\])/;

/** The item on the line and the items it is nested under, outermost first. */
function pathTo(blocks: readonly CommentBlock[], line: number): CommentListItem[] | null {
  const inList = (list: CommentList): CommentListItem[] | null => {
    for (const item of list.items) {
      if (item.line === line) return [item];
      for (const child of item.children) {
        const found = inList(child);
        if (found) return [item, ...found];
      }
    }
    return null;
  };
  for (const block of blocks) {
    const found = block.kind === 'list' ? inList(block) : null;
    if (found) return found;
  }
  return null;
}

/**
 * The @ and # buttons: the mark at the caret, set apart from a word right before it, so the list of
 * people or work opens as if it was typed.
 */
export function insertTriggerChar(edit: TextEdit, char: '@' | '#'): TextEdit {
  const { text, selectionStart: start, selectionEnd: end } = edit;
  const before = text.slice(0, start);
  const inserted = before && !/\s$/.test(before) ? ` ${char}` : char;
  const caret = start + inserted.length;
  return { text: before + inserted + text.slice(end), selectionStart: caret, selectionEnd: caret };
}

/** `[text](https://)` with the part still to fill selected: the address, or the text when empty. */
export function insertLink(edit: TextEdit): TextEdit {
  const { text, selectionStart: start, selectionEnd: end } = edit;
  const label = text.slice(start, end);
  const inserted = `[${label || 'link text'}](https://)`;
  const urlStart = start + inserted.length - 'https://)'.length;

  return {
    text: text.slice(0, start) + inserted + text.slice(end),
    selectionStart: label ? urlStart : start + 1,
    selectionEnd: label ? urlStart + 'https://'.length : start + 1 + 'link text'.length,
  };
}

export function findTrigger(text: string, caret: number): EditorTrigger | null {
  const match = TRIGGER.exec(text.slice(0, caret));
  if (!match) return null;

  const char = (match[1] ?? match[3]) as '@' | '#';
  const query = match[2] ?? match[4] ?? '';
  return { char, query, start: caret - query.length - 1 };
}

/** Puts the picked person or work item in place of what was typed after `@` or `#`. */
export function replaceTrigger(
  edit: TextEdit,
  trigger: EditorTrigger,
  insertion: string,
): TextEdit {
  const { text, selectionStart: caret } = edit;
  const rest = text.slice(caret);
  // One space after it, not two when the text already goes on with one.
  const inserted = /^\s/.test(rest) ? insertion : `${insertion} `;
  const position = trigger.start + insertion.length + 1;
  return {
    text: text.slice(0, trigger.start) + inserted + rest,
    selectionStart: position,
    selectionEnd: position,
  };
}

export function mentionLabel(person: NamedPerson): string {
  return `@${personFullName(person, 'Unknown user')}`;
}

/**
 * The field shows `@Aykhan Zeynalov`, the server stores `@[user:<id>]`. Opening a comment for editing
 * turns known mentions into names and remembers which name is which id; a mention of someone who
 * left the project stays a token, so saving does not lose it.
 */
export function mentionsToNames(
  text: string,
  people: readonly MentionPerson[],
): { text: string; mentions: Map<string, string> } {
  const byId = new Map(people.map((person) => [person.id.toLowerCase(), person]));
  const mentions = new Map<string, string>();
  const shown = text.replace(MENTION_TOKEN, (token, id: string) => {
    const person = byId.get(id.toLowerCase());
    if (!person) return token;
    const label = mentionLabel(person);
    mentions.set(label, person.id);
    return label;
  });
  return { text: shown, mentions };
}

/** Back to tokens before sending. The longest names first, so "@Ann Lee" is not cut to "@Ann". */
export function mentionsToTokens(text: string, mentions: ReadonlyMap<string, string>): string {
  const labels = [...mentions.keys()].sort((a, b) => b.length - a.length);
  if (!labels.length) return text;

  const pattern = new RegExp(`(${labels.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'gu');
  return text.replace(pattern, (label: string) => `@[user:${mentions.get(label)}]`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
