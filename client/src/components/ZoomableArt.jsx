import { useEffect, useRef, useState } from 'react';
import Button from './Button.jsx';
import CardArt from './CardArt.jsx';

const LARGE_SIZE = 475; // the official artwork is about this big, so larger would look blurry

// The artwork of a card. Tapping it opens a pop-up with the large image, in the browser's
// built-in modal <dialog> (it dims the page, keeps focus inside and closes on Escape).
// The button sits ON TOP of the image instead of around it, so the image keeps its own role.
function ZoomableArt({ card, size }) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Nothing to enlarge without an image
  if (!card.image) return <CardArt card={card} size={size} />;

  return (
    <div className="relative">
      <CardArt card={card} size={size} />
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`View ${card.displayName} artwork larger`}
        className="absolute inset-0 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-accent"
      />

      <dialog
        ref={dialogRef}
        aria-label={`${card.displayName} artwork`}
        onClose={() => setIsOpen(false)}
        // A click on the dimmed area is a click on the dialog element itself
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}
        className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-white/10 bg-panel p-0 text-slate-100 backdrop:bg-black/80"
      >
        {/* The content only exists while the dialog is open */}
        {isOpen && (
          <div className="flex flex-col items-center gap-3 p-4">
            <p className="text-lg font-bold">{card.displayName}</p>
            <img
              src={card.image}
              alt={`${card.displayName} artwork, large view`}
              width={LARGE_SIZE}
              height={LARGE_SIZE}
              decoding="async"
              className="h-auto max-h-[65vh] w-auto max-w-full object-contain"
            />
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        )}
      </dialog>
    </div>
  );
}

export default ZoomableArt;
