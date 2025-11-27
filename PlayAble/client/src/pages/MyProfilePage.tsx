import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

interface MyProfilePageProps {
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
}

const MyProfilePage: React.FC<MyProfilePageProps> = ({ onNavigate, onLogout }) => {
  const { user, updateUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(
    user?.bio || 'Passionate gamer who loves accessible games and inclusive gaming experiences.'
  );

  // Keep local editBio in sync when the user object changes (e.g. after login/logout)
  useEffect(() => {
    setEditBio(
      user?.bio || 'Passionate gamer who loves accessible games and inclusive gaming experiences.'
    );
  }, [user]);

  // Derive joined date and membership duration dynamically.
  const { joinedLabel, memberForLabel } = useMemo(() => {
    const createdAt = (user as any)?.createdAt ? new Date((user as any).createdAt) : null;
    const joinDate = createdAt && !isNaN(createdAt.getTime()) ? createdAt : new Date();

    const formatter = new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
    });

    const joinedLabelComputed = `Joined ${formatter.format(joinDate)}`;

    const now = new Date();
    const diffMs = now.getTime() - joinDate.getTime();
    const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const memberForLabelComputed = `Member for ${days} day${days !== 1 ? 's' : ''}`;

    return {
      joinedLabel: joinedLabelComputed,
      memberForLabel: memberForLabelComputed,
    };
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const updatedName = editName.trim() || user.name;
    const updatedBio = editBio;

    const response = await authService.updateProfile({ name: updatedName, bio: updatedBio });
    if (response.success && response.user) {
      updateUser(response.user as any);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(user?.name || '');
    setEditBio(user?.bio || 'Passionate gamer who loves accessible games and inclusive gaming experiences.');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await onLogout();
  };

  return (
    <main className="profile-page" aria-label="My Profile page">
      {/* Header */}
      <section className="profile-header">
        <h1 className="profile-title">My Profile</h1>
        <p className="profile-subtitle">Manage your account and preferences</p>
      </section>

      <section className="profile-layout">
        {/* Left: profile card matching prototype 2 layout */}
        <div className="profile-main-card" aria-label="Account overview">
          <div className="profile-main-card-inner">
            <div className="profile-main-avatar-row">
              <div className="profile-avatar profile-avatar--light">
                {(user?.name || 'ME').slice(0, 2).toUpperCase()}
              </div>
            </div>

            <div className="profile-main-text">
              {isEditing ? (
                <input
                  type="text"
                  className="profile-input profile-input--name profile-input--name-edit"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  aria-label="Full name"
                />
              ) : (
                <h2 className="profile-name">{user?.name || 'Max Evans'}</h2>
              )}
              <p className="profile-email">{user?.email || 'max.evans@example.com'}</p>
            </div>

            <div className="profile-meta-column">
              <p className="profile-meta-item">
                <span className="profile-meta-icon" aria-hidden="true">
                  📅
                </span>
                <span>{joinedLabel}</span>
              </p>
              <p className="profile-meta-item">
                <span className="profile-meta-icon" aria-hidden="true">
                  👤
                </span>
                <span>{memberForLabel}</span>
              </p>
            </div>

            <hr className="profile-main-divider" />

            <div className="profile-main-actions-row">
              {isEditing ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={handleSave}>
                    Save Profile
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary profile-main-edit"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="profile-main-logout-row">
              <button
                type="button"
                className="btn btn-danger profile-logout"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

        {/* Right: Bio and Security cards */}
        <div className="profile-side-column">
          <section className="profile-card" aria-label="Bio">
            <h2 className="profile-card-title">My Bio</h2>
            {isEditing ? (
              <textarea
                className="profile-textarea"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                aria-label="Bio"
              />
            ) : (
              <p className="profile-bio-text">{user?.bio || editBio}</p>
            )}
          </section>

          <section className="profile-card" aria-label="Security settings">
            <h2 className="profile-card-title">Security</h2>
            <p className="profile-card-description">Update your login credentials</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onNavigate('/change-email-password')}
            >
              Change Email &amp; Password
            </button>
          </section>
        </div>
      </section>
    </main>
  );
};

export default MyProfilePage;
