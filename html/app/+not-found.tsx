import { Link } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>这个页面不存在</Text>
      <Text style={styles.body}>可以先回到记录页，继续把巡田记录记下来。</Text>
      <Link href="/" style={styles.link}>
        返回首页
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.six,
    backgroundColor: Colors.background,
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.ink,
  },
  body: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    color: Colors.inkMuted,
  },
  link: {
    marginTop: Spacing.two,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.leaf,
  },
});
