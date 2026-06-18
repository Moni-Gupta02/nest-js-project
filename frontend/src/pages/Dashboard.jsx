import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as authService from '../services/authService.js';

/**
 * Dashboard Page
 * --------------
 * Demonstrates the complete JWT refresh flow:
 * 1. Fetches user profile on mount (uses access token)
 * 2. Access token expires after 15 seconds
 * 3. Next profile fetch returns 401
 * 4. Axios interceptor automatically refreshes the token
 * 5. Original request is retried — user stays logged in
 */
const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(null);
  const [fetchCount, setFetchCount] = useState(0);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await authService.getProfile();
      setProfile(response.data.user);
      setLastFetch(new Date().toLocaleTimeString());
      setFetchCount((prev) => prev + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tokenExpiry = localStorage.getItem('accessToken')
    ? '15 seconds from issue (for testing)'
    : 'No token';

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>JWT Auth Dashboard</h2>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </nav>

      <div className="dashboard-content">
        <div className="info-banner">
          <h3>Token Refresh Demo</h3>
          <p>
            Access tokens expire in <strong>15 seconds</strong>. Click
            &quot;Refresh Profile&quot; after waiting 15+ seconds to see the
            automatic token refresh in action. The Axios interceptor handles
            everything silently.
          </p>
        </div>

        <div className="profile-card">
          <div className="profile-header">
            <h3>User Profile</h3>
            <button
              onClick={fetchProfile}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Fetching...' : 'Refresh Profile'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {profile && (
            <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">Name</span>
                <span className="detail-value">{profile.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email</span>
                <span className="detail-value">{profile.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">User ID</span>
                <span className="detail-value detail-mono">{profile._id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Member Since</span>
                <span className="detail-value">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          <div className="stats-row">
            <div className="stat">
              <span className="stat-label">Profile Fetches</span>
              <span className="stat-value">{fetchCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Last Fetch</span>
              <span className="stat-value">{lastFetch || '—'}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Token Expiry</span>
              <span className="stat-value">{tokenExpiry}</span>
            </div>
          </div>
        </div>

        <div className="flow-card">
          <h3>Authentication Flow</h3>
          <ol className="flow-steps">
            <li>Login → Access Token generated (stored in localStorage)</li>
            <li>Refresh Token stored in HttpOnly cookie (not accessible via JS)</li>
            <li>API requests include Access Token in Authorization header</li>
            <li>Access Token expires after 15 seconds</li>
            <li>API returns 401 Unauthorized</li>
            <li>Axios Response Interceptor catches 401</li>
            <li>Calls POST /api/auth/refresh-token (cookie sent automatically)</li>
            <li>New Access Token received and saved</li>
            <li>Original request retried automatically</li>
            <li>User remains logged in seamlessly</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
