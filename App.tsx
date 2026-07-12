import React from 'react';
import { AppProvider } from './contexts/AppContext';
import useRouter from './hooks/useRouter';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import { Toaster } from 'sonner';

const App: React.FC = () => {
  const { route } = useRouter();

  const renderPage = () => {
    switch (route) {
      case '/dashboard':
        return <DashboardPage />;
      case '/admin':
        return <AdminPage />;
      case '/':
      default:
        return <HomePage />;
    }
  };

  return (
    <AppProvider>
      <Layout>
        {renderPage()}
      </Layout>
      <Toaster theme="dark" position="bottom-right" />
    </AppProvider>
  );
};

export default App;
