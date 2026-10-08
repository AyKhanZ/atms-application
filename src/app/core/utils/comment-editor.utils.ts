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

export interface TextEdit {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface EditorTrigger {
  char: '@' | '#';
  query: string;
  start: number;
}

export interface MentionPerson extends NamedPerson {
  id: string;
}

const MENTION_TOKEN = /@\[user:([0-9a-fA-F-]{36})\]/g;

// a name can have one space ("@Aykhan Ze"), a code or word cant
const TRIGGER = /(?:^|[\s(])(?:(@)([\p{L}\p{N}.'-]*(?: [\p{L}\p{N}.'-]*)?)|(#)([\p{L}\p{N}]*))$/u;

// no selection = insert marks around a placeholder and select it
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
  // nested item keeps its indent, only the marker changes
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

// enter on a list line starts the next item, on an empty item ends the list
// null = not a list line
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

// 2 spaces a level, max 3 levels; null = no list line, so Tab still moves focus
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

// yellow is plain ==text==, same colour again takes it off
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

// ticking an item ticks everything under it, unticking unticks the ones above
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

const CHECK_BOX = /^(\s*[-*]\s+\[)[ xX](\])/;

// outermost first
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

export function insertTriggerChar(edit: TextEdit, char: '@' | '#'): TextEdit {
  const { text, selectionStart: start, selectionEnd: end } = edit;
  const before = text.slice(0, start);
  const inserted = before && !/\s$/.test(before) ? ` ${char}` : char;
  const caret = start + inserted.length;
  return { text: before + inserted + text.slice(end), selectionStart: caret, selectionEnd: caret };
}

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

export function replaceTrigger(
  edit: TextEdit,
  trigger: EditorTrigger,
  insertion: string,
): TextEdit {
  const { text, selectionStart: caret } = edit;
  const rest = text.slice(caret);
  // one space after it, not two
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

// field shows @Aykhan Zeynalov, server stores @[user:id]
// a mention of someone who left stays a token so saving doesnt lose it
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

// longest names first so "@Ann Lee" isnt cut to "@Ann"
export function mentionsToTokens(text: string, mentions: ReadonlyMap<string, string>): string {
  const labels = [...mentions.keys()].sort((a, b) => b.length - a.length);
  if (!labels.length) return text;

  const pattern = new RegExp(`(${labels.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'gu');
  return text.replace(pattern, (label: string) => `@[user:${mentions.get(label)}]`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
