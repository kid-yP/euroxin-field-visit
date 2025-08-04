import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  FlatList,
  Animated,
  Easing,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const { width } = Dimensions.get('window');

export default function StockScreen({ navigation }) {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchBarHeight] = useState(new Animated.Value(0));
  const [expandedId, setExpandedId] = useState(null);

  // Fetch stocks from Firestore
  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true);
      const stocksCollection = collection(db, 'stocklist');
      const q = query(stocksCollection, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const stocksData = [];
      querySnapshot.forEach((doc) => {
        stocksData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setStocks(stocksData);
      setFilteredStocks(stocksData);
    } catch (error) {
      console.error("Error fetching stocks:", error);
      Alert.alert("Error", "Could not load stocks. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
    Animated.timing(searchBarHeight, {
      toValue: showSearchBar ? 0 : 40,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = stocks.filter(stock =>
        stock.name.toLowerCase().includes(text.toLowerCase()) ||
        (stock.distributor && stock.distributor.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredStocks(filtered);
    } else {
      setFilteredStocks(stocks);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStocks();
  }, [fetchStocks]);

  const renderStockItem = ({ item }) => (
    <View style={styles.stockCard}>
      <TouchableOpacity 
        style={styles.stockHeader}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.image || 'https://placehold.co/60x60?text=Stock' }}
          style={styles.stockImage}
        />
        <View style={styles.stockTitleContainer}>
          <Text style={styles.stockName}>{item.name}</Text>
        </View>
        <Feather 
          name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color="#6B778C" 
        />
      </TouchableOpacity>
      
      {expandedId === item.id && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Feather name="truck" size={18} color="#6B778C" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Distributor: </Text>
              {item.distributor || 'Not specified'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={18} color="#6B778C" style={styles.detailIcon} />
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Location: </Text>
              {item.location || 'Not specified'}
            </Text>
          </View>
          
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityText}>Current Quantity: {item.quantity || 0}</Text>
          </View>
        </View>
      )}
    </View>
  );

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
          <Text style={styles.headerTitle}>Stocks</Text>
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
            placeholder="Search stocks"
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

      {/* Stocks List */}
      <FlatList
        data={filteredStocks}
        renderItem={renderStockItem}
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
            <Feather name="trending-up" size={48} color="#6B778C" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching stocks found' : 'No stocks available'}
            </Text>
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
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  stockCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  stockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  stockTitleContainer: {
    flex: 1,
  },
  stockName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#172B4D',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 10,
    width: 24,
  },
  detailLabel: {
    fontFamily: 'Poppins-SemiBold',
    color: '#172B4D',
  },
  detailText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
    flex: 1,
  },
  quantityContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  quantityText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#172B4D',
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
});
