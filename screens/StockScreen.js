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

const { width } = Dimensions.get('window');

export default function StockScreen({ navigation }) {
  // Sample stock data built directly into the component
  const sampleStocks = [
    {
      id: '1',
      name: "Apple Inc.",
      symbol: "AAPL",
      imageUrl: "https://logo.clearbit.com/apple.com",
      currentPrice: 189.37,
      dailyChange: 2.45,
      marketCap: 2910000000000,
      sector: "Technology"
    },
    {
      id: '2',
      name: "Microsoft Corporation",
      symbol: "MSFT",
      imageUrl: "https://logo.clearbit.com/microsoft.com",
      currentPrice: 420.72,
      dailyChange: -1.32,
      marketCap: 3127000000000,
      sector: "Technology"
    },
    {
      id: '3',
      name: "Tesla Inc.",
      symbol: "TSLA",
      imageUrl: "https://logo.clearbit.com/tesla.com",
      currentPrice: 248.48,
      dailyChange: 5.67,
      marketCap: 789000000000,
      sector: "Automotive"
    },
    {
      id: '4',
      name: "Amazon.com Inc.",
      symbol: "AMZN",
      imageUrl: "https://logo.clearbit.com/amazon.com",
      currentPrice: 178.75,
      dailyChange: 0.89,
      marketCap: 1856000000000,
      sector: "Retail"
    },
    {
      id: '5',
      name: "Alphabet Inc.",
      symbol: "GOOGL",
      imageUrl: "https://logo.clearbit.com/google.com",
      currentPrice: 142.56,
      dailyChange: -0.45,
      marketCap: 1793000000000,
      sector: "Technology"
    },
    {
      id: '6',
      name: "NVIDIA Corporation",
      symbol: "NVDA",
      imageUrl: "https://logo.clearbit.com/nvidia.com",
      currentPrice: 950.02,
      dailyChange: 3.21,
      marketCap: 2375000000000,
      sector: "Technology"
    }
  ];

  const [stocks, setStocks] = useState(sampleStocks);
  const [filteredStocks, setFilteredStocks] = useState(sampleStocks);
  const [loading, setLoading] = useState(false); // Set to false since we have local data
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchBarHeight] = useState(new Animated.Value(0));

  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
    Animated.timing(searchBarHeight, {
      toValue: showSearchBar ? 0 : 40,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = stocks.filter(stock =>
        stock.name.toLowerCase().includes(text.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStocks(filtered);
    } else {
      setFilteredStocks(stocks);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh with local data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderStockItem = ({ item }) => (
    <View style={styles.stockCard}>
      <View style={styles.stockHeader}>
        <Image
          source={{ uri: item.imageUrl || 'https://placehold.co/60x60?text=Stock' }}
          style={styles.stockImage}
        />
        <View style={styles.stockTitleContainer}>
          <Text style={styles.stockName}>{item.name}</Text>
          <Text style={styles.stockSymbol}>{item.symbol}</Text>
        </View>
      </View>
      
      {/* Stock Info Boxes */}
      <View style={styles.infoBoxesContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxLabel}>Current Price</Text>
          <Text style={styles.infoBoxValue}>${item.currentPrice?.toFixed(2) || 'N/A'}</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxLabel}>24h Change</Text>
          <Text style={[
            styles.infoBoxValue,
            item.dailyChange >= 0 ? styles.positiveChange : styles.negativeChange
          ]}>
            {item.dailyChange >= 0 ? '+' : ''}{item.dailyChange?.toFixed(2) || '0'}%
          </Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxLabel}>Market Cap</Text>
          <Text style={styles.infoBoxValue}>${formatNumber(item.marketCap)}</Text>
        </View>
      </View>
      
      {/* View Details Button */}
      <TouchableOpacity 
        style={styles.viewDetailsButton}
        onPress={() => navigation.navigate('StockDetails', { stockId: item.id })}
      >
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Feather name="arrow-right" size={18} color="#007bff" />
      </TouchableOpacity>
    </View>
  );

  const formatNumber = (num) => {
    if (!num) return 'N/A';
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

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
            placeholder="Search stocks..."
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
            <Text style={styles.emptyText}>No matching stocks found</Text>
          </View>
        }
      />
    </View>
  );
}

// ... (keep all your existing styles from previous implementation)
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
    marginBottom: 16,
  },
  stockImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  stockSymbol: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#6B778C',
  },
  infoBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    width: '30%',
    alignItems: 'center',
  },
  infoBoxLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#6B778C',
    marginBottom: 4,
  },
  infoBoxValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#172B4D',
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewDetailsText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#007bff',
    marginRight: 8,
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
