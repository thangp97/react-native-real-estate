import icons from '@/constants/icons';
import { getUserProperties } from '@/lib/api/seller';
import { useGlobalContext } from '@/lib/global-provider';
import { useAppwrite } from '@/lib/useAppwrite';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Models } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

type PropertyStatus = 'pending_approval' | 'reviewing' | 'approved' | 'deposit_paid' | 'sold' | 'rejected' | 'expired' | 'available';

interface PropertyDocument extends Models.Document {
    name: string;
    price: number;
    image: string;
    status: PropertyStatus;
    address?: string;
}

const formatPrice = (price: number): string => {
    if (price >= 1000000000) {
        const ty = price / 1000000000;
        if (ty % 1 === 0) {
            return `${ty} tỷ`;
        }
        return `${ty.toFixed(1)} tỷ`;
    } else if (price >= 1000000) {
        const trieu = price / 1000000;
        if (trieu % 1 === 0) {
            return `${trieu} triệu`;
        }
        return `${trieu.toFixed(1)} triệu`;
    } else if (price >= 1000) {
        const nghin = price / 1000;
        if (nghin % 1 === 0) {
            return `${nghin} nghìn`;
        }
        return `${nghin.toFixed(1)} nghìn`;
    }
    return `${price.toLocaleString('vi-VN')} VND`;
};

const PropertyCard = ({ item }: { item: PropertyDocument }) => {
    return (
        <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                {item.address && (
                    <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                )}
            </View>
        </View>
    );
};

const SearchProperties = () => {
    const { user } = useGlobalContext();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: properties, loading } = useAppwrite({
        fn: getUserProperties,
        params: { userId: user?.$id || '' },
        skip: !user?.$id
    });

    const filteredProperties = useMemo(() => {
        if (!searchQuery.trim()) {
            return properties || [];
        }

        const query = searchQuery.toLowerCase().trim();
        return (properties || []).filter((p: PropertyDocument) => {
            const name = p.name?.toLowerCase() || '';
            const address = p.address?.toLowerCase() || '';
            const price = p.price?.toString() || '';
            const priceFormatted = p.price?.toLocaleString('vi-VN') || '';
            
            return name.includes(query) || 
                   address.includes(query) || 
                   price.includes(query) ||
                   priceFormatted.includes(query);
        });
    }, [properties, searchQuery]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tìm kiếm bất động sản</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Image source={icons.search} style={styles.searchIcon} tintColor="#666" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm theo tên, địa chỉ, giá..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                    autoFocus
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity 
                        onPress={() => setSearchQuery('')}
                        style={styles.clearButton}
                    >
                        <Text style={styles.clearButtonText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Results */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                </View>
            ) : filteredProperties.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>
                        {searchQuery.trim() 
                            ? 'Không tìm thấy kết quả nào' 
                            : 'Nhập từ khóa để tìm kiếm'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredProperties as PropertyDocument[]}
                    keyExtractor={(item) => item.$id}
                    renderItem={({ item }) => (
                        <Link href={{ pathname: "/property-details", params: { id: item.$id } }} asChild>
                            <TouchableOpacity>
                                <PropertyCard item={item} />
                            </TouchableOpacity>
                        </Link>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        margin: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        paddingVertical: 12,
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    clearButtonText: {
        fontSize: 18,
        color: '#999',
        fontWeight: 'bold',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
    },
    card: {
        backgroundColor: 'white',
        marginBottom: 12,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    cardImage: {
        width: 100,
        height: 100,
    },
    cardContent: {
        flex: 1,
        padding: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    cardPrice: {
        fontSize: 14,
        color: '#007BFF',
        marginBottom: 4,
        fontWeight: '600',
    },
    cardAddress: {
        fontSize: 12,
        color: '#666',
    },
});

export default SearchProperties;

