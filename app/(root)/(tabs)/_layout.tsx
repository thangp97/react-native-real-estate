// File: app/(root)/(tabs)/_layout.tsx

import { Tabs, Redirect } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { ActivityIndicator, View, Text } from 'react-native';

// Bạn có thể cài đặt và sử dụng thư viện icon này: npm install @expo/vector-icons
import { Ionicons } from '@expo/vector-icons';

const TabsLayout = () => {
    const { user, loading, isLoggedIn } = useGlobalContext();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!isLoggedIn || !user) {
        return <Redirect href="/sign-in" />;
    }

    // Người Mua
    if (user.role === 'buyer') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen name="explore" options={{ title: 'Khám Phá', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} /> }} />
                <Tabs.Screen name="profile" options={{ title: 'Hồ Sơ', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} /> }} />

                {/* Ẩn các tab không liên quan */}
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="my-properties" options={{ href: null }} />
                <Tabs.Screen name="dashboard" options={{ href: null }} />
            </Tabs>
        );
    }

    // Người Bán
    if (user.role === 'seller') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen name="my-properties" options={{ title: 'BĐS của tôi', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }} />
                <Tabs.Screen name="profile" options={{ title: 'Hồ Sơ', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} /> }} />

                {/* Ẩn các tab không liên quan */}
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="explore" options={{ href: null }} />
                <Tabs.Screen name="dashboard" options={{ href: null }} />
            </Tabs>
        );
    }

    // Môi giới
    if (user.role === 'broker') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="briefcase" size={24} color={color} /> }} />
                <Tabs.Screen name="profile" options={{ title: 'Hồ Sơ', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} /> }} />

                {/* Ẩn các tab không liên quan */}
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="explore" options={{ href: null }} />
                <Tabs.Screen name="my-properties" options={{ href: null }} />
            </Tabs>
        );
    }

    // Fallback phòng trường hợp role không xác định
    return <Text>Không thể xác định vai trò người dùng.</Text>;
};

export default TabsLayout;