import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from 'react-native';

interface Property {
    $id: string;
    name: string;
    price: number;
    area: number;
    bedrooms: number;
    bathrooms: number;
    address: string;
    image: string;
    type: string;
    facilities: string[];
    // New fields
    region?: string;
    direction?: string;
    floors?: number;
    roadWidth?: number;
    depth?: number;
    frontage?: number;
}

interface ComparisonContextType {
    compareList: Property[];
    addToCompare: (property: Property) => void;
    removeFromCompare: (id: string) => void;
    clearCompare: () => void;
    isInCompare: (id: string) => boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export const ComparisonProvider = ({ children }: { children: ReactNode }) => {
    const [compareList, setCompareList] = useState<Property[]>([]);

    const addToCompare = (property: Property) => {
        if (compareList.length >= 2) {
            Alert.alert("Giới hạn so sánh", "Bạn chỉ có thể so sánh tối đa 2 bất động sản cùng lúc.");
            return;
        }
        if (compareList.find(item => item.$id === property.$id)) {
            Alert.alert("Thông báo", "Bất động sản này đã có trong danh sách so sánh.");
            return;
        }
        setCompareList([...compareList, property]);
        Alert.alert("Đã thêm", "Đã thêm vào danh sách so sánh.");
    };

    const removeFromCompare = (id: string) => {
        setCompareList(compareList.filter(item => item.$id !== id));
    };

    const clearCompare = () => {
        setCompareList([]);
    };

    const isInCompare = (id: string) => {
        return compareList.some(item => item.$id === id);
    };

    return (
        <ComparisonContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
            {children}
        </ComparisonContext.Provider>
    );
};

export const useComparisonContext = () => {
    const context = useContext(ComparisonContext);
    if (!context) {
        throw new Error('useComparisonContext must be used within a ComparisonProvider');
    }
    return context;
};
