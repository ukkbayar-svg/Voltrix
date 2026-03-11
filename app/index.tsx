import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/lib/auth';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const { user } = useAuth();

  // Hard-coded security override: only this exact account has admin access
  const isAdmin =
    user?.email === 'ukbayar@gmail.com' && user?.id === '40e32eee-1bee-4033-9ce1-f3b29d112d6e';

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('onboarding_complete');
        setHasOnboarded(value === 'true');
      } catch {
        setHasOnboarded(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.voltrixAccent} />
      </View>
    );
  }

  // If admin logs in, send them to the hidden admin route
  if (isAdmin) {
    return <Redirect href="/admin" />;
  }

  // Always allow entering the app (guest browsing). Onboarding gates first-time users only.
  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
});