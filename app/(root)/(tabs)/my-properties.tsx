// File: app/(root)/(tabs)/my-properties.tsx
import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import {useAppwrite} from '@/lib/useAppwrite';
import { getUserProperties } from '@/lib/appwrite';

const PropertyCard = ({ item }) => (
    <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text>Giá: {item.price.toLocaleString('vi-VN')} VND</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
        </View>
    </View>
);

// Hàm helper để định dạng trạng thái
const formatStatus = (status) => {
    const statuses = {
        'pending_approval': 'Chờ duyệt',
        'for_sale': 'Đang bán',
        'deposit_paid': 'Đã cọc',
        'sold': 'Đã bán',
        'rejected': 'Bị từ chối'
    };
    return statuses[status] || status;
};
const getStatusColor = (status) => {
    const colors = {
        'pending_approval': '#f0ad4e',
        'for_sale': '#5cb85c',
        'deposit_paid': '#337ab7',
        'sold': '#d9534f',
        'rejected': '#777'
    };
    return colors[status] || '#777';
};


const MyProperties = () => {
    const { user } = useGlobalContext();
    const { data: properties, refetch } = useAppwrite(() => getUserProperties(user?.$id));
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    return (
        <FlatList
            data={properties}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => <PropertyCard item={item} />}
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
                    <Text style={styles.emptyText}>Bạn chưa đăng tin nào.</Text>
                    <Text style={styles.emptyText}>Hãy bắt đầu bằng cách nhấn nút "Đăng tin mới".</Text>
                </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            style={styles.container}
        />
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 28, fontWeight: 'bold' },
    createButton: { backgroundColor: '#007BFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
    createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, color: '#6c757d' },
    card: { backgroundColor: 'white', padding: 15, marginVertical: 8, marginHorizontal: 16, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, alignSelf: 'flex-start', marginTop: 10 },
    statusText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});

export default MyProperties;
    