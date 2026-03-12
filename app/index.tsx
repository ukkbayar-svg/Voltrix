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

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  // Require sign-in to access the app
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Admins can access the Admin tab from inside the app; don't force-redirect.
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