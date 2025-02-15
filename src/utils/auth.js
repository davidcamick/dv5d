const ALLOWED_EMAILS = ['davidpaulcamick@gmail.com', 'dcamick25@spxstudent.org']; // Updated allowed emails

export const initializeGoogleAuth = () => {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  document.head.appendChild(script);

  return new Promise((resolve) => {
    script.onload = () => resolve();
  });
};

export const handleGoogleSignIn = (credential) => {
  const decoded = parseJwt(credential);
  const email = decoded.email;
  
  if (ALLOWED_EMAILS.includes(email)) {
    localStorage.setItem('userEmail', email);
    return { success: true, email };
  }
  
  return { success: false, error: 'Access denied' };
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('userEmail');
};

export const getUserEmail = () => {
  return localStorage.getItem('userEmail');
};

export const logout = () => {
  localStorage.removeItem('userEmail');
};

function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  ).join(''));
  return JSON.parse(jsonPayload);
}
