import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Feather } from '@expo/vector-icons';

export default function StockScreen() {
  const [stocks, setStocks] = useState([]);
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stocklist'));
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStocks(list);
      setFilteredStocks(list);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStocks();
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    const filtered = stocks.filter((item) =>
      `${item.name} ${item.location} ${item.distributor || ''}`
        .toLowerCase()
        .includes(text.toLowerCase())
    );
    setFilteredStocks(filtered);
    setExpandedItemId(null); // Close dropdown when search changes
  };

  const toggleDropdown = (id) => {
    setExpandedItemId((prevId) => (prevId === id ? null : id));
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => toggleDropdown(item.id)}
        activeOpacity={0.7}
        style={styles.row}
      >
        <Feather name="box" size={24} color="#007bff" style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.location}>{item.location}</Text>
        </View>
        <Feather
          name={expandedItemId === item.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#333"
        />
      </TouchableOpacity>

      {expandedItemId === item.id && (
        <View style={styles.dropdown}>
          <Text style={styles.quantityText}>Products Left: {item.quantity}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Stock</Text>

      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for distributor"
          value={search}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : filteredStocks.length === 0 ? (
        <Text style={styles.emptyText}>No stock found.</Text>
      ) : (
        <FlatList
          data={filteredStocks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  dropdown: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  quantityText: {
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: 'gray',
    fontSize: 16,
  },
});
