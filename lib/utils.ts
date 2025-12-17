export const formatStatus = (status: string) => {
    switch (status) {
        case 'pending_approval': return 'Chờ duyệt';
        case 'reviewing': return 'Đang xem xét';
        case 'approved': return 'Đang bán';
        case 'deposit_paid': return 'Đã cọc';
        case 'sold': return 'Đã bán';
        case 'rejected': return 'Bị từ chối';
        case 'expired': return 'Hết hạn';
        case 'available': return 'Còn trống';
        case 'for_sale': return 'Đang bán';
        default: return status;
    }
};

export const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending_approval': return '#f0ad4e';
        case 'reviewing': return '#17a2b8';
        case 'approved': return '#5cb85c';
        case 'deposit_paid': return '#337ab7';
        case 'sold': return '#d9534f';
        case 'rejected': return '#777';
        case 'expired': return '#777';
        case 'available': return '#28a745';
        case 'for_sale': return '#5cb85c';
        default: return '#777';
    }
};

export const formatCurrency = (amount: number): string => {
    if (!amount && amount !== 0) return '';
    if (amount >= 1000000000) {
        const ty = amount / 1000000000;
        return `${ty % 1 === 0 ? ty : ty.toFixed(1)} tỷ`;
    }
    if (amount >= 1000000) {
        const trieu = amount / 1000000;
        return `${trieu % 1 === 0 ? trieu : trieu.toFixed(1)} triệu`;
    }
    return amount.toLocaleString('vi-VN');
};
