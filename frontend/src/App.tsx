import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import ChannelPage from './pages/ChannelPage';
import DMPage from './pages/DMPage';
import RootRedirect from './pages/RootRedirect';

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/server/:serverId/channel/:channelId"
        element={
          <AppLayout>
            <ChannelPage />
          </AppLayout>
        }
      />
      <Route
        path="/dm/:userId"
        element={
          <AppLayout>
            <DMPage />
          </AppLayout>
        }
      />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
