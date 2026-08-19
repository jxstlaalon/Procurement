export const UNASSIGNED_CATEGORY = { id: '_unassigned', label: 'Unassigned' };

export const ITEM_CATEGORIES = [
  { id: 'stationery', label: 'Stationery' },
  { id: 'office', label: 'Office Supplies' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'other', label: 'Other' },
];

export const STOCK_UNITS = [
  { id: 'each', label: 'Each' },
  { id: 'box', label: 'Box' },
  { id: 'ream', label: 'Ream' },
  { id: 'pack', label: 'Pack' },
  { id: 'bottle', label: 'Bottle' },
  { id: 'cart', label: 'Carton' },
  { id: 'roll', label: 'Roll' },
  { id: 'bag', label: 'Bag' },
];

export const STOCK_ADJUSTMENT_REASONS = [
  'Restock',
  'Damaged',
  'Correction',
  'Other',
];

export const ORDER_STATUSES = [
  { id: 'pending', label: 'Pending', color: 'gold' },
  { id: 'ready', label: 'Ready', color: 'success' },
  { id: 'picked_up', label: 'Picked Up', color: 'mute' },
  { id: 'cancelled', label: 'Cancelled', color: 'danger' },
];
