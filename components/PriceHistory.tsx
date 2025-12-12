import { getPriceHistory } from '@/lib/api/seller';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Dimensions, ScrollView } from 'react-native';
import { formatCurrency } from '@/lib/utils';

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

const ChartBar = ({ price, maxPrice, minPrice, date, isLatest }: { price: number, maxPrice: number, minPrice: number, date: string, isLatest: boolean }) => {
    // Tính toán chiều cao tương đối
    // Base height là 20% để cột không quá thấp
    const range = maxPrice - minPrice || 1; // Avoid divide by zero
    const relativeHeight = ((price - minPrice) / range) * 60 + 20; // 20% -> 80% height

    return (
        <View style={styles.chartBarContainer}>
            <Text style={styles.chartBarLabel}>
                {(price / 1000000000).toFixed(1)}T
            </Text>
            <View 
                style={[
                    styles.chartBar, 
                    { height: `${relativeHeight}%` },
                    isLatest ? styles.chartBarLatest : styles.chartBarNormal
                ]} 
            />
            <Text style={styles.chartDateLabel}>
                {new Date(date).toLocaleDateString('vi-VN', { month: 'numeric', year: '2-digit' })}
            </Text>
        </View>
    );
};

export default function PriceHistory({ propertyId }: PriceHistoryProps) {
    const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getPriceHistory({ propertyId });
            // Sort by date ascending for the chart
            const sortedData = (data as unknown as PriceHistoryRecord[]).sort((a, b) => 
                new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
            );
            setHistory(sortedData);
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
                <ActivityIndicator size="large" color="#0061FF" />
            </View>
        );
    }

    if (history.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Biến động giá</Text>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Chưa có dữ liệu biến động giá</Text>
                </View>
            </View>
        );
    }

    // Chart Data Preparation
    // Lấy giá trị ban đầu (oldPrice của record đầu tiên) + newPrice của tất cả record
    const chartPoints = [
        { 
            price: history[0].oldPrice, 
            date: history[0].changedAt, 
            id: 'initial' 
        },
        ...history.map(h => ({ 
            price: h.newPrice, 
            date: h.changedAt, 
            id: h.$id 
        }))
    ];

    const prices = chartPoints.map(p => p.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Biến động giá</Text>
            
            {/* Chart Area */}
            <View style={styles.chartContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chartInner}>
                        {chartPoints.map((point, index) => (
                            <ChartBar 
                                key={point.id}
                                price={point.price}
                                maxPrice={maxPrice}
                                minPrice={minPrice}
                                date={point.date}
                                isLatest={index === chartPoints.length - 1}
                            />
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Detailed List (Reversed for timeline view) */}
            <View style={styles.listContainer}>
                {[...history].reverse().map((record) => {
                    const priceChange = record.newPrice - record.oldPrice;
                    const priceChangePercent = ((priceChange / record.oldPrice) * 100);
                    const isIncrease = priceChange > 0;

                    return (
                        <View key={record.$id} style={styles.historyCard}>
                            <View style={styles.row}>
                                <Text style={styles.dateText}>
                                    {new Date(record.changedAt).toLocaleDateString('vi-VN')}
                                </Text>
                                <View style={[
                                    styles.badge,
                                    isIncrease ? styles.badgeIncrease : styles.badgeDecrease
                                ]}>
                                    <Text style={[
                                        styles.badgeText,
                                        isIncrease ? styles.textIncrease : styles.textDecrease
                                    ]}>
                                        {isIncrease ? '▲' : '▼'} {Math.abs(priceChangePercent).toFixed(1)}%
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.priceRow}>
                                <Text style={styles.oldPrice}>
                                    {formatCurrency(record.oldPrice)}
                                </Text>
                                <Text style={styles.arrow}>→</Text>
                                <Text style={styles.newPrice}>
                                    {formatCurrency(record.newPrice)}
                                </Text>
                            </View>
                            
                            {record.reason && (
                                <Text style={styles.reasonText}>"{record.reason}"</Text>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
        paddingHorizontal: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#191D31',
        marginBottom: 16,
    },
    chartContainer: {
        height: 180,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    chartInner: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: '100%',
        minWidth: '100%',
        gap: 12,
    },
    chartBarContainer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 40,
        height: '100%',
    },
    chartBar: {
        width: 12,
        borderRadius: 6,
        backgroundColor: '#E2E8F0',
    },
    chartBarLatest: {
        backgroundColor: '#0061FF',
        width: 16,
    },
    chartBarNormal: {
        backgroundColor: '#94A3B8',
    },
    chartBarLabel: {
        fontSize: 10,
        color: '#64748B',
        marginBottom: 4,
        fontWeight: '600',
    },
    chartDateLabel: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 8,
    },
    listContainer: {
        gap: 12,
    },
    historyCard: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dateText: {
        color: '#64748B',
        fontSize: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeIncrease: { backgroundColor: '#DCFCE7' },
    badgeDecrease: { backgroundColor: '#FEE2E2' },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    textIncrease: { color: '#16A34A' },
    textDecrease: { color: '#DC2626' },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    oldPrice: {
        textDecorationLine: 'line-through',
        color: '#94A3B8',
        fontSize: 14,
    },
    arrow: {
        color: '#64748B',
    },
    newPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#191D31',
    },
    reasonText: {
        marginTop: 8,
        fontSize: 12,
        fontStyle: 'italic',
        color: '#64748B',
    },
    emptyContainer: {
        backgroundColor: '#F8F9FA',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
        fontStyle: 'italic',
    }
});

