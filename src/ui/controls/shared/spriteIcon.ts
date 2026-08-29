export function spriteIcon(iconId: string, size = 14, fill = "currentColor", svgClass = ""): string {
  const classAttr = svgClass ? ` class=${svgClass}` : "";
  return `<svg${classAttr} viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" aria-hidden="true"><use href="icons.svg#${iconId}"></use></svg>`;
}

export function spriteIconStroked(iconId: string, size = 14, strokeWidth = 2, svgClass = ""): string {
  const classAttr = svgClass ? ` class=${svgClass}` : "";
  return `<svg${classAttr} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" aria-hidden="true"><use href="icons.svg#${iconId}"></use></svg>`;
}
