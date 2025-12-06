import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import icons from "@/constants/icons";
import { Image } from 'react-native';

interface MortgageCalculatorProps {
    propertyPrice: number;
}

const MortgageCalculator = ({ propertyPrice }: MortgageCalculatorProps) => {
    // Default: Loan 70% of value, 8% interest, 20 years
    const [loanAmount, setLoanAmount] = useState((propertyPrice * 0.7).toString());
    const [interestRate, setInterestRate] = useState('8');
    const [loanTerm, setLoanTerm] = useState('20');
    const [monthlyPayment, setMonthlyPayment] = useState<number>(0);

    const calculateMortgage = () => {
        const principal = parseFloat(loanAmount.replace(/[^0-9.]/g, ''));
        const rate = parseFloat(interestRate) / 100 / 12;
        const term = parseFloat(loanTerm) * 12;

        if (principal > 0 && rate > 0 && term > 0) {
            // Formula: M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1 ]
            const x = Math.pow(1 + rate, term);
            const monthly = (principal * x * rate) / (x - 1);
            setMonthlyPayment(monthly);
        } else {
            setMonthlyPayment(0);
        }
    };

    useEffect(() => {
        calculateMortgage();
    }, [propertyPrice]); // Recalculate if property price changes (initial load)

    return (
        <View className="mt-7 bg-white p-5 rounded-2xl border border-primary-100 shadow-sm">
            <View className="flex-row items-center gap-2 mb-4">
                <Image source={icons.wallet} className="size-6" tintColor="#0061FF"/>
                <Text className="text-xl font-rubik-bold text-black-300">
                    Tính lãi suất vay
                </Text>
            </View>

            <View className="gap-4">
                <View>
                    <Text className="text-black-200 font-rubik-medium mb-2">Số tiền vay (VNĐ)</Text>
                    <TextInput
                        className="bg-gray-50 p-3 rounded-xl font-rubik text-black-300 border border-gray-200"
                        keyboardType="numeric"
                        value={loanAmount}
                        onChangeText={setLoanAmount}
                    />
                </View>

                <View className="flex-row gap-4">
                    <View className="flex-1">
                        <Text className="text-black-200 font-rubik-medium mb-2">Lãi suất (%/năm)</Text>
                        <TextInput
                            className="bg-gray-50 p-3 rounded-xl font-rubik text-black-300 border border-gray-200"
                            keyboardType="numeric"
                            value={interestRate}
                            onChangeText={setInterestRate}
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-black-200 font-rubik-medium mb-2">Thời hạn (năm)</Text>
                        <TextInput
                            className="bg-gray-50 p-3 rounded-xl font-rubik text-black-300 border border-gray-200"
                            keyboardType="numeric"
                            value={loanTerm}
                            onChangeText={setLoanTerm}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={calculateMortgage}
                    className="bg-primary-300 py-3 rounded-xl mt-2"
                >
                    <Text className="text-white font-rubik-bold text-center">Tính toán</Text>
                </TouchableOpacity>

                {monthlyPayment > 0 && (
                    <View className="mt-4 bg-primary-50 p-4 rounded-xl items-center">
                        <Text className="text-black-200 font-rubik mb-1">Trả hàng tháng ước tính</Text>
                        <Text className="text-primary-300 text-xl font-rubik-bold">
                            {monthlyPayment.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

export default MortgageCalculator;
