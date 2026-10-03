import { useEffect } from 'react';

const SITE_NAME = 'Pokémon Card Battle';
const DEFAULT_DESCRIPTION =
  'Play a free online Pokémon Top Trumps card game with 2 to 6 friends. Pick a stat, play your card and win the round. No sign-up needed.';

// Sets the tab title and description for the current page.
// index.html already has these tags (link-preview bots read that file), so we update the
// existing ones instead of adding duplicates. Private pages also ask search engines to skip them.
function PageMeta({ title, description = DEFAULT_DESCRIPTION, noIndex = false }) {
  useEffect(() => {
    document.title = title
      ? `${title} | ${SITE_NAME}`
      : `${SITE_NAME} | Free multiplayer Top Trumps card game`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);

    if (!noIndex) return undefined;

    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.append(robots);
    return () => robots.remove();
  }, [title, description, noIndex]);

  return null;
}

export default PageMeta;
