import {
  CommentInline,
  CommentListItem,
  parseCommentMarkdown,
  parseInline,
} from './comment-markdown.utils';

describe('comment markdown', () => {
  const text = (value: string): CommentInline => ({ kind: 'text', text: value });

  it('reads bold, italic and code inside one line', () => {
    expect(parseInline('**Fails** only on _Safari_, see `PaymentForm.ts`')).toEqual([
      { kind: 'bold', children: [text('Fails')] },
      text(' only on '),
      { kind: 'italic', children: [text('Safari')] },
      text(', see '),
      { kind: 'code', text: 'PaymentForm.ts' },
    ]);
  });

  it('keeps underscores inside words as they are', () => {
    expect(parseInline('rename user_id and max_retry_count')).toEqual([
      text('rename user_id and max_retry_count'),
    ]);
  });

  it('nests italic in bold', () => {
    expect(parseInline('**very _bad_ bug**')).toEqual([
      {
        kind: 'bold',
        children: [text('very '), { kind: 'italic', children: [text('bad')] }, text(' bug')],
      },
    ]);
  });

  it('makes links of markdown links and bare addresses, without the trailing dot', () => {
    expect(parseInline('[docs](https://example.com/a) and https://baim.az/x.')).toEqual([
      { kind: 'link', text: 'docs', href: 'https://example.com/a' },
      text(' and '),
      { kind: 'link', text: 'https://baim.az/x', href: 'https://baim.az/x' },
      text('.'),
    ]);
  });

  it('shows script tags and javascript links as text', () => {
    expect(parseInline('<script>alert(1)</script> [x](javascript:alert(1))')).toEqual([
      text('<script>alert(1)</script> [x](javascript:alert(1))'),
    ]);
  });

  it('reads mentions and references, but not inside code or a link', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    expect(parseInline(`@[user:${id}] see #41, \`#42\`, [#43](https://x.io/#44) a#45`)).toEqual([
      { kind: 'mention', userId: id },
      text(' see '),
      { kind: 'reference', code: '41' },
      text(', '),
      { kind: 'code', text: '#42' },
      text(', '),
      { kind: 'link', text: '#43', href: 'https://x.io/#44' },
      text(' a#45'),
    ]);
  });

  const item = (
    value: string,
    line: number,
    change: Partial<CommentListItem> = {},
  ): CommentListItem => ({ tokens: [text(value)], checked: false, line, children: [], ...change });

  it('groups list lines and splits paragraphs on blank lines', () => {
    expect(parseCommentMarkdown('Steps:\n- open\n- save\n\n1. one\n2. two\nDone')).toEqual([
      { kind: 'paragraph', lines: [[text('Steps:')]] },
      { kind: 'list', style: 'bullets', items: [item('open', 1), item('save', 2)] },
      { kind: 'list', style: 'numbers', items: [item('one', 4), item('two', 5)] },
      { kind: 'paragraph', lines: [[text('Done')]] },
    ]);
  });

  it('nests indented items under the item above, three levels at most', () => {
    const blocks = parseCommentMarkdown('- a\n  - b\n    - c\n      - d\n- e');

    expect(blocks).toEqual([
      {
        kind: 'list',
        style: 'bullets',
        items: [
          item('a', 0, {
            children: [
              {
                kind: 'list',
                style: 'bullets',
                items: [
                  item('b', 1, {
                    children: [
                      { kind: 'list', style: 'bullets', items: [item('c', 2), item('d', 3)] },
                    ],
                  }),
                ],
              },
            ],
          }),
          item('e', 4),
        ],
      },
    ]);
  });

  it('puts lines indented alike on one level, however many spaces', () => {
    const [list] = parseCommentMarkdown('- 1\n    - 2\n    - 3\n- 4');

    expect(list).toEqual({
      kind: 'list',
      style: 'bullets',
      items: [
        item('1', 0, {
          children: [{ kind: 'list', style: 'bullets', items: [item('2', 1), item('3', 2)] }],
        }),
        item('4', 3),
      ],
    });
  });

  it('nests a check list or a numbered one under a bullet', () => {
    const [list] = parseCommentMarkdown('- plan\n  1. first\n  - [x] done');

    expect(list).toEqual({
      kind: 'list',
      style: 'bullets',
      items: [
        item('plan', 0, {
          children: [
            { kind: 'list', style: 'numbers', items: [item('first', 1)] },
            { kind: 'list', style: 'checks', items: [item('done', 2, { checked: true })] },
          ],
        }),
      ],
    });
  });

  it('keeps line breaks inside a paragraph', () => {
    expect(parseCommentMarkdown('first\r\nsecond')).toEqual([
      { kind: 'paragraph', lines: [[text('first')], [text('second')]] },
    ]);
  });

  it('reads highlighted words in the colour named, yellow by default', () => {
    expect(parseInline('this ==matters== and ==green:this too== and ==red:no==')).toEqual([
      text('this '),
      { kind: 'highlight', color: 'yellow', children: [text('matters')] },
      text(' and '),
      { kind: 'highlight', color: 'green', children: [text('this too')] },
      text(' and '),
      { kind: 'highlight', color: 'yellow', children: [text('red:no')] },
    ]);
  });

  it('reads a check list apart from a bulleted one', () => {
    expect(parseCommentMarkdown('- [ ] write tests\n- [x] fix bug\n- plain')).toEqual([
      {
        kind: 'list',
        style: 'checks',
        items: [item('write tests', 0), item('fix bug', 1, { checked: true })],
      },
      { kind: 'list', style: 'bullets', items: [item('plain', 2)] },
    ]);
  });

  it('leaves an unclosed mark as text', () => {
    expect(parseInline('**not closed and `open')).toEqual([text('**not closed and `open')]);
  });
});
