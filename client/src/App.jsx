import { Route, Routes } from 'react-router';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import LobbyPage from './pages/LobbyPage.jsx';
import GamePage from './pages/GamePage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { useSocketEvents } from './hooks/useSocketEvents.js';

function App() {
  // Listens to the server once, for the whole app, and feeds the Redux store
  useSocketEvents();

  return (
    <ErrorBoundary>
      <Routes>
        {/* Layout draws the header and footer around whichever page matches */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby/:code" element={<LobbyPage />} />
          <Route path="/game/:code" element={<GamePage />} />
          <Route path="/result/:code" element={<ResultPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
