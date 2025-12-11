// File: app/(root)/(tabs)/_layout.tsx

import { signOut } from '@/lib/appwrite';
import { useGlobalContext } from '@/lib/global-provider';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const SignOutAndRedirect = () => {
    const { refetch } = useGlobalContext();
    useEffect(() => {
        const performSignOut = async () => {
            await signOut();
            await refetch({});
        };
        performSignOut();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 10 }}>Phiên không hợp lệ. Đang đăng xuất...</Text>
        </View>
    );
};

const TabsLayout = () => {
    const { user, loading, isLoggedIn } = useGlobalContext();

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
    }

    if (!isLoggedIn || !user) {
        return <Redirect href="/sign-in" />;
    }

    if (user.role === 'buyer') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen name="explore" options={{ title: 'Khám Phá', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} /> }} />
                <Tabs.Screen name="saved" options={{ title: 'Đã lưu', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="heart" size={24} color={color} /> }} />
                <Tabs.Screen
                    name="dashboard-chat"
                    options={{
                        title: 'Tin nhắn',
                        headerShown: false,
                        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
                    }}
                />
                <Tabs.Screen name="profile" options={{ title: 'Hồ Sơ', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} /> }} />
                {/* Ẩn các tab không liên quan */}
                <Tabs.Screen name="search-properties" options={{ href: null }} />
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="my-listings" options={{ href: null }} />
                <Tabs.Screen name="review-property/[id]" options={{ href: null }} />
                <Tabs.Screen name="my-properties" options={{ href: null }} />
                <Tabs.Screen name="dashboard" options={{ href: null }} />
                <Tabs.Screen name="seller-notifications" options={{ href: null }} />
                <Tabs.Screen name="seller-chat" options={{ href: null }} />
                <Tabs.Screen name="all-pending" options={{ href: null }} />
            </Tabs>
        );
    }

    // Người Bán
    if (user.role === 'seller') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen
                    name="my-properties"
                    options={{
                        title: 'BĐS của tôi',
                        headerShown: false,
                        tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />
                    }}
                />
                <Tabs.Screen
                    name="search-properties"
                    options={{
                        title: 'Tìm kiếm',
                        headerShown: false,
                        tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />
                    }}
                />
                <Tabs.Screen
                    name="seller-notifications"
                    options={{
                        title: 'Thông báo',
                        headerShown: false,
                        tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={24} color={color} />
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Hồ Sơ',
                        headerShown: false,
                        tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} />
                    }}
                />
                <Tabs.Screen
                    name="dashboard-chat"
                    options={{
                        title: 'Tin nhắn',
                        headerShown: false,
                        tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
                    }}
                />
                <Tabs.Screen name="search-properties" options={{ href: null }} />
                <Tabs.Screen name="my-listings" options={{ href: null }} />
                <Tabs.Screen name="saved" options={{ href: null }} />
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="explore" options={{ href: null }} />
                <Tabs.Screen name="dashboard" options={{ href: null }} />
                <Tabs.Screen name="review-property/[id]" options={{ href: null }} />
                <Tabs.Screen name="all-pending" options={{ href: null }} />
            </Tabs>
        );
    }

    if (user.role === 'broker') {
            return (
                <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                    <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="briefcase" size={24} color={color} /> }} />
                    <Tabs.Screen
                        name="my-listings"
                            options={{
                            title: 'Tin của tôi',
                            headerShown: false,
                            tabBarIcon: ({ color }) => <Ionicons name="business" size={24} color={color} />
                        }}
                    />

                    <Tabs.Screen
                        name="dashboard-chat"
                        options={{
                            title: 'Tin nhắn',
                            headerShown: false,
                            tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
                        }}
                    />

                    <Tabs.Screen name="profile" options={{ title: 'Hồ Sơ', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} /> }} />

                    {/* Ẩn các tab không liên quan */}
                    <Tabs.Screen name="search-properties" options={{ href: null }} />
                    <Tabs.Screen name="index" options={{ href: null }} />
                    <Tabs.Screen name="explore" options={{ href: null }} />
                    <Tabs.Screen name="my-properties" options={{ href: null }} />
                    <Tabs.Screen name="seller-notifications" options={{ href: null }} />
                    <Tabs.Screen name="saved" options={{ href: null }} />
                    <Tabs.Screen name="review-property/[id]" options={{ href: null }} />
                    <Tabs.Screen name="all-pending" options={{ href: null }} />
                </Tabs>
            );
        }

    return <SignOutAndRedirect />;
};

export default TabsLayout;
``