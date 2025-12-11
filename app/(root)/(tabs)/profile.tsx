import icons from "@/constants/icons";
import { getSellerData } from "@/lib/api/seller";
import { signOut as logout, updatePassword, updateUserProfile, uploadFile } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageSourcePropType, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingItemProps {
    icon: ImageSourcePropType;
    title: string;
    onPress?: () => void;
    textStyle?: any;
    showArrow?: boolean;
}

const SettingsItem = ({ icon, title, onPress, textStyle, showArrow = true }: SettingItemProps) => (
    <TouchableOpacity onPress={onPress} style={styles.settingsItem} activeOpacity={0.7}>
        <View style={styles.settingsItemLeft}>
            <Image source={icon} style={styles.settingsIcon} />
            <Text style={[styles.settingsText, textStyle]}>{title}</Text>
        </View>
        {showArrow && <Image source={icons.rightArrow} style={styles.settingsArrow} />}
    </TouchableOpacity>
);

const Profile = () => {
    const { user, refetch, setUser } = useGlobalContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [credits, setCredits] = useState(0);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchCredits = async () => {
            if (user?.$id && user?.role === 'seller') {
                const sellerData: any = await getSellerData({ userId: user.$id });
                if (sellerData) {
                    setCredits(sellerData.credits || 0);
                }
            }
        };
        fetchCredits();
    }, [user]);

    useEffect(() => {
        if (user) {
            setEditName(user.name || '');
            setEditEmail(user.email || '');
        }
    }, [user]);

    const handleLogout = async () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        await refetch({});
                    }
                }
            ]
        );
    };

    const handleAvatarChange = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Lỗi', 'Chúng tôi cần quyền truy cập thư viện ảnh để bạn có thể thay đổi ảnh đại diện.');
            return;
        }

        let pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 1,
        });

        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
            setIsSubmitting(true);
            try {
                const uploadResult = await uploadFile(pickerResult.assets[0]);
                if (!uploadResult) throw new Error("Không thể tải ảnh lên.");

                let avatarUrl: string;
                if (typeof uploadResult === 'string') {
                    avatarUrl = uploadResult;
                } else if (typeof uploadResult === 'object' && uploadResult !== null && 'href' in uploadResult) {
                    avatarUrl = String(uploadResult.href);
                } else {
                    throw new Error("URL ảnh không hợp lệ.");
                }

                await updateUserProfile(user!.$id, { avatar: avatarUrl });

                if (setUser && user) {
                    const updatedUser: typeof user = { ...user, avatar: avatarUrl };
                    setUser(updatedUser);
                }

                Alert.alert("Thành công", "Ảnh đại diện đã được cập nhật.");
                await refetch({});

            } catch (error: any) {
                console.error("Lỗi cập nhật ảnh đại diện:", error);
                Alert.alert("Lỗi", `Đã có lỗi xảy ra: ${error.message}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleUpdateProfile = async () => {
        if (!editName.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tên của bạn.');
            return;
        }

        setIsSubmitting(true);
        try {
            await updateUserProfile(user!.$id, { name: editName });
            
            // Cập nhật local state ngay lập tức để UI phản hồi nhanh
            if (setUser && user) {
                setUser({ ...user, name: editName });
            }
            
            // Refetch để đồng bộ với server (sẽ cập nhật context và trigger re-render)
            await refetch({});

            Alert.alert("Thành công", "Thông tin đã được cập nhật.");
            setShowEditModal(false);
        } catch (error: any) {
            Alert.alert("Lỗi", `Đã có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không khớp.');
            return;
        }

        setIsSubmitting(true);
        try {
            await updatePassword(oldPassword, newPassword);
            Alert.alert("Thành công", "Mật khẩu đã được thay đổi.");
            setShowPasswordModal(false);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            Alert.alert("Lỗi", error.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Menu items theo role
    const getMenuItems = () => {
        const baseItems = [
            {
                icon: icons.person,
                title: "Chỉnh sửa thông tin",
                onPress: () => setShowEditModal(true),
            },
            {
                icon: icons.shield,
                title: "Đổi mật khẩu",
                onPress: () => setShowPasswordModal(true),
            },
        ];

        if (user?.role === 'seller') {
            return [
                {
                    icon: icons.home,
                    title: "Bất động sản của tôi",
                    onPress: () => router.push('/my-properties'),
                },
                {
                    icon: icons.calendar,
                    title: "Lịch hẹn của tôi",
                    onPress: () => router.push('/bookings'),
                },
                {
                    icon: icons.wallet,
                    title: "Nạp Điểm",
                    onPress: () => {
                        Alert.prompt(
                            'Nạp Điểm',
                            'Nhập số Điểm bạn muốn nạp (Gợi ý: 10, 30, 50, 100):',
                            [
                                { text: 'Hủy', style: 'cancel' },
                                {
                                    text: 'Tiếp tục',
                                    onPress: (amount?: string) => {
                                        const credits = parseInt(amount || '0');
                                        if (isNaN(credits) || credits <= 0) {
                                            Alert.alert('Lỗi', 'Vui lòng nhập số credits hợp lệ');
                                            return;
                                        }
                                        router.push({
                                            pathname: '/top-up-payment',
                                            params: { amount: credits.toString() }
                                        });
                                    }
                                }
                            ],
                            'plain-text'
                        );
                    },
                },
                ...baseItems,
            ];
        } else if (user?.role === 'buyer') {
            return [
                {
                    icon: icons.heart,
                    title: "Bất động sản đã lưu",
                    onPress: () => router.push('/saved'),
                },
                {
                    icon: icons.calendar,
                    title: "Lịch hẹn của tôi",
                    onPress: () => router.push('/bookings'),
                },
                ...baseItems,
            ];
        } else if (user?.role === 'broker') {
            return [
                {
                    icon: icons.home,
                    title: "Dashboard",
                    onPress: () => router.push('/dashboard'),
                },
                {
                    icon: icons.calendar,
                    title: "Lịch hẹn",
                    onPress: () => router.push('/bookings'),
                },
                ...baseItems,
            ];
        }

        return baseItems;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Hồ sơ</Text>
                    {user?.role === 'seller' && (
                        <TouchableOpacity onPress={() => router.push('/seller-notifications')}>
                            <Image source={icons.bell} style={styles.bellIcon} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: user?.avatar || 'https://via.placeholder.com/150' }} 
                            style={styles.avatar} 
                        />
                        <TouchableOpacity 
                            style={styles.editAvatarButton} 
                            onPress={handleAvatarChange} 
                            disabled={isSubmitting}
                        >
                            <Image source={icons.edit} style={styles.editIcon} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
                    <Text style={styles.userEmail}>{user?.email || ''}</Text>
                    
                    {user?.role === 'seller' && (
                        <View style={styles.creditsBadge}>
                            <Image source={icons.wallet} style={styles.creditsIcon} />
                            <Text style={styles.creditsText}>{credits} Điểm</Text>
                        </View>
                    )}

                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>
                            {user?.role === 'seller' ? 'Người bán' : 
                             user?.role === 'buyer' ? 'Người mua' : 
                             user?.role === 'broker' ? 'Môi giới' : 'Người dùng'}
                        </Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {getMenuItems().map((item, index) => (
                        <SettingsItem key={index} {...item} />
                    ))}
                </View>

                {/* Logout */}
                <View style={styles.logoutSection}>
                    <SettingsItem 
                        icon={icons.logout} 
                        title="Đăng xuất"
                        textStyle={styles.logoutText} 
                        showArrow={false} 
                        onPress={handleLogout}
                    />
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEditModal(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View style={styles.modalContent}>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
                                        <TouchableOpacity 
                                            onPress={() => setShowEditModal(false)}
                                            style={styles.modalCloseButton}
                                        >
                                            <Text style={styles.modalCloseText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.modalBody}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Tên</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Nhập tên của bạn"
                                                value={editName}
                                                onChangeText={setEditName}
                                                autoCapitalize="words"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Email</Text>
                                            <TextInput
                                                style={[styles.input, styles.inputDisabled]}
                                                value={editEmail}
                                                editable={false}
                                                placeholder="Email không thể thay đổi"
                                            />
                                            <Text style={styles.inputNote}>Email không thể thay đổi</Text>
                                        </View>
                                    </View>

                                    <View style={styles.modalFooter}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.cancelButton]}
                                            onPress={() => setShowEditModal(false)}
                                        >
                                            <Text style={styles.cancelButtonText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.saveButton]}
                                            onPress={handleUpdateProfile}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.saveButtonText}>Lưu</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                <View style={styles.modalContent}>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                                        <TouchableOpacity 
                                            onPress={() => setShowPasswordModal(false)}
                                            style={styles.modalCloseButton}
                                        >
                                            <Text style={styles.modalCloseText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.modalBody}>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Mật khẩu cũ</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Nhập mật khẩu cũ"
                                                value={oldPassword}
                                                onChangeText={setOldPassword}
                                                secureTextEntry
                                                autoCapitalize="none"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                                                value={newPassword}
                                                onChangeText={setNewPassword}
                                                secureTextEntry
                                                autoCapitalize="none"
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Nhập lại mật khẩu mới"
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                                secureTextEntry
                                                autoCapitalize="none"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.modalFooter}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.cancelButton]}
                                            onPress={() => {
                                                setShowPasswordModal(false);
                                                setOldPassword('');
                                                setNewPassword('');
                                                setConfirmPassword('');
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.saveButton]}
                                            onPress={handleChangePassword}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={styles.saveButtonText}>Đổi mật khẩu</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    bellIcon: {
        width: 24,
        height: 24,
    },
    profileCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#007BFF',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#007BFF',
        borderRadius: 20,
        padding: 8,
        borderWidth: 3,
        borderColor: '#fff',
    },
    editIcon: {
        width: 16,
        height: 16,
        tintColor: '#fff',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginTop: 8,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    creditsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f8ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#007BFF',
    },
    creditsIcon: {
        width: 18,
        height: 18,
        marginRight: 6,
        tintColor: '#007BFF',
    },
    creditsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007BFF',
    },
    roleBadge: {
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    roleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2e7d32',
    },
    menuSection: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    settingsItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingsIcon: {
        width: 24,
        height: 24,
        tintColor: '#666',
    },
    settingsText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    settingsArrow: {
        width: 20,
        height: 20,
        tintColor: '#999',
    },
    logoutSection: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    logoutText: {
        color: '#dc3545',
    },
    modalContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalCloseButton: {
        padding: 4,
    },
    modalCloseText: {
        fontSize: 24,
        color: '#999',
        fontWeight: 'bold',
    },
    modalBody: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 16,
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
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
        color: '#333',
    },
    inputDisabled: {
        backgroundColor: '#f0f0f0',
        color: '#999',
    },
    inputNote: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    saveButton: {
        backgroundColor: '#007BFF',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default Profile;
