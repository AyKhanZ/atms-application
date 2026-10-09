import az from '../../../../public/i18n/az.json';
import en from '../../../../public/i18n/en.json';
import ru from '../../../../public/i18n/ru.json';

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return { [prefix]: String(value) };
  }

  return Object.entries(value).reduce<Record<string, string>>((result, [key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return { ...result, ...flatten(child, next) };
  }, {});
}

function parameters(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z_][\w]*)/g)].map((match) => match[1]).sort();
}

describe('translation files', () => {
  const languages = [
    ['en', flatten(en)],
    ['ru', flatten(ru)],
    ['az', flatten(az)],
  ] as const;
  const english = languages[0][1];

  it('keeps the same keys in every language', () => {
    const expected = Object.keys(english).sort();
    for (const [language, messages] of languages) {
      expect(Object.keys(messages).sort(), language).toEqual(expected);
    }
  });

  it('keeps the same parameters in every string', () => {
    for (const [key, value] of Object.entries(english)) {
      const expected = parameters(value);
      for (const [language, messages] of languages) {
        expect(parameters(messages[key] ?? ''), `${language} ${key}`).toEqual(expected);
      }
    }
  });
});
