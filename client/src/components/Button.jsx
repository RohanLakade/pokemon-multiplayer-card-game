const VARIANTS = {
  primary: 'bg-accent text-ink hover:bg-yellow-300',
  secondary: 'border border-white/15 bg-panel-light text-slate-100 hover:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
};

// type="button" by default, so a button inside a form never submits it by accident
function Button({ variant = 'primary', type = 'button', className = '', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export default Button;
