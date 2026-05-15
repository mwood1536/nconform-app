import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { TimelineEvent } from '../types';
import { formatDateTime } from '../utils/ncrHelpers';

interface Props {
  event: TimelineEvent;
  isLast: boolean;
}

export function TimelineItem({ event, isLast }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        <View style={styles.dot} />
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{event.label}</Text>
        {event.detail ? <Text style={styles.detail}>{event.detail}</Text> : null}
        <Text style={styles.timestamp}>{formatDateTime(event.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gutter: {
    width: 18,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.steelBlue,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bodyText,
  },
  detail: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.secondaryText,
    marginTop: 4,
  },
});
