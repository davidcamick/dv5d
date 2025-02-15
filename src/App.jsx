import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './Pages/Dashboard';
import Tasks from './Pages/Tasks';
import Passwords from './Pages/Passwords';
import Login from './components/Login';
import { isAuthenticated, getUserEmail } from './utils/auth';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  
  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, []);

  const PrivateRoute = ({ children }) => {
    if (!authenticated) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  const handleLogin = (email) => {
    setAuthenticated(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          authenticated ? 
            <Navigate to="/" /> : 
            <Login onLogin={handleLogin} />
        } />
        <Route path="/" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/tasks" element={
          <PrivateRoute>
            <Tasks />
          </PrivateRoute>
        } />
        <Route path="/passwords" element={
          <PrivateRoute>
            <Passwords />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
