import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function KnowledgeCenterScreen() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  const fetchBookmarks = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setBookmarkedIds(userSnap.data()?.bookmarkedItems || []);
      } else {
        setBookmarkedIds([]);
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const fetchData = async () => {
    try {
      const q = query(collection(db, 'knowledgeCenter'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setData(list);
      filterByTabAndSearch(list, selectedTab, search);
    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', 'Failed to load knowledge center data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    fetchBookmarks();
  }, []);

  useEffect(() => {
    fetchData();
    fetchBookmarks();
  }, []);

  const filterByTabAndSearch = (source, tab, searchText) => {
    let list = [...source];
    if (tab !== 'all') {
      list = list.filter(item => item.type === tab);
    }
    if (searchText) {
      list = list.filter(item =>
        item.title.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    setFiltered(list);
  };

  const handleSearch = (text) => {
    setSearch(text);
    filterByTabAndSearch(data, selectedTab, text);
  };

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    filterByTabAndSearch(data, tab, search);
  };

  const toggleBookmark = async (itemId) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      let bookmarks = [];

      if (userSnap.exists()) {
        bookmarks = userSnap.data().bookmarkedItems || [];
      }

      const alreadyBookmarked = bookmarks.includes(itemId);
      const updated = alreadyBookmarked
        ? bookmarks.filter(id => id !== itemId)
        : [...bookmarks, itemId];

      await setDoc(userRef, { bookmarkedItems: updated }, { merge: true });

      setBookmarkedIds(updated);
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  };

  const openLink = async (url) => {
    if (!url) {
      Alert.alert('No link provided');
      return;
    }

    // Ensure URL starts with http or https
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

    try {
      const supported = await Linking.canOpenURL(normalizedUrl);
      if (supported) {
        await Linking.openURL(normalizedUrl);
      } else {
        console.log('Unsupported URL:', normalizedUrl);
        Alert.alert('Cannot open this URL:', normalizedUrl);
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Error', 'Something went wrong while opening the link.');
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const seconds = diff / 1000;

    if (seconds < 60) return `${Math.floor(seconds)} sec ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.title}>{item.title}</Text>
        <TouchableOpacity onPress={() => toggleBookmark(item.id)}>
          <Feather
            name={bookmarkedIds.includes(item.id) ? 'bookmark' : 'bookmark'}
            color={bookmarkedIds.includes(item.id) ? '#007bff' : '#888'}
            size={20}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.updatedText}>
        Last updated: {formatTimeAgo(item.lastUpdated)}
      </Text>

      {(item.type === 'pdfs' || item.type === 'videos') && !!item.url && (
        <TouchableOpacity
          style={styles.openButton}
          onPress={() => openLink(item.url)}
        >
          <Text style={styles.openButtonText}>Download / Open</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const tabs = ['all', 'articles', 'pdfs', 'videos', 'training'];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Knowledge Center</Text>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search articles, PDFs, videos..."
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.tabs}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => handleTabChange(tab)}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.activeTabText,
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>No content available.</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    color: '#333',
    fontSize: 12,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    padding: 14,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  updatedText: {
    marginTop: 6,
    fontSize: 13,
    color: '#555',
  },
  openButton: {
    marginTop: 10,
    backgroundColor: '#007bff',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: 'gray',
    fontSize: 16,
  },
});
