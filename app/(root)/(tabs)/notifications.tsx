import { useGlobalContext } from '@/lib/global-provider';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from '@/lib/api/notifications';
import { useAppwrite } from '@/lib/useAppwrite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NotificationsScreen = () => {
    const { user } = useGlobalContext();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);

    const {
        data: notifications,
        loading,
        refetch
    } = useAppwrite({
        fn: getUserNotifications,
        params: user?.$id || '',
        skip: !user?.$id || !user?.$id.trim()
    });

    useEffect(() => {
        if (user?.$id) {
            loadUnreadCount();
        }
    }, [user?.$id, notifications]);

    const loadUnreadCount = async () => {
        if (!user?.$id) return;
        try {
            const count = await getUnreadNotificationCount(user.$id);
            setUnreadCount(count);
        } catch (error) {
            console.error("Lỗi đếm thông báo chưa đọc:", error);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId);
            await refetch({});
            await loadUnreadCount();
        } catch (error) {
            console.error("Lỗi đánh dấu đã đọc:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.$id) return;
        try {
            await markAllNotificationsAsRead(user.$id);
            await refetch({});
            await loadUnreadCount();
            Alert.alert("Thành công", "Đã đánh dấu tất cả thông báo là đã đọc");
        } catch (error) {
            Alert.alert("Lỗi", "Không thể đánh dấu tất cả đã đọc");
        }
    };

    const handleNotificationPress = async (notification: any) => {
        // Đánh dấu đã đọc
        if (!notification.isRead) {
            await handleMarkAsRead(notification.$id);
        }

        // Logic điều hướng theo role và loại thông báo
        if (user?.role === 'broker') {
            // Môi giới: điều hướng theo loại thông báo
            const bookingTypes = ['booking_created', 'booking_confirmed', 'booking_rejected'];
            const propertyTypes = ['property_available', 'broker_assigned', 'property_status_updated'];
            
            if (bookingTypes.includes(notification.type)) {
                // Thông báo về lịch hẹn → điều hướng đến trang lịch hẹn
                router.push('/bookings');
            } else if (propertyTypes.includes(notification.type)) {
                // Thông báo về bài đăng → điều hướng đến trang "Tin của tôi"
                router.push('/my-listings');
            } else if (notification.relatedPropertyId) {
                // Các thông báo khác có relatedPropertyId → điều hướng đến property-details
                router.push({
                    pathname: "/property-details",
                    params: { id: notification.relatedPropertyId }
                });
            }
        } else {
            // Người bán và người mua: điều hướng đến property-details nếu có relatedPropertyId
            if (notification.relatedPropertyId) {
                router.push({
                    pathname: "/property-details",
                    params: { id: notification.relatedPropertyId }
                });
            }
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'booking_created':
                return 'calendar-outline';
            case 'booking_confirmed':
                return 'checkmark-circle-outline';
            case 'booking_rejected':
                return 'close-circle-outline';
            case 'property_status_updated':
                return 'information-circle-outline';
            case 'credits_topup':
                return 'wallet-outline';
            case 'broker_assigned':
                return 'person-add-outline';
            case 'property_available':
                return 'home-outline';
            default:
                return 'notifications-outline';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'booking_created':
                return '#007BFF';
            case 'booking_confirmed':
                return '#28A745';
            case 'booking_rejected':
                return '#DC3545';
            case 'property_status_updated':
                return '#FFC107';
            case 'credits_topup':
                return '#17A2B8';
            case 'broker_assigned':
                return '#6F42C1';
            case 'property_available':
                return '#20C997';
            default:
                return '#6C757D';
        }
    };

    if (loading && !notifications) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007BFF" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Thông báo</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity
                        onPress={handleMarkAllAsRead}
                        style={styles.markAllButton}
                    >
                        <Text style={styles.markAllButtonText}>
                            Đánh dấu tất cả đã đọc
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifications || []}
                keyExtractor={(item) => item.$id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={() => {
                            refetch({});
                            loadUnreadCount();
                        }}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={80} color="#ccc" />
                        <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const isUnread = !item.isRead;
                    const iconColor = getNotificationColor(item.type);

                    return (
                        <TouchableOpacity
                            onPress={() => handleNotificationPress(item)}
                            style={[
                                styles.notificationItem,
                                isUnread && styles.notificationItemUnread
                            ]}
                        >
                            <View style={styles.notificationContent}>
                                <View
                                    style={[
                                        styles.iconContainer,
                                        { backgroundColor: `${iconColor}20` }
                                    ]}
                                >
                                    <Ionicons
                                        name={getNotificationIcon(item.type) as any}
                                        size={24}
                                        color={iconColor}
                                    />
                                </View>
                                <View style={styles.textContainer}>
                                    <View style={styles.dateRow}>
                                        <Text style={styles.dateText}>
                                            {formatDate(item.$createdAt)}
                                        </Text>
                                        {isUnread && (
                                            <View style={styles.unreadDot} />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.messageText,
                                        isUnread && styles.messageTextBold
                                    ]}>
                                        {item.message}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    markAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: '#DBEAFE',
        borderRadius: 20,
    },
    markAllButtonText: {
        fontSize: 12,
        color: '#2563EB',
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
        paddingBottom: 50,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyText: {
        color: '#6B7280',
        fontSize: 18,
        marginTop: 16,
    },
    notificationItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    notificationItemUnread: {
        borderColor: '#BFDBFE',
        backgroundColor: '#EFF6FF',
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
    },
    unreadDot: {
        width: 8,
        height: 8,
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    messageText: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
    },
    messageTextBold: {
        fontWeight: 'bold',
    },
});

export default NotificationsScreen;

