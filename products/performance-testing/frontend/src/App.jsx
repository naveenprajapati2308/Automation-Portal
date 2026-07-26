import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VirtualUsers from './pages/VirtualUsers.jsx';
import PerformanceTests from './pages/PerformanceTests.jsx';
import LoadTests from './pages/LoadTests.jsx';
import TestGroups from './pages/TestGroups.jsx';
import Scheduler from './pages/Scheduler.jsx';
import RunHistory from './pages/RunHistory.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/virtual-users" element={<VirtualUsers />} />
        <Route path="/performance-tests" element={<PerformanceTests />} />
        <Route path="/load-tests" element={<LoadTests />} />
        <Route path="/groups" element={<TestGroups />} />
        <Route path="/scheduler" element={<Scheduler />} />
        <Route path="/runs" element={<RunHistory />} />
      </Route>
    </Routes>
  );
}
