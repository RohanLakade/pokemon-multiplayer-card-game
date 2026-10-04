import { Link } from 'react-router';
import { useSelector } from 'react-redux';

// Shown while the connection to the server is down. Socket.IO keeps trying to reconnect,
// and when it succeeds the player is seated again automatically (useSessionRestore).
function ConnectionBanner() {
  const connection = useSelector((state) => state.room.connection);

  if (connection !== 'lost') return null;

  return (
    <div role="status" className="border-b border-amber-400/40 bg-amber-950 text-amber-100">
      <p className="mx-auto max-w-5xl px-4 py-3">
        Connection lost. Trying to reconnect…{' '}
        <Link to="/" className="underline">
          Leave and go home
        </Link>
      </p>
    </div>
  );
}

export default ConnectionBanner;
