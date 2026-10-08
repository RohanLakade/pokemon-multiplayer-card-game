import { useState } from 'react';

// The artwork of a card. It has a fixed size, so the page does not jump while images load,
// and it shows a placeholder when an image cannot be loaded.
// "decorative" is for lists where the card's name is already written next to the image.
function CardArt({ card, size, decorative = false }) {
  const [failed, setFailed] = useState(false);

  if (!card.image || failed) {
    return (
      <div
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : `No artwork for ${card.displayName}`}
        aria-hidden={decorative ? 'true' : undefined}
        className="flex shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-500"
        style={{ width: size, height: size }}
      >
        ?
      </div>
    );
  }

  return (
    <img
      src={card.image}
      alt={decorative ? '' : `${card.displayName} official artwork`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
    />
  );
}

export default CardArt;
