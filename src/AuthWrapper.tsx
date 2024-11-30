import React, { useEffect, useState } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authenticate = () => {
      const username = prompt('Username:');
      const password = prompt('Password:');

      if (username === 'your-username' && password === 'your-password') {
        setIsAuthenticated(true);
        sessionStorage.setItem('isAuthenticated', 'true');
      } else {
        alert('Invalid credentials');
        authenticate();
      }
    };

    const isAuth = sessionStorage.getItem('isAuthenticated') === 'true';
    if (!isAuth) {
      authenticate();
    } else {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default AuthWrapper;