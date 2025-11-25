// File: app/(root)/(tabs)/_layout.tsx

import { useGlobalContext } from '@/lib/global-provider';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

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
                <Tabs.Screen name="saved" options={{ title: 'Đã lưu', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} /> }} />
                <Tabs.Screen name="profile" options={{ title: 'Hồ Sơ', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} /> }} />

                {/* Ẩn các tab không liên quan */}
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="my-properties" options={{ href: null }} />
                <Tabs.Screen name="dashboard" options={{ href: null }} />
                <Tabs.Screen name="my-listings" options={{href: null}}/>
                <Tabs.Screen name="review-property/[id]"  options={{href: null}}/>
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
                <Tabs.Screen name="saved" options={{ href: null }} />
            </Tabs>
        );
    }

    // Môi giới
    if (user.role === 'broker') {
            return (
                <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                    {/* 1. Dashboard: Tổng quan số liệu và Tin chờ duyệt */}
                    <Tabs.Screen name="dashboard" options={{ title: 'Tổng quan', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} /> }} />

                    {/* 2. My Listings: Danh sách tin đã nhận duyệt và đang quản lý */}
                    <Tabs.Screen
                        name="my-listings" // Cần tạo file app/(root)/(tabs)/my-listings.tsx
                        options={{
                            title: 'Tin của tôi',
                            headerShown: false,
                            tabBarIcon: ({ color }) => <Ionicons name="business" size={24} color={color} />
                        }}
                    />

                    {/* 3. Hồ Sơ */}
                    <Tabs.Screen name="profile" options={{ title: 'Hồ Sơ', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} /> }} />

                {/* Ẩn các tab không liên quan */}
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="explore" options={{ href: null }} />
                <Tabs.Screen name="my-properties" options={{ href: null }} />
                <Tabs.Screen name="saved" options={{ href: null }} />
                
            </Tabs>
        );
    }
    

    // Fallback phòng trường hợp role không xác định
    return <Text>Không thể xác định vai trò người dùng.</Text>;
};

export default TabsLayout;