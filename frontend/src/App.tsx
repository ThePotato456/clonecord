import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import ChannelPage from './pages/ChannelPage';
import DMPage from './pages/DMPage';
import AppLayout from './components/AppLayout';

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/channel/:id"
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
      <Route path="/" element={<Navigate to="/channel/general" replace />} />
    </Routes>
  );
}

export default App;
