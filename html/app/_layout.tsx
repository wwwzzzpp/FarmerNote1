import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import React, { Suspense, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { AppDataProvider } from '@/context/app-data-context';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function NotificationObserver() {
  useEffect(() => {
    function redirectFromNotification(notification: Notifications.Notification) {
      const data = notification.request.content.data;
      const url = typeof data?.url === 'string' ? data.url : null;

      if (url) {
        router.push(url as never);
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification) {
        redirectFromNotification(response.notification);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirectFromNotification(response.notification);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

function RootTabs() {
  return (
    <>
      <NotificationObserver />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.leaf,
          tabBarInactiveTintColor: Colors.inkMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: '记录',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="create-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="timeline"
          options={{
            title: '时间线',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: '待办',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={Colors.leaf} />
        <Text style={styles.loadingTitle}>巡田记</Text>
        <Text style={styles.loadingBody}>正在打开本地记录和提醒…</Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={migrateDbIfNeeded}
        useSuspense>
        <Suspense fallback={<LoadingScreen />}>
          <AppDataProvider>
            <RootTabs />
          </AppDataProvider>
        </Suspense>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.six,
  },
  loadingCard: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.seven,
    alignItems: 'center',
    gap: Spacing.three,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ink,
  },
  loadingBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.inkMuted,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    paddingTop: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
