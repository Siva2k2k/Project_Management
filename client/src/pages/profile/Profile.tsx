import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context';
import { userService } from '../../services/userService';
import { authService } from '../../services';

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export const Profile: React.FC = () => {
  const { user, logout, setUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setProfileMessage(null);
      const updatedUser = await userService.updateProfile(data);
      // Update user state immediately to reflect changes without refresh
      if (user) {
        setUser({ ...user, ...updatedUser });
      }
      setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
      setIsEditingProfile(false);
    } catch (err) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update profile';
      setProfileMessage({ type: 'error', text: errorMessage });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setPasswordMessage(null);
      await authService.changePassword(data.currentPassword, data.newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed. Please log in again.' });
      resetPassword();
      setIsChangingPassword(false);
      // Logout after password change
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to change password';
      setPasswordMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleDeactivateAccount = async () => {
    if (window.confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
      try {
        await userService.deactivateAccount();
        logout();
      } catch (err) {
        setProfileMessage({ type: 'error', text: 'Failed to deactivate account' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 pl-16 lg:pl-0">Profile Settings</h1>

        {/* Profile Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Profile Information
            </h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {profileMessage && (
            <div
              className={`mb-4 p-3 rounded ${
                profileMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200'
              }`}
            >
              {profileMessage.text}
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  {...registerProfile('name')}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {profileErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{profileErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isProfileSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isProfileSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
                <p className="text-gray-900 dark:text-white">{user?.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
                <p className="text-gray-900 dark:text-white">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
                <p className="text-gray-900 dark:text-white">{user?.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Change Password
            </h2>
            {!isChangingPassword && (
              <button
                onClick={() => setIsChangingPassword(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Change
              </button>
            )}
          </div>

          {passwordMessage && (
            <div
              className={`mb-4 p-3 rounded ${
                passwordMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-200'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          {isChangingPassword ? (
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <input
                  {...registerPassword('currentPassword')}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  {...registerPassword('newPassword')}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <input
                  {...registerPassword('confirmPassword')}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isPasswordSubmitting ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    resetPassword();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click "Change" to update your password
            </p>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Once you deactivate your account, you will lose access to the platform.
          </p>
          <button
            onClick={handleDeactivateAccount}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
