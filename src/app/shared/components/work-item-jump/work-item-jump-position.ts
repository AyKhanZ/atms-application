interface TicketJumpAnchor {
  top: number;
  bottom: number;
  right: number;
}
interface TicketJumpViewport {
  width: number;
  height: number;
  topInset: number;
}

export function workItemJumpPosition(
  anchor: TicketJumpAnchor,
  viewport: TicketJumpViewport,
  panelHeight = 512,
) {
  // Same gap the page keeps from the edge of the window, so a panel does not look pinned to it
  // while everything under it is inset. Below 768px the panel is a sheet and never gets here.
  const margin = 24;
  const gap = 8;
  const above = Math.max(0, anchor.top - viewport.topInset - margin - gap);
  const below = Math.max(0, viewport.height - anchor.bottom - margin - gap);
  const side = above >= 240 || above >= below ? 'above' : 'below';
  const maxHeight = Math.min(512, side === 'above' ? above : below);
  const responsiveWidth = Math.min(960, Math.max(864, viewport.width * 0.5));
  const width = Math.max(0, Math.min(responsiveWidth, viewport.width - margin * 2));
  const left = Math.max(margin, Math.min(anchor.right - width, viewport.width - margin - width));
  const top =
    side === 'above' ? anchor.top - gap - Math.min(panelHeight, maxHeight) : anchor.bottom + gap;
  return { side, left, top, width, maxHeight };
}
