import { Tabs, Redirect } from 'expo-router';
import { useGlobalContext } from '@/lib/global-provider';
import { ActivityIndicator, View, Text } from 'react-native';
import { useEffect } from 'react';
import { signOut } from '@/lib/appwrite';
import { Ionicons } from '@expo/vector-icons'; 

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

    const ProfileTab = (
        <Tabs.Screen 
            name="profile" 
            options={{ 
                title: 'Hồ Sơ', 
                headerShown: false, 
                tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={24} color={color} /> 
            }} 
        />
    );

    if (user.role === 'buyer') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen name="explore" options={{ title: 'Khám Phá', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} /> }} />
                {/* **FIX: Đã xóa tab thông báo chung** */}
                {ProfileTab}
                
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="my-properties" options={{ href: null }} />
                <Tabs.Screen name="dashboard" options={{ href: null }} />
                <Tabs.Screen name="seller-notifications" options={{ href: null }} />
                <Tabs.Screen name="notifications" options={{ href: null }} />
            </Tabs>
        );
    }

    if (user.role === 'seller') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen name="my-properties" options={{ title: 'BĐS của tôi', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} /> }} />
                <Tabs.Screen name="seller-notifications" options={{ title: 'Thông báo', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={24} color={color} /> }} />
                {ProfileTab}

                <Tabs.Screen name="saved" options={{ href: null }} />
                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="explore" options={{ href: null }} />
                <Tabs.Screen name="dashboard" options={{ href: null }} />
            </Tabs>
        );
    }

    if (user.role === 'broker') {
        return (
            <Tabs screenOptions={{ tabBarActiveTintColor: '#007BFF' }}>
                <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', headerShown: false, tabBarIcon: ({ color }) => <Ionicons name="briefcase-outline" size={24} color={color} /> }} />
                {/* **FIX: Đã xóa tab thông báo chung** */}
                {ProfileTab}

                <Tabs.Screen name="index" options={{ href: null }} />
                <Tabs.Screen name="explore" options={{ href: null }} />
                <Tabs.Screen name="my-properties" options={{ href: null }} />
                <Tabs.Screen name="seller-notifications" options={{ href: null }} />
                <Tabs.Screen name="notifications" options={{ href: null }} />
            </Tabs>
        );
    }

    return <SignOutAndRedirect />;
};

export default TabsLayout;
