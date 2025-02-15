import { useEffect } from 'react';
import { initializeGoogleAuth, handleGoogleSignIn } from '../utils/auth';

export default function Login({ onLogin }) {
  useEffect(() => {
    const setup = async () => {
      await initializeGoogleAuth();
      window.google.accounts.id.initialize({
        client_id: '143705878411-viotoaa0i2ldlnnt9bglrfn2u7huopqv.apps.googleusercontent.com',
        callback: handleCredentialResponse
      });
      window.google.accounts.id.renderButton(
        document.getElementById("signInDiv"),
        { theme: "outline", size: "large" }
      );
    };
    setup();
  }, []);

  const handleCredentialResponse = (response) => {
    const result = handleGoogleSignIn(response.credential);
    if (result.success) {
      onLogin(result.email);
    } else {
      alert('Access denied. You are not authorized to access this application.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome, sir. Please verify your identity.</h1>
        <div id="signInDiv" className="flex justify-center"></div>
      </div>
    </div>
  );
}
