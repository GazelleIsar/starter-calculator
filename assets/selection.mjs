export function normalizedSelectionRect(startX, startY, currentX, currentY) {
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  return {
    left,
    top,
    right: Math.max(startX, currentX),
    bottom: Math.max(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  };
}

export function rectanglesIntersect(first, second) {
  return !(
    first.right < second.left ||
    first.left > second.right ||
    first.bottom < second.top ||
    first.top > second.bottom
  );
}

export function indexesInsideSelection(selectionRect, cardRects) {
  return cardRects.flatMap((rect, index) => rectanglesIntersect(selectionRect, rect) ? [index] : []);
}
