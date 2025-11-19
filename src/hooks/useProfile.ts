import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getProfile, saveProfile, updateProfile } from '../db';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data || null);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProfile: UserProfile = {
      ...profileData,
      id: 'user-profile',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await saveProfile(newProfile);
    setProfile(newProfile);
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    await updateProfile(updates);
    await loadProfile();
  };

  return {
    profile,
    loading,
    createProfile,
    updateProfile: updateProfileData,
    refreshProfile: loadProfile,
  };
}
