/** Return keyboard play to the chosen map square after the opening, a walk or replay. */
export function focusMapCell(cell?: number) {
  requestAnimationFrame(() => {
    const selector =
      cell === undefined ? '.map-cell[tabindex="0"]' : `.map-cell[data-cell="${cell}"]`;
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button && !button.closest("[inert]")) button.focus();
  });
}
