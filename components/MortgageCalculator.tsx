import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import icons from "@/constants/icons";
import { Image } from 'react-native';

interface MortgageCalculatorProps {
    propertyPrice: number;
}

const MortgageCalculator = ({ propertyPrice }: MortgageCalculatorProps) => {
    // Default: Loan 70% of value, 8% interest, 20 years
    const [percentage, setPercentage] = useState(70);
    const [loanAmount, setLoanAmount] = useState(Math.round(propertyPrice * 0.7).toString());
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

    // Khi chọn nút phần trăm
    const handlePercentageChange = (newPercentage: number) => {
        setPercentage(newPercentage);
        const newLoanAmount = Math.round(propertyPrice * (newPercentage / 100));
        setLoanAmount(newLoanAmount.toString());
    };

    // Khi sửa trực tiếp ô input phần trăm
    const handleCustomPercentageChange = (text: string) => {
        const val = parseFloat(text);
        if (!isNaN(val)) {
            if (val > 100) {
                setPercentage(100);
                setLoanAmount(propertyPrice.toString());
            } else {
                setPercentage(val);
                setLoanAmount(Math.round(propertyPrice * (val / 100)).toString());
            }
        } else {
             setPercentage(0);
             setLoanAmount('0');
        }
    };

    // Khi sửa trực tiếp số tiền vay -> cập nhật ngược lại % (tương đối)
    const handleLoanAmountChange = (text: string) => {
        setLoanAmount(text);
        const val = parseFloat(text.replace(/[^0-9.]/g, ''));
        if (!isNaN(val) && propertyPrice > 0) {
            const newPerc = (val / propertyPrice) * 100;
            setPercentage(parseFloat(newPerc.toFixed(1)));
        }
    };

    useEffect(() => {
        calculateMortgage();
    }, [loanAmount, interestRate, loanTerm]); 
    // Auto calculate when inputs change, not just on mount

    useEffect(() => {
        // Reset when property price changes
        handlePercentageChange(70);
    }, [propertyPrice]);

    return (
        <View className="mt-7 bg-white p-5 rounded-2xl border border-primary-100 shadow-sm">
            <View className="flex-row items-center gap-2 mb-4">
                <Image source={icons.wallet} className="size-6" tintColor="#0061FF"/>
                <Text className="text-xl font-rubik-bold text-black-300">
                    Tính lãi suất vay
                </Text>
            </View>

            <View className="gap-4">
                {/* Phần trăm vay */}
                <View>
                    <Text className="text-black-200 font-rubik-medium mb-2">Tỷ lệ vay (%)</Text>
                    <View className="flex-row gap-2 mb-3 flex-wrap">
                        {[30, 50, 70, 100].map((p) => (
                            <TouchableOpacity
                                key={p}
                                onPress={() => handlePercentageChange(p)}
                                className={`px-4 py-2 rounded-full border ${
                                    percentage === p 
                                    ? 'bg-primary-300 border-primary-300' 
                                    : 'bg-white border-primary-100'
                                }`}
                            >
                                <Text className={`font-rubik-medium text-sm ${
                                    percentage === p ? 'text-white' : 'text-black-200'
                                }`}>
                                    {p}%
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View className="flex-row items-center gap-2">
                         <Text className="text-black-200 font-rubik text-sm">Tùy chỉnh:</Text>
                         <TextInput
                            className="bg-gray-50 p-2 rounded-lg font-rubik text-black-300 border border-gray-200 w-20 text-center"
                            keyboardType="numeric"
                            value={percentage.toString()}
                            onChangeText={handleCustomPercentageChange}
                            maxLength={5}
                        />
                         <Text className="text-black-200 font-rubik text-sm">%</Text>
                    </View>
                </View>

                <View>
                    <Text className="text-black-200 font-rubik-medium mb-2">Số tiền vay (VNĐ)</Text>
                    <TextInput
                        className="bg-gray-50 p-3 rounded-xl font-rubik text-black-300 border border-gray-200"
                        keyboardType="numeric"
                        value={loanAmount ? Number(loanAmount).toLocaleString('en-US').replace(/,/g, '') : ''} // Display raw number for editing, simplified
                        onChangeText={handleLoanAmountChange}
                    />
                    {/* Helper text hiển thị số tiền đẹp */}
                    {loanAmount && !isNaN(parseFloat(loanAmount)) && (
                         <Text className="text-xs text-gray-500 mt-1 text-right italic">
                             {parseFloat(loanAmount).toLocaleString('vi-VN')} VNĐ
                         </Text>
                    )}
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
