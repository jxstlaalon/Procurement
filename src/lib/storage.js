import { supabase } from './supabase';
import { compressImageToSizeLimit, convertHeicToJpeg } from './imageUtils';

const BUCKET = 'inventory-images';

export const uploadInventoryImage = async (file, itemId) => {
  let uploadFile = file;

  uploadFile = await convertHeicToJpeg(uploadFile);
  uploadFile = await compressImageToSizeLimit(uploadFile);

  const path = `${itemId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, uploadFile, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl + '?t=' + Date.now();
};

export const deleteInventoryImage = async (itemId) => {
  const { data: files } = await supabase.storage.from(BUCKET).list();
  const matching = files?.filter(f => f.name.startsWith(itemId)) || [];

  for (const file of matching) {
    const ext = file.name.split('.').pop();
    await supabase.storage.from(BUCKET).remove([`${itemId}.${ext}`]);
  }
};
