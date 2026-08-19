import { supabase } from './supabase';

// ==================== INVENTORY ====================

export const getInventory = async () => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const addItem = async (item) => {
  const { data, error } = await supabase
    .from('inventory')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateItem = async (id, updates) => {
  const { data, error } = await supabase
    .from('inventory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteItem = async (id) => {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const adjustStock = async (id, newStock) => {
  const { data, error } = await supabase
    .from('inventory')
    .update({ stock_count: newStock, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const decrementStock = async (itemId, qty) => {
  const { error } = await supabase.rpc('decrement_stock', {
    item_id: itemId,
    qty,
  });
  if (error) throw error;
};

// ==================== ORDERS ====================

export const getOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createOrder = async (order) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateOrder = async (id, updates) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteOrder = async (id) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getNextInvoiceNumber = async () => {
  const { data, error } = await supabase.rpc('increment_invoice_counter');
  if (error) throw error;
  return data;
};

// ==================== UNITS ====================

export const getUnits = async () => {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addUnit = async (unit) => {
  const { data, error } = await supabase
    .from('units')
    .insert(unit)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateUnit = async (id, updates) => {
  const { data, error } = await supabase
    .from('units')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteUnitDb = async (id) => {
  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// ==================== SETTINGS ====================

export const getConfig = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'config')
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const updateConfig = async ({ categories }) => {
  const update = {};
  if (categories !== undefined) update.categories = categories;
  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: 'config', ...update })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ==================== STOCK USAGE ====================

export const logStockUsage = async (data) => {
  const { error } = await supabase
    .from('stock_usage')
    .insert(data);
  if (error) throw error;
};

export const getStockUsage = async (startDate, endDate, direction) => {
  const startMonth = startDate.slice(0, 7);
  const endMonth = endDate.slice(0, 7);
  let query = supabase
    .from('stock_usage')
    .select('*')
    .gte('usage_month', startMonth)
    .lte('usage_month', endMonth);
  if (direction) {
    query = query.eq('direction', direction);
  }
  const { data, error } = await query.order('usage_month');
  if (error) throw error;
  return data || [];
};
