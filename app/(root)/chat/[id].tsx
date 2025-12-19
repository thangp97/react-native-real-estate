import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
    Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from "@shopify/flash-list";
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { useGlobalContext } from '@/lib/global-provider';
import { useChatRoom } from '@/hooks/useChatRoom';

// --- COMPONENT CON: HIỂN THỊ 1 TIN NHẮN ---
const MessageItem = ({ item, isMine, otherUserAvatar }: { item: any, isMine: boolean, otherUserAvatar?: string }) => {
    return (
        <View className={`flex-row mb-3 px-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {!isMine && (
                <Image
                    source={otherUserAvatar || 'https://via.placeholder.com/40'}
                    style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, alignSelf: 'flex-end' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
            )}

            <View className={`max-w-[75%] p-3 rounded-2xl ${
                isMine ? 'bg-blue-600 rounded-tr-none' : 'bg-gray-100 rounded-tl-none'
            }`}>
                {item.image && (
                    <Image
                        source={item.image}
                        style={{ width: 200, height: 200, borderRadius: 8, marginBottom: item.text ? 5 : 0 }}
                        contentFit="cover"
                        transition={200}
                    />
                )}

                {item.text ? (
                    <Text className={`${isMine ? 'text-white' : 'text-gray-800'} text-base`}>
                        {item.text}
                    </Text>
                ) : null}

                <View className="flex-row items-center justify-end mt-1 space-x-1">
                    <Text className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                         {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                    {isMine && (
                        <Ionicons
                            name={item.status === 'sent' ? "checkmark-done-outline" : item.status === 'error' ? "alert-circle" : "time-outline"}
                            size={12}
                            color={item.status === 'error' ? '#fca5a5' : 'white'}
                            style={{ opacity: 0.8, marginLeft: 4 }}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

// --- MÀN HÌNH CHÍNH ---
const ChatRoomScreen = () => {
    const {
        id: chatId,
        otherUserId,
        otherUserName,
        otherUserAvatar,
        contextPropertyName,
        contextPropertyPrice,
        contextPropertyImage
    } = useLocalSearchParams<{
        id: string, otherUserId: string, otherUserName?: string, otherUserAvatar?: string,
        contextPropertyName?: string, contextPropertyPrice?: string, contextPropertyImage?: string
    }>();

    const { user } = useGlobalContext();
    const [inputText, setInputText] = useState('');

    // Tạo Ref để điều khiển cuộn
    const listRef = useRef<FlashList<any>>(null);

    const { messages, isLoading, sendMessage } = useChatRoom(
        chatId,
        user?.$id || '',
        otherUserId || ''
    );

    // --- LOGIC SẮP XẾP MỚI: TĂNG DẦN (CŨ TRÊN -> MỚI DƯỚI) ---
    const sortedMessages = useMemo(() => {
        return [...messages].sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeA - timeB; // Cũ (nhỏ) trừ Mới (lớn) -> Tăng dần
        });
    }, [messages]);

    // Hàm tự động cuộn xuống đáy
    const scrollToEnd = () => {
        setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    // Khi có tin nhắn mới -> Cuộn xuống đáy
    useEffect(() => {
        if (messages.length > 0) {
            scrollToEnd();
        }
    }, [messages.length]);

    const onSend = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText.trim());
        setInputText('');
        scrollToEnd(); // Gửi xong cuộn xuống ngay
    };

    const onPickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });
            if (!result.canceled) {
                sendMessage('', result.assets[0].uri);
                scrollToEnd();
            }
        } catch (e) {
            console.log("Hủy chọn ảnh");
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>

            {/* Header */}
            <View className="border-b border-gray-100 bg-white z-10 pb-2">
                <View className="flex-row items-center px-4 py-2">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>

                    <Image
                        source={otherUserAvatar || 'https://via.placeholder.com/40'}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                        contentFit="cover"
                    />
                    <Text className="text-lg font-bold text-gray-800 ml-3 flex-1" numberOfLines={1}>
                        {otherUserName || 'Người dùng'}
                    </Text>
                </View>

                {contextPropertyName && (
                    <View className="mx-4 mt-1 flex-row bg-blue-50 p-2 rounded-lg items-center border border-blue-100 shadow-sm">
                        <Image
                            source={contextPropertyImage || 'https://via.placeholder.com/50'}
                            style={{width: 40, height: 40, borderRadius: 6}}
                            contentFit="cover"
                        />
                        <View className="ml-3 flex-1">
                            <Text numberOfLines={1} className="font-bold text-gray-700 text-xs uppercase">Đang trao đổi về:</Text>
                            <Text numberOfLines={1} className="font-medium text-gray-900">{contextPropertyName}</Text>
                            <Text className="text-blue-600 font-bold text-xs">{contextPropertyPrice ? `${parseInt(contextPropertyPrice).toLocaleString()} ₫` : 'Liên hệ'}</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* MESSAGE LIST (CÁCH TIẾP CẬN MỚI) */}
            {isLoading && messages.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0061FF" />
                </View>
            ) : (
                <View className="flex-1 bg-gray-50">
                    <FlashList
                        ref={listRef} // Gắn ref để điều khiển cuộn
                        data={sortedMessages}
                        renderItem={({ item }) => (
                            <MessageItem
                                item={item}
                                isMine={item.user._id === user?.$id}
                                otherUserAvatar={otherUserAvatar}
                            />
                        )}
                        estimatedItemSize={80}

                        // QUAN TRỌNG: Tắt inverted
                        inverted={false}

                        contentContainerStyle={{ paddingVertical: 15 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}

                        // Khi bàn phím hiện lên hoặc list thay đổi size -> Cuộn xuống đáy
                        onContentSizeChange={scrollToEnd}
                        onLayout={scrollToEnd}
                    />
                </View>
            )}

            {/* INPUT BAR */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
            >
                <View className="flex-row items-center p-3 border-t border-gray-200 bg-white">
                    <TouchableOpacity onPress={onPickImage} className="p-2 mr-1">
                        <Ionicons name="image-outline" size={28} color="#0061FF" />
                    </TouchableOpacity>

                    <TextInput
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-base min-h-[45px] max-h-[100px]"
                        multiline
                        onFocus={scrollToEnd} // Khi bấm vào input -> Cuộn xuống
                    />

                    <TouchableOpacity onPress={onSend} disabled={!inputText.trim()} className={`ml-2 w-10 h-10 rounded-full justify-center items-center ${inputText.trim() ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ChatRoomScreen;