import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors, Fonts, BorderRadius } from '@/constants/theme';

interface StatChipProps {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}

export default function StatChip({ label, value, color, icon }: StatChipProps) {
  return (
    <View style={styles.chip}>
      <View style={styles.header}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, color ? { color } : null, { fontFamily: Fonts.mono }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    minWidth: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconWrapper: {
    marginRight: 4,
  },
  label: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
