import { getPriceHistory } from '@/lib/api/seller';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface PriceHistoryRecord {
    $id: string;
    $createdAt: string;
    propertyId: string;
    oldPrice: number;
    newPrice: number;
    changedBy: string;
    reason?: string;
    changedAt: string;
}

interface PriceHistoryProps {
    propertyId: string;
}

export default function PriceHistory({ propertyId }: PriceHistoryProps) {
    const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getPriceHistory({ propertyId });
            setHistory(data as unknown as PriceHistoryRecord[]);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử giá:', error);
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#007BFF" />
            </View>
        );
    }

    if (history.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.emptyText}>Chưa có lịch sử thay đổi giá</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📊 Lịch sử thay đổi giá</Text>
            {history.map((record) => {
                const priceChange = record.newPrice - record.oldPrice;
                const priceChangePercent = ((priceChange / record.oldPrice) * 100);
                const priceChangePercentFormatted = Math.abs(priceChangePercent).toFixed(2);
                const isIncrease = priceChange > 0;

                return (
                    <View key={record.$id} style={styles.historyCard}>
                        <View style={styles.headerRow}>
                            <Text style={styles.dateText}>
                                {new Date(record.changedAt).toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                            <View style={[
                                styles.changeBadge,
                                isIncrease ? styles.increaseBadge : styles.decreaseBadge
                            ]}>
                                <Text style={styles.changeText}>
                                    {isIncrease ? '↑' : '↓'} {priceChangePercentFormatted}%
                                </Text>
                            </View>
                        </View>

                        <View style={styles.priceRow}>
                            <View style={styles.priceItem}>
                                <Text style={styles.priceLabel}>Giá cũ:</Text>
                                <Text style={styles.oldPrice}>
                                    {record.oldPrice.toLocaleString('vi-VN')} VND
                                </Text>
                            </View>
                            <Text style={styles.arrow}>→</Text>
                            <View style={styles.priceItem}>
                                <Text style={styles.priceLabel}>Giá mới:</Text>
                                <Text style={styles.newPrice}>
                                    {record.newPrice.toLocaleString('vi-VN')} VND
                                </Text>
                            </View>
                        </View>

                        {record.reason && (
                            <View style={styles.reasonContainer}>
                                <Text style={styles.reasonLabel}>Lý do:</Text>
                                <Text style={styles.reasonText}>{record.reason}</Text>
                            </View>
                        )}

                        <View style={styles.divider} />
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 0,
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
    },
    historyCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    changeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    increaseBadge: {
        backgroundColor: '#d4edda',
    },
    decreaseBadge: {
        backgroundColor: '#f8d7da',
    },
    changeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#155724',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    priceItem: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    oldPrice: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    arrow: {
        fontSize: 20,
        color: '#007BFF',
        marginHorizontal: 12,
    },
    newPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007BFF',
    },
    reasonContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    reasonLabel: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
    reasonText: {
        fontSize: 14,
        color: '#333',
        fontStyle: 'italic',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginTop: 12,
    },
});

