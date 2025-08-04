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
  Modal,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
  Dimensions,
  Clipboard
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  serverTimestamp,
  increment,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const { width } = Dimensions.get('window');

export default function KnowledgeCenterScreen({ navigation }) {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchBarHeight] = useState(new Animated.Value(0));
  const [expandedId, setExpandedId] = useState(null);

  // Categories and types with icons
  const categories = [
    { label: 'All', value: 'all', icon: 'grid' },
    { label: 'Sales', value: 'sales', icon: 'dollar-sign' },
    { label: 'Products', value: 'products', icon: 'box' },
    { label: 'Procedures', value: 'procedures', icon: 'clipboard' },
    { label: 'Training', value: 'training', icon: 'award' },
  ];

  const types = [
    { label: 'All', value: 'all', icon: 'file' },
    { label: 'Articles', value: 'article', icon: 'file-text' },
    { label: 'PDFs', value: 'pdf', icon: 'picture-as-pdf' },
    { label: 'Videos', value: 'video', icon: 'video' },
    { label: 'Links', value: 'link', icon: 'link' },
  ];

  // Toggle search bar animation
  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
    Animated.timing(searchBarHeight, {
      toValue: showSearchBar ? 0 : 40,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  // Toggle resource expansion
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Fetch knowledge resources
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        console.log('User not authenticated');
        return;
      }

      const resourcesRef = collection(db, 'knowledgeResources ');
      const q = query(resourcesRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      // Validate each document exists and has required fields
      const validResources = [];
      const invalidResourceIds = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data && data.title) { // Basic validation
          validResources.push({
            id: doc.id,
            ...data,
            imageUrl: data.imageUrl || 'https://placehold.co/392x212?text=No+Preview',
            type: data.type || 'article',
            category: data.category || 'general',
            title: data.title || 'Untitled Resource',
            url: data.url || '',
            description: data.description || '',
            updatedAt: data.updatedAt || data.createdAt || serverTimestamp(),
            viewCount: data.viewCount || 0,
          });
        } else {
          invalidResourceIds.push(doc.id);
          console.warn('Invalid resource document:', doc.id);
        }
      }
      
      if (invalidResourceIds.length > 0) {
        console.log('Filtered out invalid resources:', invalidResourceIds);
      }
      
      setResources(validResources);
      filterResources(validResources, selectedCategory, selectedType, searchQuery);
    } catch (err) {
      console.error('Error fetching resources:', err);
      Alert.alert('Error', 'Failed to load resources. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedType, searchQuery]);

  // Filter resources based on selections
  const filterResources = (source, category, type, queryText) => {
    let filtered = [...source];
    
    if (category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type);
    }
    
    if (queryText) {
      const lowerQuery = queryText.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        (item.description && item.description.toLowerCase().includes(lowerQuery)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    }
    
    setFilteredResources(filtered);
  };

  // Handle search input
  const handleSearch = (text) => {
    setSearchQuery(text);
    filterResources(resources, selectedCategory, selectedType, text);
  };

  // Handle category selection
  const handleCategorySelect = (value) => {
    setSelectedCategory(value);
    setShowCategoryDropdown(false);
    filterResources(resources, value, selectedType, searchQuery);
  };

  // Handle type selection
  const handleTypeSelect = (value) => {
    setSelectedType(value);
    setShowTypeDropdown(false);
    filterResources(resources, selectedCategory, value, searchQuery);
  };

  // Get icon for resource type
  const getTypeIcon = (type) => {
    const typeConfig = types.find(t => t.value === type);
    if (type === 'pdf') {
      return <MaterialIcons name={typeConfig.icon} size={18} color="#6B778C" />;
    }
    return <Feather name={typeConfig?.icon || 'file'} size={18} color="#6B778C" />;
  };

  // Handle viewing resource URL
  const handleViewResource = async (resource) => {
    if (!resource.url) {
      Alert.alert('Error', 'No resource URL available');
      return;
    }

    try {
      const resourceRef = doc(db, 'knowledgeResources', resource.id);
      
      // First check if resource exists
      const resourceDoc = await getDoc(resourceRef);
      if (!resourceDoc.exists()) {
        Alert.alert('Error', 'This resource no longer exists');
        // Remove from local state if document doesn't exist
        setResources(prev => prev.filter(r => r.id !== resource.id));
        setFilteredResources(prev => prev.filter(r => r.id !== resource.id));
        return;
      }

      // Update view count
      await updateDoc(resourceRef, {
        viewCount: increment(1),
        lastViewedAt: serverTimestamp(),
        lastViewedBy: auth.currentUser?.uid
      });

      // Update local state immediately
      setResources(prev => prev.map(r => {
        if (r.id === resource.id) {
          return {
            ...r,
            viewCount: (r.viewCount || 0) + 1
          };
        }
        return r;
      }));
      
      setFilteredResources(prev => prev.map(r => {
        if (r.id === resource.id) {
          return {
            ...r,
            viewCount: (r.viewCount || 0) + 1
          };
        }
        return r;
      }));

    } catch (error) {
      console.error('Error viewing resource:', error);
      Alert.alert('Error', 'Failed to update view count');
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = (url) => {
    Clipboard.setString(url);
    Alert.alert('Copied', 'URL copied to clipboard');
  };

  // Format relative time
  const formatTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return 'Recently';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Render resource item
  const renderItem = ({ item }) => (
    <View style={styles.resourceCard}>
      <TouchableOpacity 
        style={styles.resourceHeader}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.8}
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.resourceImage}
          resizeMode="cover"
        />
        <View style={styles.resourceTitleContainer}>
          <Text style={styles.resourceName}>{item.title}</Text>
          <View style={styles.resourceMeta}>
            <Text style={styles.resourceType}>{item.type.toUpperCase()}</Text>
            <Text style={styles.resourceCategory}>{item.category}</Text>
          </View>
        </View>
        <Feather 
          name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color="#6B778C" 
        />
      </TouchableOpacity>
      
      {expandedId === item.id && (
        <View style={styles.detailsContainer}>
          {item.description && (
            <View style={styles.detailRow}>
              <Feather name="file-text" size={18} color="#6B778C" style={styles.detailIcon} />
              <Text style={styles.detailText} numberOfLines={3}>
                {item.description}
              </Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Feather name="clock" size={18} color="#6B778C" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              Updated {formatTimeAgo(item.updatedAt)}
            </Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Feather name="eye" size={16} color="#6B778C" />
              <Text style={styles.statText}>{item.viewCount} views</Text>
            </View>
          </View>
          
          {item.url && (
            <TouchableOpacity 
              style={styles.urlContainer}
              onPress={() => copyToClipboard(item.url)}
              activeOpacity={0.7}
            >
              <Feather name="link" size={18} color="#6B778C" style={styles.detailIcon} />
              <Text style={styles.urlText} numberOfLines={1}>
                {item.url}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // Render dropdown item
  const renderDropdownItem = (item) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => {
        if (item.value === selectedCategory || item.value === selectedType) return;
        if (categories.some(c => c.value === item.value)) {
          handleCategorySelect(item.value);
        } else {
          handleTypeSelect(item.value);
        }
      }}
      key={item.value}
    >
      {item.value === 'pdf' ? (
        <MaterialIcons name={item.icon} size={16} color="#6B778C" style={styles.dropdownIcon} />
      ) : (
        <Feather name={item.icon} size={16} color="#6B778C" style={styles.dropdownIcon} />
      )}
      <Text style={styles.dropdownItemText}>{item.label}</Text>
    </TouchableOpacity>
  );

  // Load data when screen focuses
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (auth.currentUser) {
        fetchResources();
      }
    });
    return unsubscribe;
  }, [navigation, fetchResources]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResources();
  }, [fetchResources]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.mainContainer, styles.center]}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Header with gradient */}
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

      {/* Search Bar */}
      <Animated.View style={[styles.searchContainer, { height: searchBarHeight }]}>
        <View style={styles.searchInnerContainer}>
          <Feather name="search" size={20} color="#6B778C" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources..."
            placeholderTextColor="#6B778C"
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

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Category</Text>
          <TouchableOpacity 
            style={styles.filterBox}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <Feather 
              name={categories.find(c => c.value === selectedCategory)?.icon || 'grid'} 
              size={16} 
              color="#007bff" 
            />
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
            {selectedType === 'pdf' ? (
              <MaterialIcons 
                name={types.find(t => t.value === selectedType)?.icon || 'picture-as-pdf'} 
                size={16} 
                color="#007bff" 
              />
            ) : (
              <Feather 
                name={types.find(t => t.value === selectedType)?.icon || 'file'} 
                size={16} 
                color="#007bff" 
              />
            )}
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
            {categories.map(renderDropdownItem)}
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
            {types.map(renderDropdownItem)}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Resources List */}
      <FlatList
        data={filteredResources}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#007bff']}
            tintColor="#007bff"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="book-open" size={48} color="#6B778C" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== 'all' || selectedType !== 'all' 
                ? 'No matching resources found' 
                : 'No resources available'}
            </Text>
            {(searchQuery || selectedCategory !== 'all' || selectedType !== 'all') && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedCategory('all');
                  setSelectedType('all');
                  setSearchQuery('');
                  filterResources(resources, 'all', 'all', '');
                }}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
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
    marginTop: 10,
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
    paddingVertical: 0,
    height: 40,
    paddingLeft: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
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
    marginLeft: 8,
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownItemText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#172B4D',
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  resourceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resourceImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  resourceTitleContainer: {
    flex: 1,
  },
  resourceName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
    marginBottom: 4,
  },
  resourceMeta: {
    flexDirection: 'row',
  },
  resourceType: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#007bff',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  resourceCategory: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#6B778C',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
    width: 24,
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#6B778C',
    marginLeft: 6,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  urlText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#007bff',
    flex: 1,
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
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007bff',
    borderRadius: 20,
  },
  resetButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
});
