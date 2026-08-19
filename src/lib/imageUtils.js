import heic2any from 'heic2any';

export async function compressImageToSizeLimit(file, maxBytes = 51200) {
  if (file.size <= maxBytes) return file;

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load image for compression'));
    el.src = URL.createObjectURL(file);
  });

  let { naturalWidth: w, naturalHeight: h } = img;
  const maxDim = 800;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);

  let quality = 0.8;
  let blob;
  while (quality >= 0.1) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob.size <= maxBytes) break;
    quality -= 0.05;
  }

  console.log(`[COMPRESS] ${file.name}: ${Math.round(file.size / 1024)}KB -> ${Math.round(blob.size / 1024)}KB (quality: ${quality})`);
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

export function getCroppedImg(imageSrc, croppedArea) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;
        const x = (croppedArea.x / 100) * naturalWidth;
        const y = (croppedArea.y / 100) * naturalHeight;
        const width = (croppedArea.width / 100) * naturalWidth;
        const height = (croppedArea.height / 100) * naturalHeight;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.9);
      } catch (err) {
        reject(err);
      }
    };
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = imageSrc;
  });
}

export async function convertHeicToJpeg(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
    || ext === 'heic' || ext === 'heif';

  if (isHeic) {
    try {
      const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    } catch (err) {
      console.error('HEIC conversion failed, uploading as-is:', err);
      return file;
    }
  }
  return file;
}
