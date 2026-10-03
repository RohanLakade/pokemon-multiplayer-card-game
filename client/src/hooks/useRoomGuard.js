import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

// Lobby and game pages only make sense for a player who is in that room.
// Anyone else (for example opening a shared link) goes to the home page with the code filled in.
export function useRoomGuard(codeFromUrl) {
  const navigate = useNavigate();
  const joinedCode = useSelector((state) => state.room.code);
  const isInRoom = joinedCode !== null && joinedCode === codeFromUrl.toUpperCase();

  useEffect(() => {
    if (!isInRoom) navigate(`/?code=${codeFromUrl}`, { replace: true });
  }, [isInRoom, codeFromUrl, navigate]);

  return isInRoom;
}
