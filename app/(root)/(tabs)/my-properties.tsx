import { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { useAppwrite } from '@/lib/useAppwrite';
import { getUserProperties } from '@/lib/api/seller';
import { Models } from 'react-native-appwrite';

type PropertyStatus = 'pending_approval' | 'approved' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired';

interface PropertyDocument extends Models.Document {
    name: string;
    price: number;
    image: string;
    status: PropertyStatus;
}

const formatStatus = (status: PropertyStatus) => {
    const statuses: Record<PropertyStatus, string> = {
        'pending_approval': 'Chờ duyệt',
        'approved': 'Đã duyệt',
        'for_sale': 'Đang bán',
        'deposit_paid': 'Đã cọc',
        'sold': 'Đã bán',
        'rejected': 'Bị từ chối',
        'expired': 'Hết hạn'
    };
    return statuses[status] || status;
};

const getStatusColor = (status: PropertyStatus) => {
    const colors: Record<PropertyStatus, string> = {
        'pending_approval': '#f0ad4e',
        'for_sale': '#5cb85c',
        'deposit_paid': '#337ab7',
        'sold': '#d9534f',
        'rejected': '#777',
        'expired': '#777'
    };
    return colors[status] || '#777';
};

const FILTER_OPTIONS: { label: string; value: PropertyStatus | 'all' }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Chờ duyệt', value: 'pending_approval' },
    { label: 'Đang bán', value: 'for_sale' },
    { label: 'Đã bán', value: 'sold' },
    { label: 'Bị từ chối', value: 'rejected' },
];

const PropertyCard = ({ item }: { item: PropertyDocument }) => (
    <View style={styles.card}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.cardPrice}>{item.price.toLocaleString('vi-VN')} VND</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
            </View>
        </View>
    </View>
);

const MyProperties = () => {
    const { user } = useGlobalContext();
    const [activeFilter, setActiveFilter] = useState<PropertyStatus | 'all'>('all');

    const { data: properties, refetch, loading } = useAppwrite({
        fn: getUserProperties,
        params: { userId: user?.$id },
        skip: !user?.$id
    });

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        // **FIX: Gọi refetch với tham số đúng**
        if (user?.$id) {
            await refetch({ userId: user.$id });
        }
        setRefreshing(false);
    };

    const handleCreatePress = () => {
        // Logic này đã được sửa ở lần trước, giữ nguyên
            router.push('/create-property');
    };

    const filteredProperties = useMemo(() => {
        if (activeFilter === 'all') {
            return properties;
        }
        return properties?.filter(p => p.status === activeFilter);
    }, [properties, activeFilter]);

    // **FIX: Thêm lại useEffect để tải dữ liệu khi vào trang**
    useEffect(() => {
        if (user?.$id) {
            refetch({ userId: user.$id });
        }
    }, [user?.$id]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <FlatList
                data={filteredProperties as PropertyDocument[] | null}
                keyExtractor={(item) => item.$id}
                renderItem={({ item }) => (
                    <Link href={{ pathname: "/property-details", params: { id: item.$id } }} asChild>
                        <TouchableOpacity>
                            <PropertyCard item={item} />
                        </TouchableOpacity>
                    </Link>
                )}
                ListHeaderComponent={() => (
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Bất động sản của tôi</Text>
                        <TouchableOpacity style={styles.createButton} onPress={handleCreatePress}>
                            <Text style={styles.createButtonText}>+ Đăng tin mới</Text>
                        </TouchableOpacity>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                            {FILTER_OPTIONS.map(option => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[styles.filterButton, activeFilter === option.value && styles.filterButtonActive]}
                                    onPress={() => setActiveFilter(option.value)}
                                >
                                    <Text style={[styles.filterText, activeFilter === option.value && styles.filterTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" />
                        ) : (
                            <Text style={styles.emptyText}>Không có bất động sản nào phù hợp.</Text>
                        )}
                    </View>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: '#fff'
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 20,
    },
    createButton: {
        backgroundColor: '#007BFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    filterContainer: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        marginRight: 10,
    },
    filterButtonActive: {
        backgroundColor: '#007BFF',
    },
    filterText: {
        color: '#333',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 150
    },
    emptyText: {
        fontSize: 16,
        color: '#6c757d'
    },
    card: {
        backgroundColor: 'white',
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        overflow: 'hidden'
    },
    cardImage: {
        width: 100,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    cardPrice: {
        fontSize: 14,
        color: '#007BFF',
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 15,
        alignSelf: 'flex-start',
    },
    statusText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12
    }
});

export default MyProperties;
