import icons from '@/constants/icons';
import { topUpCredit } from '@/lib/api/seller';
import { useGlobalContext } from '@/lib/global-provider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const qrCodeImage = require('@/assets/images/qrcode.jpg');

const TopUpPayment = () => {
    const router = useRouter();
    const { user, refetch } = useGlobalContext();
    const { amount } = useLocalSearchParams<{ amount: string }>();
    const [isProcessing, setIsProcessing] = useState(false);

    const credits = parseInt(amount || '0');
    const totalPrice = credits * 10000; // 1 credit = 10,000 VND

    // Thông tin chuyển khoản mẫu
    const bankInfo = {
        bankName: 'Ngân hàng TMCP Quân Đội (MB Bank)',
        accountNumber: '0912294458',
        accountName: 'PHAM MANH THANG',
        transferContent: `${user?.$id?.slice(-6).toUpperCase()}`
    };

    const copyToClipboard = (text: string, label: string) => {
        Clipboard.setString(text);
        Alert.alert('Đã sao chép', `${label} đã được sao chép vào clipboard!`);
    };

    const handleConfirmPayment = async () => {
        Alert.alert(
            'Xác nhận thanh toán',
            'Bạn đã hoàn tất chuyển khoản?',
            [
                { text: 'Chưa', style: 'cancel' },
                {
                    text: 'Đã chuyển khoản',
                    onPress: async () => {
                        setIsProcessing(true);
                        try {
                            // Giả lập xử lý thanh toán
                            await new Promise(resolve => setTimeout(resolve, 1500));
                            
                            // Nạp credit vào tài khoản
                            await topUpCredit({ userId: user!.$id, amount: credits });
                            
                            // Refresh user data
                            await refetch({});
                            
                            Alert.alert(
                                'Thành công! 🎉',
                                `Đã nạp ${credits} credits vào tài khoản của bạn.\n\n`,
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => {
                                            if (router.canGoBack()) {
                                                router.back();
                                            } else {
                                                router.replace('/my-properties');
                                            }
                                        }
                                    }
                                ]
                            );
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.message);
                        } finally {
                            setIsProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/my-properties');
                            }
                        }} 
                        style={styles.backButton}
                    >
                        <Image source={icons.backArrow} style={styles.backIcon} tintColor="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Thanh toán</Text>
                </View>

                {/* Thông tin đơn hàng */}
                <View style={styles.orderCard}>
                    <Text style={styles.sectionTitle}>📦 Thông tin đơn hàng</Text>
                    <View style={styles.orderInfo}>
                        <View style={styles.orderRow}>
                            <Text style={styles.orderLabel}>Số credits:</Text>
                            <Text style={styles.orderValue}>{credits} Credits</Text>
                        </View>
                        <View style={styles.orderRow}>
                            <Text style={styles.orderLabel}>Đơn giá:</Text>
                            <Text style={styles.orderValue}>10,000 VNĐ/credit</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.orderRow}>
                            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
                            <Text style={styles.totalValue}>{totalPrice.toLocaleString('vi-VN')} VNĐ</Text>
                        </View>
                    </View>
                </View>

                {/* Thông tin chuyển khoản */}
                <View style={styles.bankCard}>
                    <Text style={styles.sectionTitle}>🏦 Thông tin chuyển khoản</Text>
                    
                    <View style={styles.bankInfoContainer}>
                        <View style={styles.bankInfoRow}>
                            <Text style={styles.bankLabel}>Ngân hàng:</Text>
                            <TouchableOpacity 
                                style={styles.copyButton}
                                onPress={() => copyToClipboard(bankInfo.bankName, 'Tên ngân hàng')}
                            >
                                <Text style={styles.bankValue}>{bankInfo.bankName}</Text>
                                <Image source={icons.edit} style={styles.copyIcon} tintColor="#007BFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.bankInfoRow}>
                            <Text style={styles.bankLabel}>Số tài khoản:</Text>
                            <TouchableOpacity 
                                style={styles.copyButton}
                                onPress={() => copyToClipboard(bankInfo.accountNumber, 'Số tài khoản')}
                            >
                                <Text style={styles.bankValueBold}>{bankInfo.accountNumber}</Text>
                                <Image source={icons.edit} style={styles.copyIcon} tintColor="#007BFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.bankInfoRow}>
                            <Text style={styles.bankLabel}>Chủ tài khoản:</Text>
                            <TouchableOpacity 
                                style={styles.copyButton}
                                onPress={() => copyToClipboard(bankInfo.accountName, 'Tên chủ tài khoản')}
                            >
                                <Text style={styles.bankValueBold}>{bankInfo.accountName}</Text>
                                <Image source={icons.edit} style={styles.copyIcon} tintColor="#007BFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.bankInfoRow, styles.highlightRow]}>
                            <Text style={styles.bankLabel}>Nội dung CK:</Text>
                            <TouchableOpacity 
                                style={styles.copyButton}
                                onPress={() => copyToClipboard(bankInfo.transferContent, 'Nội dung chuyển khoản')}
                            >
                                <Text style={styles.transferContent}>{bankInfo.transferContent}</Text>
                                <Image source={icons.edit} style={styles.copyIcon} tintColor="#28a745" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.noteBox}>
                        <Text style={styles.noteTitle}>⚠️ Lưu ý quan trọng:</Text>
                        <Text style={styles.noteText}>• Vui lòng chuyển khoản đúng số tiền: {totalPrice.toLocaleString('vi-VN')} VNĐ</Text>
                        <Text style={styles.noteText}>• Nhập đúng nội dung: {bankInfo.transferContent}</Text>
                        <Text style={styles.noteText}>• Credits sẽ được cộng sau khi admin xác nhận (1-5 phút)</Text>
                    </View>
                </View>

                {/* QR Code */}
                <View style={styles.qrCard}>
                    <Text style={styles.sectionTitle}>📱 Quét mã QR để chuyển khoản</Text>
                    <Image 
                        source={qrCodeImage}
                        style={styles.qrImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.qrSubtext}>Quét mã QR bằng app ngân hàng</Text>
                </View>

                {/* Hướng dẫn */}
                <View style={styles.guideCard}>
                    <Text style={styles.sectionTitle}>📝 Hướng dẫn thanh toán</Text>
                    <View style={styles.stepContainer}>
                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>1</Text>
                            </View>
                            <Text style={styles.stepText}>Mở app ngân hàng của bạn</Text>
                        </View>
                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>2</Text>
                            </View>
                            <Text style={styles.stepText}>Chuyển khoản đến số TK: {bankInfo.accountNumber}</Text>
                        </View>
                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>3</Text>
                            </View>
                            <Text style={styles.stepText}>Nhập đúng nội dung: {bankInfo.transferContent}</Text>
                        </View>
                        <View style={styles.step}>
                            <View style={styles.stepNumber}>
                                <Text style={styles.stepNumberText}>4</Text>
                            </View>
                            <Text style={styles.stepText}>Nhấn Đã chuyển khoản bên dưới</Text>
                        </View>
                    </View>
                </View>

                {/* Button */}
                <TouchableOpacity 
                    style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]}
                    onPress={handleConfirmPayment}
                    disabled={isProcessing}
                    activeOpacity={0.8}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.confirmButtonText}>✓ Đã chuyển khoản</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/my-properties');
                        }
                    }}
                    disabled={isProcessing}
                >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>

                <View style={styles.bottomSpace} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    backIcon: {
        width: 24,
        height: 24,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    orderCard: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    orderInfo: {
        gap: 8,
    },
    orderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    orderLabel: {
        fontSize: 15,
        color: '#666',
    },
    orderValue: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 8,
    },
    totalLabel: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#007BFF',
    },
    bankCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bankInfoContainer: {
        gap: 12,
    },
    bankInfoRow: {
        gap: 8,
    },
    bankLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    bankValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    bankValueBold: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
        flex: 1,
    },
    copyIcon: {
        width: 18,
        height: 18,
        marginLeft: 8,
    },
    highlightRow: {
        backgroundColor: '#fffbea',
        padding: 12,
        borderRadius: 8,
        marginTop: 4,
    },
    transferContent: {
        fontSize: 16,
        color: '#28a745',
        fontWeight: 'bold',
        flex: 1,
    },
    noteBox: {
        backgroundColor: '#fff3cd',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#ffc107',
    },
    noteTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#856404',
        marginBottom: 8,
    },
    noteText: {
        fontSize: 13,
        color: '#856404',
        marginBottom: 4,
        lineHeight: 20,
    },
    qrCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: 'center',
    },
    qrImage: {
        width: 250,
        height: 250,
        borderRadius: 12,
        marginVertical: 8,
    },
    qrSubtext: {
        fontSize: 13,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    guideCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    stepContainer: {
        gap: 12,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#007BFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginTop: 4,
    },
    confirmButton: {
        backgroundColor: '#28a745',
        marginHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#28a745',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    confirmButtonDisabled: {
        backgroundColor: '#6c757d',
        shadowColor: '#6c757d',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    cancelButton: {
        marginHorizontal: 16,
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    bottomSpace: {
        height: 32,
    },
});

export default TopUpPayment;

