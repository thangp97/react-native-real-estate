type PropertyStatus = 'pending_approval' | 'for_sale' | 'deposit_paid' | 'sold' | 'rejected' | 'expired' | 'approved' | 'available' | 'reviewing';

export const formatStatus = (status: PropertyStatus) => {
    const statuses: Record<PropertyStatus, string> = {
        'pending_approval': 'Chờ duyệt',
        'for_sale': 'Đang bán',
        'available': 'Đang bán',
        'approved': 'Đang bán',
        'deposit_paid': 'Đã cọc',
        'sold': 'Đã bán',
        'rejected': 'Bị từ chối',
        'expired': 'Hết hạn',
        'reviewing': 'Đang kiểm duyệt'
    };
    return statuses[status] || status;
};

export const getStatusColor = (status: PropertyStatus) => {
    const colors: Record<PropertyStatus, string> = {
        'pending_approval': '#f0ad4e', // Vàng
        'for_sale': '#5cb85c',       // Xanh lá
        'available': '#5cb85c',      // Xanh lá
        'approved': '#5cb85c',       // Xanh lá
        'deposit_paid': '#337ab7',   // Xanh dương
        'sold': '#d9534f',           // Đỏ
        'rejected': '#777',          // Xám
        'expired': '#777',           // Xám
        'reviewing': '#87CEEB'       // Xanh da trời
    };
    return colors[status] || '#777';
};