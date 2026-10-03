import { Link } from 'react-router';
import PageMeta from '../components/PageMeta.jsx';

function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <PageMeta title="Page not found" noIndex />
      <h1 className="text-4xl font-extrabold">Page not found</h1>
      <p className="mt-3 text-slate-300">The page you are looking for does not exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-accent px-4 py-2.5 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Back to the home page
      </Link>
    </section>
  );
}

export default NotFoundPage;
