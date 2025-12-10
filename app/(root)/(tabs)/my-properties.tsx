import { getSellerData, getUserProperties, renewProperty, topUpCredit } from '@/lib/api/seller';
import { useGlobalContext } from '@/lib/global-provider';
import { useAppwrite } from '@/lib/useAppwrite';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Models } from 'react-native-appwrite';
import { SafeAreaView } from 'react-native-safe-area-context';

type PropertyStatus = 'pending_approval' | 'approved' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired';

interface PropertyDocument extends Models.Document {
    name: string;
    price: number;
    image: string;
    status: PropertyStatus;
    expiresAt: string;
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
        'approved': '#5cb85c',
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
    { label: 'Đã duyệt', value: 'approved' },
    { label: 'Đang bán', value: 'for_sale' },
    { label: 'Đã cọc', value: 'deposit_paid' },
    { label: 'Đã bán', value: 'sold' },
    { label: 'Bị từ chối', value: 'rejected' },
    { label: 'Hết hạn', value: 'expired' },
];

const PropertyCard = ({ item, credits, onRenew, isSeller }: { item: PropertyDocument, credits: number, onRenew: (propertyId: string, currentExpiry: Date) => void, isSeller: boolean }) => {
    const expiryDate = new Date(item.expiresAt);
    const today = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = daysLeft <= 3 && daysLeft >= 0;
    const isExpired = daysLeft < 0;

    return (
        <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.cardPrice}>{item.price.toLocaleString('vi-VN')} VND</Text>
                
                <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
                    </View>
                </View>
                
                {/* Hiển thị ngày hết hạn cho seller */}
                {isSeller && (
                    <View style={styles.expiryContainer}>
                        <View style={styles.expiryInfo}>
                            <Text style={[
                                styles.expiryText,
                                isExpired && styles.expiryTextExpired,
                                isExpiringSoon && styles.expiryTextWarning
                            ]}>
                                {isExpired 
                                    ? `Đã hết hạn ${Math.abs(daysLeft)} ngày trước`
                                    : `Còn ${daysLeft} ngày`
                                }
                            </Text>
                            <Text style={styles.expiryDate}>
                                Hết hạn: {expiryDate.toLocaleDateString('vi-VN')}
                            </Text>
                        </View>
                        
                        {/* Nút gia hạn luôn hiển thị cho seller */}
                        <TouchableOpacity
                            style={[
                                styles.renewButtonInCard, 
                                credits < 1 && styles.renewButtonInCardDisabled
                            ]}
                            disabled={credits < 1}
                            onPress={() => onRenew(item.$id, new Date(item.expiresAt))}
                        >
                            <Text style={styles.renewButtonInCardText}>⏱ Gia hạn</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const MyProperties = () => {
    const { user } = useGlobalContext();
    const [activeFilter, setActiveFilter] = useState<PropertyStatus | 'all'>('all');
    const [credits, setCredits] = useState(0);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewDays, setRenewDays] = useState('');
    const [selectedProperty, setSelectedProperty] = useState<{ id: string, expiry: Date } | null>(null);

    // Chỉ cho phép người bán (seller) truy cập trang này
    const isSeller = user?.role === 'seller';

    const { data: properties, refetch, loading } = useAppwrite({
        fn: getUserProperties,
        params: { userId: user?.$id || '' },
        skip: !user?.$id
    });

    const [refreshing, setRefreshing] = useState(false);

    const fetchCredits = async () => {
        if (user?.$id && isSeller) {
            const sellerData: any = await getSellerData({ userId: user.$id });
            if (sellerData) {
                setCredits(sellerData.credits || 0);
            }
        }
    };

    useEffect(() => {
        if (user?.$id && isSeller) {
            fetchCredits();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.$id, isSeller]);

    const onRefresh = async () => {
        setRefreshing(true);
        if (user?.$id) {
            await refetch({ userId: user.$id });
            await fetchCredits();
        }
        setRefreshing(false);
    };

    const handleRenew = (propertyId: string, currentExpiry: Date) => {
        setSelectedProperty({ id: propertyId, expiry: currentExpiry });
        setShowRenewModal(true);
        setRenewDays('');
    };

    const handleConfirmRenew = async () => {
        if (!selectedProperty || !user?.$id) return;
        
        const days = parseInt(renewDays);
        if (isNaN(days) || days <= 0) {
            Alert.alert("Lỗi", "Vui lòng nhập số ngày hợp lệ (số nguyên dương).");
            return;
        }

        if (days > credits) {
            Alert.alert(
                "Không đủ credits", 
                `Bạn cần ${days} credits để gia hạn ${days} ngày nhưng chỉ có ${credits} credits. Vui lòng nạp thêm ${days - credits} credits.`,
                [
                    { text: "Hủy", style: "cancel" },
                    { text: "Nạp Credits", onPress: () => {
                        setShowRenewModal(false);
                        setShowTopUpModal(true);
                    }}
                ]
            );
            return;
        }

        try {
            await renewProperty({ 
                propertyId: selectedProperty.id, 
                currentExpiry: selectedProperty.expiry, 
                sellerId: user.$id,
                days 
            });
            Alert.alert("Thành công", `Đã gia hạn bài đăng thêm ${days} ngày!`);
            setShowRenewModal(false);
            setRenewDays('');
            setSelectedProperty(null);
            onRefresh();
        } catch (error: any) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const handleCreatePress = () => {
        router.push('/create-property');
    };

    const handleTopUp = async () => {
        if (!user?.$id) return;
        
        const amount = parseInt(topUpAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert("Lỗi", "Vui lòng nhập số credit hợp lệ (số nguyên dương).");
            return;
        }

        try {
            await topUpCredit({ userId: user.$id, amount });
            Alert.alert("Thành công", `Đã nạp ${amount} credit thành công!`);
            setShowTopUpModal(false);
            setTopUpAmount('');
            await fetchCredits();
        } catch (error: any) {
            Alert.alert("Lỗi", error.message);
        }
    };

    const filteredProperties = useMemo(() => {
        if (activeFilter === 'all') {
            return properties;
        }
        return properties?.filter(p => p.status === activeFilter);
    }, [properties, activeFilter]);

    useEffect(() => {
        if (user?.$id) {
            refetch({ userId: user.$id });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.$id]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            {/* Renew Modal */}
            <Modal
                visible={showRenewModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRenewModal(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Gia Hạn Bài Đăng</Text>
                                    <Text style={styles.modalDescription}>
                                        Nhập số ngày bạn muốn gia hạn bài đăng. Mỗi ngày tốn 1 credit.
                                    </Text>
                                    
                                    <View style={styles.creditInfoBox}>
                                        <Text style={styles.creditInfoText}>Số credits hiện tại: {credits}</Text>
                                    </View>
                                    
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Số Ngày Gia Hạn</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập số ngày"
                                            keyboardType="numeric"
                                            value={renewDays}
                                            onChangeText={setRenewDays}
                                            returnKeyType="done"
                                            onSubmitEditing={Keyboard.dismiss}
                                        />
                                        {renewDays && parseInt(renewDays) > 0 && (
                                            <Text style={styles.costText}>
                                                Chi phí: {renewDays} credits
                                                {parseInt(renewDays) > credits && 
                                                    <Text style={styles.insufficientText}> (Thiếu {parseInt(renewDays) - credits} credits)</Text>
                                                }
                                            </Text>
                                        )}
                                    </View>

                                    {/* Quick Select Buttons */}
                                    <View style={styles.quickSelectContainer}>
                                        <Text style={styles.quickSelectLabel}>Gợi ý:</Text>
                                        <View style={styles.quickSelectButtons}>
                                            {[7, 15, 30, 60].map(days => (
                                                <TouchableOpacity
                                                    key={days}
                                                    style={[
                                                        styles.quickSelectButton,
                                                        days > credits && styles.quickSelectButtonDisabled
                                                    ]}
                                                    onPress={() => {
                                                        setRenewDays(days.toString());
                                                        Keyboard.dismiss();
                                                    }}
                                                >
                                                    <Text style={[
                                                        styles.quickSelectText,
                                                        days > credits && styles.quickSelectTextDisabled
                                                    ]}>
                                                        {days} ngày
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.cancelButton]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowRenewModal(false);
                                                setRenewDays('');
                                                setSelectedProperty(null);
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.confirmButton]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                handleConfirmRenew();
                                            }}
                                        >
                                            <Text style={styles.confirmButtonText}>Gia Hạn</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* Top Up Credit Modal */}
            <Modal
                visible={showTopUpModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTopUpModal(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Nạp Credit</Text>
                                    <Text style={styles.modalDescription}>
                                        Nhập số credits bạn muốn nạp. Mỗi credit có thể gia hạn bài đăng thêm 1 ngày.
                                    </Text>
                                    
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Số Credit</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Nhập số credit"
                                            keyboardType="numeric"
                                            value={topUpAmount}
                                            onChangeText={setTopUpAmount}
                                            returnKeyType="done"
                                            onSubmitEditing={Keyboard.dismiss}
                                        />
                                    </View>

                                    {/* Quick Select Buttons */}
                                    <View style={styles.quickSelectContainer}>
                                        <Text style={styles.quickSelectLabel}>Gợi ý:</Text>
                                        <View style={styles.quickSelectButtons}>
                                            {[10, 30, 50, 100].map(amount => (
                                                <TouchableOpacity
                                                    key={amount}
                                                    style={styles.quickSelectButton}
                                                    onPress={() => {
                                                        setTopUpAmount(amount.toString());
                                                        Keyboard.dismiss();
                                                    }}
                                                >
                                                    <Text style={styles.quickSelectText}>{amount}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.cancelButton]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setShowTopUpModal(false);
                                                setTopUpAmount('');
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.confirmButton]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                handleTopUp();
                                            }}
                                        >
                                            <Text style={styles.confirmButtonText}>Nạp Credit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            <FlatList
                data={filteredProperties as PropertyDocument[] | null}
                keyExtractor={(item) => item.$id}
                renderItem={({ item }) => (
                    <Link href={{ pathname: "/property-details", params: { id: item.$id } }} asChild>
                        <TouchableOpacity>
                            <PropertyCard item={item} credits={credits} onRenew={handleRenew} isSeller={isSeller} />
                        </TouchableOpacity>
                    </Link>
                )}
                ListHeaderComponent={() => (
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Bất động sản của tôi</Text>
                        
                        {/* Credit Balance Card - Chỉ hiển thị cho Seller */}
                        {isSeller && (
                            <View style={styles.creditCard}>
                                <View style={styles.creditInfo}>
                                    <Text style={styles.creditLabel}>Số dư Credit</Text>
                                    <Text style={styles.creditAmount}>{credits} Credits</Text>
                                    <Text style={styles.creditNote}>1 Credit = 1 ngày gia hạn • Bài đăng mới: 15 ngày</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.topUpButton} 
                                    onPress={() => setShowTopUpModal(true)}
                                >
                                    <Text style={styles.topUpButtonText}>Nạp Credit</Text>
                                </TouchableOpacity>
                            </View>
                        )}

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
    creditCard: {
        backgroundColor: '#f0f8ff',
        borderRadius: 12,
        padding: 16,
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#007BFF',
    },
    creditInfo: {
        flex: 1,
    },
    creditLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    creditAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#007BFF',
        marginBottom: 4,
    },
    creditNote: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
    },
    topUpButton: {
        backgroundColor: '#28a745',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    topUpButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
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
    },
    renewButton: {
        marginTop: 8,
        backgroundColor: '#28a745',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 5,
        alignSelf: 'flex-start',
    },
    renewButtonDisabled: {
        backgroundColor: '#6c757d',
    },
    renewButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    expiryContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expiryInfo: {
        flex: 1,
    },
    expiryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#28a745',
        marginBottom: 2,
    },
    expiryTextWarning: {
        color: '#ffc107',
    },
    expiryTextExpired: {
        color: '#dc3545',
    },
    expiryDate: {
        fontSize: 11,
        color: '#888',
    },
    renewButtonInCard: {
        backgroundColor: '#007BFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginLeft: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    renewButtonInCardDisabled: {
        backgroundColor: '#6c757d',
        opacity: 0.6,
    },
    renewButtonInCardText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    creditInfoBox: {
        backgroundColor: '#f0f8ff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#007BFF',
    },
    creditInfoText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007BFF',
        textAlign: 'center',
    },
    costText: {
        marginTop: 8,
        fontSize: 13,
        color: '#333',
        fontWeight: '500',
    },
    insufficientText: {
        color: '#dc3545',
        fontWeight: 'bold',
    },
    quickSelectButtonDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#ccc',
        opacity: 0.5,
    },
    quickSelectTextDisabled: {
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    modalDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    quickSelectContainer: {
        marginBottom: 24,
    },
    quickSelectLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    quickSelectButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quickSelectButton: {
        backgroundColor: '#e3f2fd',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007BFF',
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    quickSelectText: {
        color: '#007BFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmButton: {
        backgroundColor: '#007BFF',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default MyProperties;
