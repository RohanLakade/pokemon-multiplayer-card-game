// A spinner with a message. role="status" makes screen readers announce the message.
function LoadingState({ message }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-24 text-slate-300">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-accent"
      />
      <p>{message}</p>
    </div>
  );
}

export default LoadingState;
