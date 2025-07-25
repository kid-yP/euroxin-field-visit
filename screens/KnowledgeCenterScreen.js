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
  Modal,
  Animated,
  Easing
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export default function KnowledgeCenterScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchBarHeight] = useState(new Animated.Value(0));

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Sales', value: 'sales' },
    { label: 'Products', value: 'products' },
    { label: 'Procedures', value: 'procedures' },
    { label: 'Training', value: 'training' },
  ];

  const types = [
    { label: 'All', value: 'all' },
    { label: 'Articles', value: 'articles' },
    { label: 'PDFs', value: 'pdfs' },
    { label: 'Videos', value: 'videos' },
    { label: 'Links', value: 'links' },
  ];

  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
    Animated.timing(searchBarHeight, {
      toValue: showSearchBar ? 0 : 40,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const fetchBookmarks = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      setBookmarkedIds(userSnap.exists() ? userSnap.data().bookmarkedItems || [] : []);
    } catch (error) {
      console.error('Bookmark error:', error);
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
      filterData(list, selectedCategory, selectedType, searchQuery);
    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', 'Failed to load data');
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

  const filterData = (source, category, type, query) => {
    let list = [...source];
    
    if (category !== 'all') list = list.filter(item => item.category === category);
    if (type !== 'all') list = list.filter(item => item.type === type);
    if (query) {
      const lowerQuery = query.toLowerCase();
      list = list.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    setFiltered(list);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterData(data, selectedCategory, selectedType, text);
  };

  const handleCategorySelect = (value) => {
    setSelectedCategory(value);
    setShowCategoryDropdown(false);
    filterData(data, value, selectedType, searchQuery);
  };

  const handleTypeSelect = (value) => {
    setSelectedType(value);
    setShowTypeDropdown(false);
    filterData(data, selectedCategory, value, searchQuery);
  };

  const getTypeColor = (type) => {
    const colors = {
      articles: '#E3F2FD',
      pdfs: '#E8F5E9',
      videos: '#FFEBEE',
      links: '#FFF5E6'
    };
    return colors[type] || '#F5F5F5';
  };

  const toggleBookmark = async (itemId) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      let bookmarks = userSnap.exists() ? userSnap.data().bookmarkedItems || [] : [];
      const updated = bookmarks.includes(itemId)
        ? bookmarks.filter(id => id !== itemId)
        : [...bookmarks, itemId];

      await setDoc(userRef, { bookmarkedItems: updated }, { merge: true });
      setBookmarkedIds(updated);
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  const handleDownload = async (url) => {
    if (!url) {
      Alert.alert('Error', 'No download link available');
      return;
    }

    try {
      // Check if URL has protocol, add https:// if missing
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Check if the link can be opened
      const supported = await Linking.canOpenURL(formattedUrl);
      
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {
        Alert.alert('Error', "Cannot open this resource");
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open resource');
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown';
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
    
    if (seconds < 60) return `${seconds} sec ago`;
    if (seconds < 3600) return `${Math.floor(seconds/60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)} hr ago`;
    return `${Math.floor(seconds/86400)} days ago`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
          <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => toggleBookmark(item.id)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons
            name={bookmarkedIds.includes(item.id) ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={bookmarkedIds.includes(item.id) ? '#007bff' : '#6B778C'}
          />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.cardTitle}>{item.title}</Text>
      
      {item.description && (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.cardFooter}>
        <Text style={styles.timeText}>{formatTimeAgo(item.lastUpdated)}</Text>
        
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownload(item.url)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.downloadButtonText}>OPEN</Text>
          <Feather name="external-link" size={16} color="#007bff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDropdownItem = (item, onSelect) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => onSelect(item.value)}
    >
      <Text style={styles.dropdownItemText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#38B6FF4D', '#80CC28']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Knowledge Center</Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={toggleSearchBar}
          >
            <Feather name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.searchContainer, { height: searchBarHeight }]}>
        <View style={styles.searchInnerContainer}>
          <Feather name="search" size={20} color="#6B778C" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources..."
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoFocus={showSearchBar}
          />
          {showSearchBar && (
            <TouchableOpacity onPress={toggleSearchBar}>
              <Feather name="x" size={20} color="#6B778C" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <View style={styles.filterRow}>
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Category</Text>
          <TouchableOpacity 
            style={styles.filterBox}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <Text style={styles.filterValue}>
              {categories.find(c => c.value === selectedCategory)?.label}
            </Text>
            <Feather name="chevron-down" size={16} color="#007bff" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Type</Text>
          <TouchableOpacity 
            style={styles.filterBox}
            onPress={() => setShowTypeDropdown(true)}
          >
            <Text style={styles.filterValue}>
              {types.find(t => t.value === selectedType)?.label}
            </Text>
            <Feather name="chevron-down" size={16} color="#007bff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            {categories.map(item => renderDropdownItem(item, handleCategorySelect))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Type Dropdown Modal */}
      <Modal
        visible={showTypeDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypeDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            {types.map(item => renderDropdownItem(item, handleTypeSelect))}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Feather name="book-open" size={48} color="#6B778C" />
              <Text style={styles.emptyText}>No resources found</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9FFFA',
  },
  header: {
    height: 70,
    justifyContent: 'center',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: 'white',
    left: 6,
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 10, // Added space between header and search bar
  },
  searchInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  filterContainer: {
    width: '48%',
  },
  filterLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#6B778C',
    marginBottom: 8,
    marginLeft: 4,
  },
  filterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterValue: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#172B4D',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    paddingVertical: 8,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#172B4D',
  },
  list: {
    flex: 1,
    paddingBottom: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#172B4D',
  },
  cardTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
    marginBottom: 8,
  },
  cardDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#6B778C',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#007bff',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#6B778C',
    marginTop: 16,
  },
});
