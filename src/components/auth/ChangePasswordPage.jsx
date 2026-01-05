import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 12) {
      newErrors.newPassword = 'Password must be at least 12 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await api.changePassword(formData.newPassword);

      // Force logout and redirect to login so user can log in again with new password
      // This ensures the mustChangePassword flag is properly cleared
      logout();
      navigate('/login', {
        state: {
          message: 'Password changed successfully. Please log in with your new password.',
        },
      });
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to change password' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Change Your Password</h1>
            <p className="text-gray-600">You must change your password before continuing</p>
          </div>

          {/* Alert */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg mb-6">
            <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                You're using a temporary password. Please create a new, secure password to continue
                using OrgTree.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.newPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter new password"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password *
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{errors.submit}</div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>

          {/* User Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Logged in as <strong>{user?.name}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
