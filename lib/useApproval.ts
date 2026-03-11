import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase, upsertProfile, fetchApprovalStatus } from './supabase';

export const ADMIN_EMAIL = 'ukbayar@gmail.com';
export const ADMIN_UID = '40e32eee-1bee-4033-9ce1-f3b29d112d6e';

export interface ApprovalState {
  isApproved: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  userId: string | null;
  userEmail: string | null;
}

export function useApproval(): ApprovalState {
  const { user } = useAuth();
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const email = user?.email ?? null;
  const userId = user?.id ?? null;
  const isAdmin = email === ADMIN_EMAIL && userId === ADMIN_UID;

  const loadStatus = useCallback(async () => {
    // Not signed in → not approved
    if (!userId || !email) {
      setIsApproved(false);
      setIsLoading(false);
      return;
    }

    // Admin is always approved
    if (isAdmin) {
      setIsApproved(true);
      setIsLoading(false);
      return;
    }

    try {
      await upsertProfile(userId, email);
      const approved = await fetchApprovalStatus(userId);
      setIsApproved(approved);
    } catch {
      setIsApproved(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId, email, isAdmin]);

  const subscribeToProfile = useCallback(() => {
    if (!userId || isAdmin) return;

    if (channelRef.current) {
      void channelRef.current.unsubscribe().catch(() => {});
    }

    const channel = supabase
      .channel(`profile-approval-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newData = payload.new as { is_approved: boolean };
          setIsApproved(newData.is_approved ?? false);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [userId, isAdmin]);

  useEffect(() => {
    loadStatus();
    subscribeToProfile();

    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe().catch(() => {});
      }
    };
  }, [loadStatus, subscribeToProfile]);

  return {
    isApproved,
    isAdmin,
    isLoading,
    userId,
    userEmail: email,
  };
}