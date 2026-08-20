import { useState, useEffect } from 'react';
import { C, FONT_BODY } from '../shared/theme';
import { usePreventWheel } from '../shared/helpers';
import { uploadInventoryImage } from '../lib/storage';
import { Image, X } from 'lucide-react';
import ImageCropModal from '../shared/ImageCropModal';

export default function ItemForm({ item, categories, units, onSave, onCancel }) {
  const [code, setCode] = useState(item?.code || '');
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState(item?.category || 'stationery');
  const [unitPrice, setUnitPrice] = useState(item?.unit_price ?? '');
  const [stockCount, setStockCount] = useState(item?.stock_count ?? '');
  const [lowStockThreshold, setLowStockThreshold] = useState(item?.low_stock_threshold ?? 10);
  const [unit, setUnit] = useState(item?.unit || 'each');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);

  const priceRef = usePreventWheel();
  const stockRef = usePreventWheel();
  const thresholdRef = usePreventWheel();

  useEffect(() => {
    if (item) {
      setCode(item.code || '');
      setName(item.name || '');
      setDescription(item.description || '');
      setCategory(item.category || 'stationery');
      setUnitPrice(item.unit_price ?? '');
      setStockCount(item.stock_count ?? '');
      setLowStockThreshold(item.low_stock_threshold ?? 10);
      setUnit(item.unit || 'each');
      setImageUrl(item.image_url || '');
    }
  }, [item?.id]);

  const canSave = name.trim() && unitPrice !== '' && stockCount !== '';

  const handleCropConfirm = (file) => {
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setShowCropModal(false);
  };

  const removeImage = () => {
    setImageFile(null);
    setImageUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;

    setUploading(true);
    let finalImageUrl = imageUrl;

    try {
      if (imageFile) {
        const tempId = item?.id || crypto.randomUUID();
        finalImageUrl = await uploadInventoryImage(imageFile, tempId);
      }

      onSave({
        id: item?.id,
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        category,
        unit_price: parseFloat(unitPrice) || 0,
        stock_count: parseInt(stockCount, 10) || 0,
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 10,
        unit,
        image_url: finalImageUrl || '',
      });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.lineStrong}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: C.ink,
    background: C.card,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    color: C.mute,
    fontWeight: 500,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  };

  return (
    <form onSubmit={handleSubmit}>
      <style>{`
        .item-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) { .item-form-grid { grid-template-columns: 1fr; } }
      `}</style>
      {showCropModal && (
        <ImageCropModal onConfirm={handleCropConfirm} onCancel={() => setShowCropModal(false)} />
      )}

      <div className="item-form-grid">
        <div>
          <label style={labelStyle}>Code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Item code (optional)" style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Item Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" style={inputStyle} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the item"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
          />
        </div>

        {/* Image Upload */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Item Image</label>
          {imageUrl ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={imageUrl} alt="Preview" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.lineStrong}` }} />
              <button type="button" onClick={removeImage}
                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: C.danger, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={12} style={{ color: '#fff' }} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setShowCropModal(true)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                width: 120, height: 120, border: `2px dashed ${C.lineStrong}`, borderRadius: 8,
                cursor: 'pointer', color: C.mute,
              }}
            >
              <Image size={24} style={{ marginBottom: 4 }} />
              <span style={{ fontSize: 10 }}>Upload</span>
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {(units || []).map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Unit Price *</label>
          <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} min="0" step="0.01" placeholder="0.00" style={inputStyle} ref={priceRef} />
        </div>

        <div>
          <label style={labelStyle}>Stock Count *</label>
          <input type="number" value={stockCount} onChange={(e) => setStockCount(e.target.value)} min="0" style={inputStyle} ref={stockRef} />
        </div>

        <div>
          <label style={labelStyle}>Low Stock Alert At</label>
          <input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} min="0" style={inputStyle} ref={thresholdRef} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" onClick={onCancel} style={{
          padding: '10px 20px', background: 'transparent', border: `1px solid ${C.lineStrong}`,
          borderRadius: 8, fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY, color: C.mute, cursor: 'pointer',
        }}>Cancel</button>
        <button type="submit" disabled={!canSave || uploading} style={{
          padding: '10px 24px', background: canSave && !uploading ? C.primary : C.faint, border: 'none',
          borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, color: '#FAF8F3',
          cursor: canSave && !uploading ? 'pointer' : 'not-allowed',
        }}>{uploading ? 'Uploading...' : item ? 'Update Item' : 'Add Item'}</button>
      </div>
    </form>
  );
}
