import { useState, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { C, FONT_DISPLAY, FONT_BODY } from './theme';
import { getCroppedImg, convertHeicToJpeg } from '../lib/imageUtils';
import Modal from './Modal';

export default function ImageCropModal({ onConfirm, onCancel }) {
  const [step, setStep] = useState('choose');
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      let blob = file;
      const ext = file.name.split('.').pop().toLowerCase();
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
        || ext === 'heic' || ext === 'heif';
      if (isHeic) {
        blob = await convertHeicToJpeg(file);
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
        setStep('crop');
        setLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('File read error:', err);
      setLoading(false);
    }
    e.target.value = '';
  };

  const onCropComplete = (cropped) => {
    setCroppedArea(cropped);
  };

  const handleConfirm = async () => {
    if (!croppedArea || !imageSrc) return;
    setLoading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedArea);
      const file = new File([blob], 'item.jpg', { type: 'image/jpeg' });
      onConfirm(file);
    } catch (err) {
      console.error('Crop error:', err);
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onCancel} maxWidth={380}>
      <div style={{ padding: 0, width: '100%' }}>
        <h3 style={{
          margin: '0 0 16px', fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 500, color: C.ink,
        }}>
          Item Photo
        </h3>

        {step === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              onClick={() => !loading && cameraInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                background: C.softBg, border: `1px solid ${C.lineStrong}`, borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .15s',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Camera size={20} style={{ color: C.primary }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>
                  {loading ? 'Loading...' : 'Take Photo'}
                </div>
                <div style={{ fontSize: 11, color: C.mute }}>Use your device camera</div>
              </div>
            </div>
            <div
              onClick={() => !loading && uploadInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                background: C.softBg, border: `1px solid ${C.lineStrong}`, borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .15s',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <ImageIcon size={20} style={{ color: C.primary }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.ink }}>
                  {loading ? 'Loading...' : 'Upload Image'}
                </div>
                <div style={{ fontSize: 11, color: C.mute }}>Choose from your files</div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/octet-stream"
          onChange={handleFile}
          style={{ display: 'none' }}
        />

        {step === 'crop' && (
          <div>
            <div style={{
              position: 'relative', width: '100%', height: 280,
              background: '#1a1a1a', borderRadius: 10, overflow: 'hidden',
            }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: C.mute, fontFamily: FONT_BODY }}>Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => { setStep('choose'); setImageSrc(null); }}
                style={{
                  flex: 1, padding: '10px 14px', background: C.card, color: C.ink,
                  border: `1px solid ${C.lineStrong}`, borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, fontFamily: FONT_BODY,
                }}>
                Back
              </button>
              <button type="button" onClick={handleConfirm} disabled={loading}
                style={{
                  flex: 1, padding: '10px 14px', background: C.primary, color: C.card,
                  border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, opacity: loading ? 0.6 : 1,
                }}>
                {loading ? 'Processing...' : 'Use Photo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
