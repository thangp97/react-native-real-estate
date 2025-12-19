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
    
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    let result = '';

    if (val >= 1000000000) {
        const ty = val / 1000000000;
        result = `${ty % 1 === 0 ? ty : ty.toFixed(2).replace(/\.?0+$/, '')} Tỷ`;
    } else if (val >= 1000000) {
        const trieu = val / 1000000;
        result = `${trieu % 1 === 0 ? trieu : trieu.toFixed(2).replace(/\.?0+$/, '')} Triệu`;
    } else {
        result = val.toLocaleString('vi-VN');
    }

    return `${result} VNĐ`;
};
