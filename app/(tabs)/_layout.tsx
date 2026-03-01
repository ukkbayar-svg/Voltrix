import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@fastshot/auth';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Hard-coded security override: Admin Panel entry point only visible to master admin
  const isAdmin = user?.email === 'ukbayar@gmail.com';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'web' ? Colors.glassOverlay : 'transparent',
          borderTopWidth: 1,
          borderTopColor: Colors.glassBorder,
          paddingBottom: insets.bottom,
          height: 70 + insets.bottom,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS !== 'web' ? (
            <BlurView
              intensity={50}
              tint="dark"
              style={StyleSheet.absoluteFill}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.glassOverlay }]} />
            </BlurView>
          ) : null,
        tabBarActiveTintColor: Colors.voltrixAccent,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Command',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="risk"
        options={{
          title: 'Risk Guard',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: 'Signals',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: 'Charts',
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      {/* Admin Panel entry point — only visible to master admin (ukbayar@gmail.com) */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          // Conditional block: {isAdmin && <AdminTab />} — non-admins get href: null (hidden)
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ focused, color }) => (
            <View style={focused ? styles.activeIconBg : undefined}>
              <Ionicons name={focused ? 'shield' : 'shield-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconBg: {
    backgroundColor: Colors.voltrixAccentDim,
    borderRadius: 10,
    padding: 4,
  },
});
