import React from 'react';
import { AppProvider } from './contexts/AppContext';
import useRouter from './hooks/useRouter';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import ShopPage from './pages/ShopPage';
import VideoTemplate from './components/video/VideoTemplate';
import { Toaster } from 'sonner';

const App: React.FC = () => {
  const { route } = useRouter();

  const renderPage = () => {
    switch (route) {
      case '/dashboard':
        return <Layout><DashboardPage /></Layout>;
      case '/admin':
        return <Layout><AdminPage /></Layout>;
      case '/shop':
        return <Layout><ShopPage /></Layout>;
      case '/video':
        return <VideoTemplate />;
      case '/':
      default:
        return <Layout><HomePage /></Layout>;
    }
  };

  return (
    <AppProvider>
      {renderPage()}
      <Toaster theme="dark" position="bottom-right" />
    </AppProvider>
  );
};

export default App;
