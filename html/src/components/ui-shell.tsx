import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

type ScreenViewProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

type SectionCardProps = {
  children: React.ReactNode;
  tone?: 'default' | 'accent' | 'muted' | 'success';
  style?: StyleProp<ViewStyle>;
};

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  compact?: boolean;
};

type StatusChipProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

const toneStyles = {
  default: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  accent: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accentBorder,
  },
  muted: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
  },
  success: {
    backgroundColor: Colors.successSoft,
    borderColor: Colors.successBorder,
  },
} as const;

const statusStyles = {
  neutral: {
    backgroundColor: Colors.surfaceAlt,
    textColor: Colors.inkMuted,
  },
  success: {
    backgroundColor: Colors.successSoft,
    textColor: Colors.leafDark,
  },
  warning: {
    backgroundColor: Colors.warningSoft,
    textColor: Colors.warningText,
  },
  danger: {
    backgroundColor: Colors.dangerSoft,
    textColor: Colors.dangerText,
  },
} as const;

export function ScreenView({ title, subtitle, children }: ScreenViewProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.stack}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function SectionCard({ children, tone = 'default', style }: SectionCardProps) {
  return <View style={[styles.card, toneStyles[tone], style]}>{children}</View>;
}

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <SectionCard tone="muted">
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </SectionCard>
  );
}

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  compact = false,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        compact ? styles.buttonCompact : styles.buttonRegular,
        buttonVariants[variant],
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}>
      <Text style={[styles.buttonLabel, buttonLabelVariants[variant]]}>{label}</Text>
    </Pressable>
  );
}

export function StatusChip({ label, tone = 'neutral' }: StatusChipProps) {
  return (
    <View style={[styles.statusChip, { backgroundColor: statusStyles[tone].backgroundColor }]}>
      <Text style={[styles.statusChipText, { color: statusStyles[tone].textColor }]}>{label}</Text>
    </View>
  );
}

const buttonVariants = StyleSheet.create({
  primary: {
    backgroundColor: Colors.leaf,
    borderColor: Colors.leaf,
  },
  secondary: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  danger: {
    backgroundColor: Colors.dangerSoft,
    borderColor: Colors.dangerBorder,
  },
});

const buttonLabelVariants = StyleSheet.create({
  primary: {
    color: Colors.surface,
  },
  secondary: {
    color: Colors.ink,
  },
  ghost: {
    color: Colors.inkMuted,
  },
  danger: {
    color: Colors.dangerText,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  header: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: Colors.ink,
  },
  subtitle: {
    marginTop: Spacing.two,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.inkMuted,
  },
  stack: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
  },
  sectionHeaderSubtitle: {
    fontSize: 13,
    color: Colors.inkMuted,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.inkMuted,
  },
  buttonBase: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRegular: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.four,
  },
  buttonCompact: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  statusChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
