import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';

export async function pickAndUploadGymPhoto(gymId: string, userId: string | null) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== ImagePicker.PermissionStatus.GRANTED) {
    throw new Error('Du behöver ge åtkomst till foton');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    quality: 0.7,
    exif: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();
  const filePath = `${gymId}/${Date.now()}.jpg`;

  const { error: storageError } = await supabase.storage
    .from('gym-photos')
    .upload(filePath, blob, { contentType: 'image/jpeg', cacheControl: '3600' });

  if (storageError) {
    throw storageError;
  }

  await supabase.from('photos').insert({
    gym_id: gymId,
    name: filePath,
    authors: userId ? JSON.stringify([{ user_id: userId }]) : null,
    widthPx: manipulated.width,
    heightPx: manipulated.height,
  });

  return filePath;
}
