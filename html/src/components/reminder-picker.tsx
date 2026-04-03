import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { SectionCard } from '@/components/ui-shell';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatFriendlyDateTime, getSuggestedReminderDate } from '@/utils/date';

type ReminderPickerProps = {
  enabled: boolean;
  value: Date | null;
  onToggle: (enabled: boolean) => void;
  onChange: (date: Date) => void;
  helperText?: string;
  locked?: boolean;
};

export function ReminderPicker({
  enabled,
  value,
  onToggle,
  onChange,
  helperText,
  locked = false,
}: ReminderPickerProps) {
  const currentValue = value ?? getSuggestedReminderDate();

  function handleAndroidOpen() {
    let nextValue = new Date(currentValue);

    DateTimePickerAndroid.open({
      value: nextValue,
      mode: 'date',
      is24Hour: true,
      onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type !== 'set' || !selectedDate) {
          return;
        }

        nextValue = new Date(currentValue);
        nextValue.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        );

        DateTimePickerAndroid.open({
          value: nextValue,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, selectedTime?: Date) => {
            if (timeEvent.type !== 'set' || !selectedTime) {
              return;
            }

            const merged = new Date(nextValue);
            merged.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            onChange(merged);
          },
        });
      },
    });
  }

  return (
    <SectionCard tone="default">
      <View style={styles.topRow}>
        <View style={styles.labelBlock}>
          <Text style={styles.title}>设置提醒</Text>
          <Text style={styles.subtitle}>
            {enabled ? '到点时给手机发通知，并尝试写入系统日历。' : '不开的话，这条就只是普通记录。'}
          </Text>
        </View>

        <Switch
          value={enabled}
          onValueChange={locked ? undefined : onToggle}
          disabled={locked}
          trackColor={{ false: Colors.border, true: Colors.leafSoft }}
          thumbColor={enabled ? Colors.leaf : Colors.surface}
        />
      </View>

      {enabled ? (
        <View style={styles.pickerBlock}>
          <Text style={styles.selectedLabel}>提醒时间</Text>
          <Text style={styles.selectedTime}>{formatFriendlyDateTime(currentValue)}</Text>

          {Platform.OS === 'ios' ? (
            <View style={styles.inlinePicker}>
              <DateTimePicker
                value={currentValue}
                mode="datetime"
                display="spinner"
                locale="zh-CN"
                minuteInterval={5}
                onChange={(_, nextDate) => {
                  if (nextDate) {
                    onChange(nextDate);
                  }
                }}
              />
            </View>
          ) : (
            <Pressable
              onPress={handleAndroidOpen}
              disabled={locked}
              style={({ pressed }) => [
                styles.triggerButton,
                pressed && !locked ? styles.triggerPressed : null,
              ]}>
              <Text style={styles.triggerButtonText}>重新选择时间</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  labelBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.inkMuted,
  },
  pickerBlock: {
    gap: Spacing.two,
  },
  selectedLabel: {
    fontSize: 13,
    color: Colors.inkMuted,
  },
  selectedTime: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: Colors.ink,
  },
  inlinePicker: {
    marginTop: Spacing.one,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  triggerButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  triggerPressed: {
    opacity: 0.82,
  },
  triggerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.leaf,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 21,
    color: Colors.inkMuted,
  },
});
