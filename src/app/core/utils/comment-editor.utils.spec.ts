import {
  continueList,
  findTrigger,
  indentList,
  insertLink,
  insertTriggerChar,
  mentionsToNames,
  mentionsToTokens,
  replaceTrigger,
  toggleCheck,
  toggleHighlight,
  toggleList,
  toggleWrap,
} from './comment-editor.utils';

describe('comment editor', () => {
  const ann = { id: '0f8fad5b-d9cb-469f-a165-70867728950e', name: 'Ann', surname: 'Lee' };
  const annie = { id: '7c9e6679-7425-40de-944b-e07fc1f90ae7', name: 'Ann', surname: 'Leeds' };

  it('wraps the selection in bold and selects the same words', () => {
    expect(
      toggleWrap({ text: 'a big bug', selectionStart: 2, selectionEnd: 5 }, '**', 'bold'),
    ).toEqual({
      text: 'a **big** bug',
      selectionStart: 4,
      selectionEnd: 7,
    });
  });

  it('unwraps a selection that is already bold', () => {
    expect(
      toggleWrap({ text: 'a **big** bug', selectionStart: 4, selectionEnd: 7 }, '**', 'bold'),
    ).toEqual({
      text: 'a big bug',
      selectionStart: 2,
      selectionEnd: 5,
    });
  });

  it('inserts a selected placeholder when nothing is selected', () => {
    expect(toggleWrap({ text: 'x ', selectionStart: 2, selectionEnd: 2 }, '`', 'code')).toEqual({
      text: 'x `code`',
      selectionStart: 3,
      selectionEnd: 7,
    });
  });

  it('numbers every selected line and takes the numbers off again', () => {
    const listed = toggleList(
      { text: 'intro\nopen\n- save', selectionStart: 7, selectionEnd: 14 },
      'numbers',
    );
    expect(listed.text).toBe('intro\n1. open\n2. save');

    const plain = toggleList({ ...listed }, 'numbers');
    expect(plain.text).toBe('intro\nopen\nsave');
  });

  it('turns lines into a check list and back', () => {
    const checked = toggleList({ text: 'a\n- b', selectionStart: 0, selectionEnd: 5 }, 'checks');
    expect(checked.text).toBe('- [ ] a\n- [ ] b');
    expect(toggleList({ ...checked }, 'checks').text).toBe('a\nb');
  });

  it('starts the next item on Enter at the end of a list line', () => {
    const at = (text: string) => ({ text, selectionStart: text.length, selectionEnd: text.length });

    expect(continueList(at('- one'))?.text).toBe('- one\n- ');
    expect(continueList(at('intro\n2. two'))?.text).toBe('intro\n2. two\n3. ');
    expect(continueList(at('- [x] done'))?.text).toBe('- [x] done\n- [ ] ');
    expect(continueList(at('plain line'))).toBeNull();
  });

  it('ends the list on Enter in an empty item', () => {
    expect(continueList({ text: '- one\n- ', selectionStart: 8, selectionEnd: 8 })).toEqual({
      text: '- one\n',
      selectionStart: 6,
      selectionEnd: 6,
    });
  });

  it('moves list lines a level in with Tab and out with Shift+Tab, three levels at most', () => {
    const at = (text: string) => ({ text, selectionStart: text.length, selectionEnd: text.length });

    const once = indentList(at('- a\n- b'), 1);
    expect(once?.text).toBe('- a\n  - b');
    expect(once?.selectionStart).toBe(9);

    expect(indentList(at('- a\n    - deepest'), 1)?.text).toBe('- a\n    - deepest');
    expect(indentList(at('- a\n  - b'), -1)?.text).toBe('- a\n- b');
    expect(indentList(at('plain text'), 1)).toBeNull();
  });

  it('keeps the indent when a nested line changes its list', () => {
    expect(
      toggleList({ text: '  - item', selectionStart: 0, selectionEnd: 8 }, 'numbers').text,
    ).toBe('  1. item');
  });

  it('highlights in a colour, recolours and takes the highlight off', () => {
    const green = toggleHighlight(
      { text: 'a big bug', selectionStart: 2, selectionEnd: 5 },
      'green',
    );
    expect(green.text).toBe('a ==green:big== bug');

    const blue = toggleHighlight(green, 'blue');
    expect(blue.text).toBe('a ==blue:big== bug');

    expect(toggleHighlight(blue, 'blue').text).toBe('a big bug');
    expect(toggleHighlight({ text: 'x', selectionStart: 1, selectionEnd: 1 }, 'yellow').text).toBe(
      'x==highlighted text==',
    );
  });

  it('ticks and unticks a check-list line and leaves the rest alone', () => {
    const text = 'todo\n- [ ] write tests\n- [x] fix bug';

    expect(toggleCheck(text, 1)).toBe('todo\n- [x] write tests\n- [x] fix bug');
    expect(toggleCheck(text, 2)).toBe('todo\n- [ ] write tests\n- [ ] fix bug');
    expect(toggleCheck(text, 0)).toBe(text);
  });

  it('ticks everything under an item and unticks the items above one opened again', () => {
    const text = '- [ ] release\n  - [ ] build\n    - [ ] test\n  - note\n- [ ] other';

    const done = toggleCheck(text, 0);
    expect(done).toBe('- [x] release\n  - [x] build\n    - [x] test\n  - note\n- [ ] other');

    expect(toggleCheck(done, 2)).toBe(
      '- [ ] release\n  - [ ] build\n    - [ ] test\n  - note\n- [ ] other',
    );
  });

  it('puts @ or # at the caret apart from the word before it', () => {
    expect(insertTriggerChar({ text: 'ask', selectionStart: 3, selectionEnd: 3 }, '@')).toEqual({
      text: 'ask @',
      selectionStart: 5,
      selectionEnd: 5,
    });
    expect(insertTriggerChar({ text: '', selectionStart: 0, selectionEnd: 0 }, '#').text).toBe('#');
  });

  it('makes a link of the selection and selects the address to fill', () => {
    const edit = insertLink({ text: 'see docs', selectionStart: 4, selectionEnd: 8 });
    expect(edit.text).toBe('see [docs](https://)');
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe('https://');
  });

  it('finds @ and # being typed, but not inside a word', () => {
    expect(findTrigger('hi @Ann Le', 10)).toEqual({ char: '@', query: 'Ann Le', start: 3 });
    expect(findTrigger('see #pay', 8)).toEqual({ char: '#', query: 'pay', start: 4 });
    expect(findTrigger('#', 1)).toEqual({ char: '#', query: '', start: 0 });
    expect(findTrigger('mail@host', 9)).toBeNull();
    expect(findTrigger('hi @Ann Lee and', 15)).toBeNull();
  });

  it('puts the picked item in place of the typed query', () => {
    const edit = replaceTrigger(
      { text: 'ask @an now', selectionStart: 7, selectionEnd: 7 },
      { char: '@', query: 'an', start: 4 },
      '@Ann Lee',
    );
    expect(edit).toEqual({ text: 'ask @Ann Lee now', selectionStart: 13, selectionEnd: 13 });
  });

  it('shows mentions as names and stores them as tokens again', () => {
    const stored = `@[user:${ann.id}] and @[user:${annie.id}] and @[user:11111111-1111-1111-1111-111111111111]`;
    const shown = mentionsToNames(stored, [ann, annie], 'Unknown user');

    expect(shown.text).toBe(
      '@Ann Lee and @Ann Leeds and @[user:11111111-1111-1111-1111-111111111111]',
    );
    expect(mentionsToTokens(shown.text, shown.mentions)).toBe(stored);
  });

  it('does not turn a longer word that starts with a name into a mention', () => {
    const mentions = new Map([['@Ann Lee', ann.id]]);
    expect(mentionsToTokens('@Ann Leeway', mentions)).toBe('@Ann Leeway');
  });
});
