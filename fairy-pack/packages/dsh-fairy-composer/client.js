window.__ModuleLoader__.load({
  id: 'dsh-fairy-composer',
  factory() {
    const PLUGIN_ID = 'dsh-fairy-composer';

    /*
     * The grey band behind the composer is the composer seat, the element the
     * shell pins to the bottom of the conversation column; the blue input card
     * sits inside it.
     *
     *   gap     inset of the card inside the band (the seat's padding)
     *   radius  round corners on the band itself, replacing its square ones
     *
     * The band's own paint is a fade that reaches full opacity only 36px down,
     * so its top edge has no crisp corner to round. Painting it with the same
     * base colour it fades to gives the radius an edge to bite on; the card and
     * the controls inside keep their own surfaces.
     */
    const CSS = `
:root {
  --dsh-composer-gap-x: 12px;
  --dsh-composer-gap-top: 10px;
  --dsh-composer-gap-bottom: 6px;
  --dsh-composer-frame-radius: 26px;
}

[class*="_composerSeat"] {
  padding:
    var(--dsh-composer-gap-top)
    var(--dsh-composer-gap-x)
    var(--dsh-composer-gap-bottom);
  border-radius: var(--dsh-composer-frame-radius);
  background: var(--dsw-alias-bg-base);
}
`;
    return {
      apply(ctx) {
        if (typeof document === 'undefined') return;
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.dataset.plugin = PLUGIN_ID;
          tag.dataset.pluginCss = `${PLUGIN_ID}/composer-gap.css`;
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => {
            tag.remove();
          };
        }, 'dsh-fairy-composer: composer gap and corners');
      },
    };
  },
});
