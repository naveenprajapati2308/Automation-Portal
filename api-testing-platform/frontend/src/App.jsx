import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TesterCollections from './pages/TesterCollections.jsx';
import CollectionRequestsList from './pages/CollectionRequestsList.jsx';
import RequestWorkspace from './pages/RequestWorkspace.jsx';
import BaseApis from './pages/BaseApis.jsx';
import RegularApis from './pages/RegularApis.jsx';
import Scheduler from './pages/Scheduler.jsx';
import History from './pages/History.jsx';
import Modules from './pages/Modules.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tester" element={<TesterCollections />} />
        <Route path="/tester/:collectionId" element={<CollectionRequestsList />} />
        <Route path="/tester/:collectionId/:requestId" element={<RequestWorkspace />} />
        <Route path="/base-apis" element={<BaseApis />} />
        <Route path="/regular-apis" element={<RegularApis />} />
        <Route path="/scheduler" element={<Scheduler />} />
        <Route path="/history" element={<History />} />
        <Route path="/modules" element={<Modules />} />
      </Route>
    </Routes>
  );
}
