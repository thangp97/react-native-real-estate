import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    Alert,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ImageBackground
} from 'react-native';
import { useRouter, Link, Redirect } from 'expo-router';
import { createUser } from '@/lib/appwrite'; // **FIX: Import hàm createUser duy nhất**
import { useGlobalContext } from '@/lib/global-provider';

const SignUp = () => {
    const { user, loading, refetch } = useGlobalContext();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'buyer'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    if (!loading && user) {
        return <Redirect href="/" />;
    }

    const handleSignUp = async () => {
        if (!form.name || !form.email || !form.password) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        setIsSubmitting(true);
        try {
            // **FIX: Chỉ gọi hàm createUser đã được chuẩn hóa**
            await createUser(form.email, form.password, form.name, form.role);

            // Sau khi đăng ký thành công (đã tự động đăng nhập), refetch lại dữ liệu người dùng
            await refetch();

            Alert.alert('Thành công', 'Đăng ký thành công!', [
                { text: 'OK', onPress: () => router.replace('/') },
            ]);

        } catch (error: any) {
            console.error("Lỗi đăng ký chi tiết:", JSON.stringify(error, null, 2));
            Alert.alert('Lỗi đăng ký', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Đăng Ký</Text>
            <View>
                <Text className="text-base text-gray-600 font-rubik-medium">Username</Text>
                <TextInput placeholder="Username" value={form.name} onChangeText={(e) => setForm({...form, name: e})} style={styles.input} />
            </View>
            <View>
                <Text className="text-base text-gray-600 font-rubik-medium">Email</Text>
                <TextInput placeholder="Email" value={form.email} onChangeText={(e) => setForm({...form, email: e})} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View>
                <Text className="text-base text-gray-600 font-rubik-medium">Mật khẩu</Text>
                <TextInput placeholder="Mật khẩu" value={form.password} onChangeText={(e) => setForm({...form, password: e})} style={styles.input} secureTextEntry />
            </View>
            
            <Text style={styles.roleLabel}>Bạn là:</Text>
            <View style={styles.roleContainer}>
                <TouchableOpacity onPress={() => setForm({...form, role: 'buyer'})} style={[styles.roleButton, form.role === 'buyer' && styles.roleButtonSelected]}>
                    <Text style={[styles.roleText, form.role === 'buyer' && styles.roleTextSelected]}>Người Mua</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setForm({...form, role: 'seller'})} style={[styles.roleButton, form.role === 'seller' && styles.roleButtonSelected]}>
                    <Text style={[styles.roleText, form.role === 'seller' && styles.roleTextSelected]}>Người Bán</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setForm({...form, role: 'broker'})} style={[styles.roleButton, form.role === 'broker' && styles.roleButtonSelected]}>
                    <Text style={[styles.roleText, form.role === 'broker' && styles.roleTextSelected]}>Môi giới</Text>
                </TouchableOpacity>
            </View>

            <View style={{ marginTop: 20 }}>
                <Button title={isSubmitting ? "Đang xử lý..." : "Đăng Ký"} onPress={handleSignUp} disabled={isSubmitting} />
            </View>

            <View style={styles.loginLinkContainer}>
                <Text>Đã có tài khoản? </Text>
                <Link href="/sign-in" style={styles.loginLink}>Đăng nhập</Link>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
    input: { height: 45, borderColor: '#ccc', borderWidth: 1, marginBottom: 12, paddingHorizontal: 10, borderRadius: 8 },
    roleLabel: { marginTop: 10, marginBottom: 5, fontSize: 16 },
    roleContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    roleButton: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
    roleButtonSelected: { backgroundColor: '#007BFF', borderColor: '#007BFF' },
    roleText: { color: '#333' },
    roleTextSelected: { color: '#fff', fontWeight: 'bold' },
    loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    loginLink: { color: '#007BFF', fontWeight: 'bold' }
});


export default SignUp;
