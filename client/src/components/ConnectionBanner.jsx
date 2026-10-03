import { Link } from 'react-router';
import { useSelector } from 'react-redux';

// Shown when the connection to the server drops. (Automatic rejoining is added in Step 7.)
function ConnectionBanner() {
  const connection = useSelector((state) => state.room.connection);

  if (connection !== 'lost') return null;

  return (
    <div role="status" className="border-b border-amber-400/40 bg-amber-950 text-amber-100">
      <p className="mx-auto max-w-5xl px-4 py-3">
        The connection to the game server was lost.{' '}
        <Link to="/" className="underline">
          Back to the home page
        </Link>
      </p>
    </div>
  );
}

export default ConnectionBanner;
