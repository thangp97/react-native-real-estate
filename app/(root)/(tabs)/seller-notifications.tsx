import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import icons from '@/constants/icons';
import { useGlobalContext } from '@/lib/global-provider';
import { useAppwrite } from '@/lib/useAppwrite';
import { getUserNotifications } from '@/lib/api/buyer';
import { Models } from 'react-native-appwrite';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// **FIX: Định nghĩa kiểu cho document thông báo**
interface NotificationDocument extends Models.Document {
    message: string;
    type: string;
    relatedPropertyId?: string;
}

const NotificationItem = ({ item }: { item: NotificationDocument }) => {
    let icon;
    switch (item.type) {
        case 'status_update':
            icon = icons.checkmark;
            break;
        case 'new_request':
            icon = icons.chat;
            break;
        default:
            icon = icons.info;
    }

    // Định dạng thời gian
    const timeAgo = formatDistanceToNow(new Date(item.$createdAt), { addSuffix: true, locale: vi });

    return (
        // **FIX: Bọc trong Link để có thể điều hướng**
        <Link href={item.relatedPropertyId ? `/property-details?id=${item.relatedPropertyId}` : '#'} asChild>
            <TouchableOpacity style={styles.itemContainer}>
                <View style={styles.iconContainer}>
                    {icon && <Image source={icon} style={styles.icon} resizeMode="contain" />}
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.time}>{timeAgo}</Text>
                </View>
            </TouchableOpacity>
        </Link>
    );
};

const SellerNotifications = () => {
    const { user } = useGlobalContext();
    
    // **FIX: Sử dụng useAppwrite để lấy dữ liệu thật**
    const { data: notifications, loading, refetch } = useAppwrite({
        fn: getUserNotifications,
        params: { userId: user?.$id },
        skip: !user?.$id
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Thông báo</Text>
            </View>

            {/* **FIX: Xử lý trạng thái loading** */}
            {loading && !notifications?.length ? (
                <ActivityIndicator size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={notifications as NotificationDocument[] | null}
                    keyExtractor={(item) => item.$id}
                    renderItem={({ item }) => <NotificationItem item={item} />}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text>Chưa có thông báo nào.</Text>
                        </View>
                    )}
                    onRefresh={() => refetch({ userId: user?.$id })}
                    refreshing={loading}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
        backgroundColor: 'white'
    },
    iconContainer: {
        marginRight: 16,
        width: 24, // Đảm bảo icon có không gian
    },
    icon: {
        width: 24,
        height: 24,
    },
    textContainer: {
        flex: 1,
    },
    message: {
        fontSize: 16,
        lineHeight: 22,
    },
    time: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
});

export default SellerNotifications;
