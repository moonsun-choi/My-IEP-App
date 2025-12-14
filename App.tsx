
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DailyData } from './pages/DailyData';
import { Reports } from './pages/Reports';
import { StudentList } from './pages/StudentList';
import { StudentManage } from './pages/StudentManage';
import { StudentDetail } from './pages/StudentDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<StudentList />} />
          <Route path="/students/manage" element={<StudentManage />} />
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
