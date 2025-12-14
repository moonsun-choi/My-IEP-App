
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DailyData } from './pages/DailyData';
import { Reports } from './pages/Reports';
import { StudentList } from './pages/StudentList';
import { StudentDetail } from './pages/StudentDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Toaster 
        position="bottom-center"
        toastOptions={{
            style: {
                borderRadius: '16px',
                background: '#333',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
            },
            success: {
                iconTheme: {
                    primary: '#4ade80',
                    secondary: '#333',
                },
            },
            error: {
                style: {
                    background: '#ef4444',
                },
            },
        }}
      />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/student/:id" element={<StudentDetail />} />
          <Route path="/tracker" element={<DailyData />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
