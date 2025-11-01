import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Loader from './components/Loader.jsx';

// Lazy load components for faster initial load
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Compare = lazy(() => import('./pages/Compare.jsx'));

const AppRoutes = () => (
  <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/compare" element={<Compare />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;

