/**
 * BIDDING SCHEDULER - Tự động xử lý các tin đã hết hạn bidding
 * 
 * Module này cung cấp các hàm để:
 * 1. Kiểm tra và xử lý các tin đã hết hạn bidding
 * 2. Chạy định kỳ trong app (mỗi 5 phút)
 * 3. Có thể được gọi thủ công khi cần
 */

import { checkAndProcessAllExpiredBiddings } from './api/broker';

let schedulerInterval: NodeJS.Timeout | null = null;
let lastCheckTime: Date | null = null;

/**
 * Bắt đầu chạy scheduler định kỳ
 * Kiểm tra và xử lý các tin hết hạn bidding mỗi 5 phút
 */
export function startBiddingScheduler() {
    // Nếu đã chạy rồi thì không khởi động lại
    if (schedulerInterval) {
        console.log('⚠️ Bidding scheduler đã đang chạy');
        return;
    }

    console.log('🚀 Khởi động Bidding Scheduler');
    
    // Chạy ngay lần đầu tiên
    checkExpiredBiddings();
    
    // Sau đó chạy mỗi 5 phút (300000ms)
    schedulerInterval = setInterval(() => {
        checkExpiredBiddings();
    }, 5 * 60 * 1000); // 5 phút
}

/**
 * Dừng scheduler
 */
export function stopBiddingScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('🛑 Đã dừng Bidding Scheduler');
    }
}

/**
 * Kiểm tra và xử lý các tin hết hạn bidding
 * Có thể được gọi thủ công hoặc tự động từ scheduler
 */
export async function checkExpiredBiddings() {
    try {
        const now = new Date();
        console.log(`🔍 [${now.toLocaleString('vi-VN')}] Kiểm tra tin hết hạn bidding...`);
        
        const result = await checkAndProcessAllExpiredBiddings();
        
        lastCheckTime = now;
        
        if (result.processed > 0) {
            console.log(`✅ Đã xử lý ${result.processed} tin hết hạn bidding`);
        } else {
            console.log('✓ Không có tin nào hết hạn');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Lỗi khi kiểm tra bidding:', error);
        return { processed: 0, error };
    }
}

/**
 * Lấy thông tin trạng thái scheduler
 */
export function getSchedulerStatus() {
    return {
        isRunning: schedulerInterval !== null,
        lastCheckTime: lastCheckTime?.toLocaleString('vi-VN') || 'Chưa chạy',
    };
}

/**
 * Reset scheduler (dừng và khởi động lại)
 */
export function resetBiddingScheduler() {
    stopBiddingScheduler();
    startBiddingScheduler();
}
