import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Button } from 'react-native';

interface ReviewFormProps {
    brokerName?: string;
    onClose?: () => void;
    onSubmit?: (rating: number, comment: string) => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ brokerName = "Môi giới", onClose, onSubmit }) => {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit(rating, comment);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Đánh giá Môi giới</Text>
            
            <Text style={styles.description}>
                Bạn đánh giá thế nào về <Text style={styles.brokerName}>{brokerName}</Text> trong giao dịch này?
            </Text>

            {/* Star Rating */}
            <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Image 
                            source={require('@/assets/icons/star.png')} // Update this path if needed
                            style={[styles.starIcon, { tintColor: star <= rating ? "#FFD700" : "#E0E0E0" }]}
                        />
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.inputLabel}>Nhận xét của bạn:</Text>
            <TextInput 
                style={styles.commentInput}
                placeholder="Môi giới rất nhiệt tình, chuyên nghiệp..."
                multiline
                value={comment}
                onChangeText={setComment}
            />

            <View style={styles.buttonContainer}>
                <Button title="Hủy" onPress={onClose} color="#666" />
                <Button title="Gửi đánh giá" onPress={handleSubmit} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 25,
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        color: '#333',
    },
    description: {
        fontSize: 15,
        color: '#555',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 22,
    },
    brokerName: {
        fontWeight: 'bold',
        color: '#0061FF',
    },
    starContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 25,
    },
    starIcon: {
        width: 40,
        height: 40,
        marginHorizontal: 5,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 25,
        fontSize: 15,
        color: '#333',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
    },
});

export default ReviewForm;
