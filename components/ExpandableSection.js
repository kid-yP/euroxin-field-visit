// components/ExpandableSection.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ExpandableSection({ 
  title, 
  children, 
  icon, 
  iconColor = '#38B6FF',
  headerBgColor = 'rgba(240, 248, 255, 0.8)'
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)} 
        style={[styles.header, { backgroundColor: headerBgColor }]}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          {icon && (
            <Ionicons 
              name={icon} 
              size={20} 
              color={iconColor} 
              style={styles.icon} 
            />
          )}
          <Text style={styles.title}>{title}</Text>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={24} 
            color="#38B6FF" 
          />
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FDFF',
    borderWidth: 1,
    borderColor: 'rgba(56, 182, 255, 0.15)',
  },
  header: {
    paddingVertical: 18,  // Increased vertical padding
    paddingHorizontal: 16,
    minHeight: 60,       // Changed to minHeight for better text accommodation
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    color: '#2D3748',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 22,       // Added lineHeight for better text display
    includeFontPadding: true, // Ensures proper text rendering
    paddingVertical: 2,   // Extra vertical padding for text
  },
  content: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});
