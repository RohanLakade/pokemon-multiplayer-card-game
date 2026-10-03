import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import ConnectionBanner from './ConnectionBanner.jsx';
import Footer from './Footer.jsx';
import NoticeBanner from './NoticeBanner.jsx';

// The frame around every page: skip link, header, banners, main content and footer.
function Layout() {
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const isFirstRender = useRef(true);

  // After moving to another page, scroll up and send keyboard and screen reader focus to the
  // new content. A single-page app does not reload, so the browser would not do this for us.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-ink text-slate-100">
      {/* Invisible until a keyboard user presses Tab, then it lets them jump past the header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-ink"
      >
        Skip to main content
      </a>

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            Pokémon Card Battle
          </Link>
        </div>
      </header>

      <ConnectionBanner />
      <NoticeBanner />

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 focus:outline-none"
      >
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default Layout;
