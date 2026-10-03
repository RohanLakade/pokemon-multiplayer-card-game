import { useDispatch, useSelector } from 'react-redux';
import { noticeCleared } from '../store/roomSlice.js';

// Shows one message at the top of the page. role="alert" makes screen readers read it out at once.
function NoticeBanner() {
  const notice = useSelector((state) => state.room.notice);
  const dispatch = useDispatch();

  if (!notice) return null;

  return (
    <div role="alert" className="border-b border-rose-400/40 bg-rose-950 text-rose-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <p>{notice}</p>
        <button
          type="button"
          onClick={() => dispatch(noticeCleared())}
          className="rounded px-2 py-1 underline focus-visible:outline-2 focus-visible:outline-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default NoticeBanner;
