import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Dữ liệu giả cho thông báo
const mockNotifications = [
  {
    id: '1',
    type: 'approval',
    message: 'Nhà môi giới Nguyễn Văn A đã duyệt bài đăng "Biệt thự ven hồ" của bạn.',
    broker: {
      id: 'broker1',
      name: 'Nguyễn Văn A',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
    timestamp: '2 giờ trước',
  },
  {
    id: '2',
    type: 'rejection',
    message: 'Bài đăng "Căn hộ trung tâm" của bạn đã bị từ chối. Lý do: Thiếu thông tin pháp lý.',
    timestamp: '5 giờ trước',
  },
  {
    id: '3',
    type: 'approval',
    message: 'Nhà môi giới Trần Thị B đã duyệt bài đăng "Đất nền dự án" của bạn.',
    broker: {
      id: 'broker2',
      name: 'Trần Thị B',
      avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    },
    timestamp: '1 ngày trước',
  },
];

const SellerNotifications = () => {
  const renderNotification = ({ item }: { item: typeof mockNotifications[0] }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationContent}>
        {item.broker && <Image source={{ uri: item.broker.avatar }} style={styles.avatar} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
      {item.type === 'approval' && (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.push({ pathname: '/seller-chat', params: { brokerId: item.broker?.id } })}
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#007BFF" />
          <Text style={styles.chatButtonText}>Trò chuyện</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông báo</Text>
      </View>
      <FlatList
        data={mockNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>Không có thông báo nào.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#E7F3FF',
    borderRadius: 6,
  },
  chatButtonText: {
    marginLeft: 8,
    color: '#007BFF',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
});

export default SellerNotifications;
