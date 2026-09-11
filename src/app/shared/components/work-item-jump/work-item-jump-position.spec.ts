import { workItemJumpPosition } from './work-item-jump-position';

describe('workItemJumpPosition', () => {
  it('prefers opening above the trigger when there is enough room', () => {
    const result = workItemJumpPosition(
      { top: 500, bottom: 550, right: 1000 },
      { width: 1200, height: 900, topInset: 56 },
      400,
    );
    expect(result.side).toBe('above');
    expect(result.top).toBe(92);
    expect(result.top + 400).toBeLessThan(500);
  });
  it('opens below a trigger near the top instead of covering the top bar', () => {
    const result = workItemJumpPosition(
      { top: 80, bottom: 130, right: 1000 },
      { width: 1200, height: 900, topInset: 56 },
    );
    expect(result.side).toBe('below');
    expect(result.top).toBe(138);
  });
  it.each([360, 390, 768, 1024, 1440])('stays inside a %s px viewport', (width) => {
    const result = workItemJumpPosition(
      { top: 500, bottom: 550, right: width - 20 },
      { width, height: 844, topInset: 56 },
    );
    expect(result.left).toBeGreaterThanOrEqual(12);
    expect(result.left + result.width).toBeLessThanOrEqual(width - 12);
    expect(result.top).toBeGreaterThanOrEqual(68);
    expect(result.top + result.maxHeight).toBeLessThanOrEqual(832);
  });
  it('caps height in a short viewport and uses the roomier side', () => {
    const result = workItemJumpPosition(
      { top: 220, bottom: 270, right: 350 },
      { width: 390, height: 400, topInset: 56 },
    );
    expect(result.side).toBe('above');
    expect(result.maxHeight).toBe(144);
  });

  it('uses the compact desktop width on a medium viewport', () => {
    const result = workItemJumpPosition(
      { top: 500, bottom: 550, right: 1100 },
      { width: 1200, height: 900, topInset: 56 },
    );

    expect(result.width).toBe(864);
  });

  it('caps the panel at 960px on a wide viewport', () => {
    const result = workItemJumpPosition(
      { top: 500, bottom: 550, right: 2200 },
      { width: 2560, height: 1400, topInset: 56 },
    );

    expect(result.width).toBe(960);
  });

  it('grows smoothly between medium and wide viewports', () => {
    const result = workItemJumpPosition(
      { top: 500, bottom: 550, right: 1700 },
      { width: 1800, height: 900, topInset: 56 },
    );

    expect(result.width).toBe(900);
  });
});
