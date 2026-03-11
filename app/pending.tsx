import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ApprovalWall from '@/components/ApprovalWall';
import { Colors, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ApprovalWall screenName="Voltrix" />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 18 }]}
      >
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.pureBlack,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  signOutBtn: {
    height: 50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 1.1,
    fontSize: 12,
  },
});
