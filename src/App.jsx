import { useState, useEffect } from 'react';
import { isAuthenticated } from './utils/auth';
import Login from './components/Login';
import Tasks from './Pages/Tasks';

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  const handleLogin = () => {
    setAuthenticated(true);
  };

  return authenticated ? <Tasks /> : <Login onLogin={handleLogin} />;
}

export default App;
