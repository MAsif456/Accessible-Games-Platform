import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}


/**
 * A protected route component that redirects unauthenticated users to sign-in page
 * and preserves the intended destination for redirect after login
 * @param {ProtectedRouteProps} props - The children to render if the user is authenticated
 * @returns {React.ReactNode} - The children to render if the user is authenticated, otherwise a redirect to signin
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Avoid redirecting while auth state is still being determined on refresh
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    // Redirect to signin with return path
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

