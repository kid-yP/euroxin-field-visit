// components/ExpandableSection.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ExpandableSection({ title, children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
});
