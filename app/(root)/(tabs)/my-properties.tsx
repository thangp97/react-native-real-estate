import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { useAppwrite } from '@/lib/useAppwrite';
import { getUserProperties } from '@/lib/appwrite';
import { Models } from 'react-native-appwrite';

type PropertyStatus = 'pending_approval' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired';

interface PropertyDocument extends Models.Document {
    name: string;
    price: number;
    image: string;
    status: PropertyStatus;
}

const formatStatus = (status: PropertyStatus) => {
    const statuses: Record<PropertyStatus, string> = {
        'pending_approval': 'Chờ duyệt',
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
    
    const { data: properties, refetch, loading } = useAppwrite({
        fn: getUserProperties,
        params: { userId: user?.$id },
        skip: !user?.$id
    });

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        if (user?.$id) {
            await refetch({ userId: user.$id });
        }
        setRefreshing(false);
    };

    useEffect(() => {
        if (user?.$id) {
            refetch({ userId: user.$id });
        }
    }, [user?.$id]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <FlatList
                data={properties as PropertyDocument[] | null}
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
                        <Link href="/create-property" asChild>
                            <TouchableOpacity style={styles.createButton}>
                                <Text style={styles.createButtonText}>+ Đăng tin mới</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" />
                        ) : (
                            <>
                                <Text style={styles.emptyText}>Bạn chưa đăng tin nào.</Text>
                                <Text style={styles.emptyText}>Hãy bắt đầu bằng cách nhấn nút "Đăng tin mới".</Text>
                            </>
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
        paddingVertical: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee',
        backgroundColor: '#fff'
    },
    headerTitle: { 
        fontSize: 28, 
        fontWeight: 'bold' 
    },
    createButton: { 
        backgroundColor: '#007BFF', 
        padding: 12, 
        borderRadius: 8, 
        alignItems: 'center', 
        marginTop: 15 
    },
    createButtonText: { 
        color: '#fff', 
        fontSize: 16, 
        fontWeight: 'bold' 
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
