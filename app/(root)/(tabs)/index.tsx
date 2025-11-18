import { Redirect } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { View, ActivityIndicator } from 'react-native';

const RootIndex = () => {
    const { user, loading } = useGlobalContext();

    // Nếu đang tải thông tin người dùng, hiển thị màn hình loading
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Nếu không có người dùng, chuyển về trang đăng nhập
    if (!user) {
        return <Redirect href="/sign-in" />;
    }

    // Logic điều hướng dựa trên vai trò
    switch (user.role) {
        case 'buyer':
            return <Redirect href="/explore" />;
        case 'seller':
            return <Redirect href="/my-properties" />;
        case 'broker':
            return <Redirect href="/dashboard" />;
        default:
            // Fallback: Nếu không có vai trò, về trang đăng nhập
            return <Redirect href="/sign-in" />;
    }
};

export default RootIndex;
