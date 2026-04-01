import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../config/supabase';

/**
 * Service pour l'upload d'images vers Supabase Storage
 */

/**
 * Demande les permissions pour accéder à la galerie
 */
export const requestImagePermissions = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission refusée pour accéder à la galerie');
  }
  return true;
};

/**
 * Sélectionne une image depuis la galerie
 * @returns {Promise<{uri: string, type: string, name: string}>} Informations de l'image
 */
export const pickImage = async () => {
  // Demander les permissions
  await requestImagePermissions();

  // Ouvrir le sélecteur d'image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaType.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return {
    uri: result.assets[0].uri,
    type: result.assets[0].type || 'image',
    name: result.assets[0].fileName || `image_${Date.now()}.jpg`,
  };
};

/**
 * Prend une photo avec l'appareil photo
 * @returns {Promise<{uri: string, type: string, name: string}>} Informations de l'image
 */
export const takePhoto = async () => {
  // Demander les permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permission refusée pour accéder à l\'appareil photo');
  }

  // Ouvrir l'appareil photo
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return {
    uri: result.assets[0].uri,
    type: result.assets[0].type || 'image',
    name: result.assets[0].fileName || `photo_${Date.now()}.jpg`,
  };
};

/**
 * Upload une image vers Supabase Storage
 * @param {string} imageUri - URI locale de l'image
 * @param {string} folder - Dossier dans Supabase Storage (ex: 'events', 'news', 'clubs')
 * @param {string} fileName - Nom du fichier (optionnel)
 * @returns {Promise<string>} URL publique de l'image uploadée
 */
export const uploadImage = async (imageUri, folder = 'general', fileName = null) => {
  try {
    // Vérifier que l'utilisateur est authentifié
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Vous devez être connecté pour uploader des images.');
    }

    // Vérifier que le bucket existe (mais ne pas bloquer si la vérification échoue)
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.warn('Erreur listing buckets:', bucketError);
      }
      const bucketExists = buckets?.some(bucket => bucket.name === 'images');
      if (!bucketExists) {
        // console.warn('Bucket "images" non trouvé dans la liste, mais on continue quand même...');
      }
    } catch (bucketCheckError) {
      // Si la vérification échoue, on continue quand même (peut être un problème de permissions)
      console.warn('Impossible de vérifier les buckets, on continue quand même:', bucketCheckError);
    }

    // Lire le fichier
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    // Générer un nom de fichier unique
    const filePath = fileName || `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Lire le fichier en base64 (méthode React Native)
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Convertir base64 en ArrayBuffer (nécessaire pour React Native)
    const arrayBuffer = decode(base64);

    // Upload vers Supabase Storage (utiliser ArrayBuffer au lieu de blob pour React Native)
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, arrayBuffer, {
        contentType: fileType,
        upsert: false,
      });

    if (error) {
      console.error('Erreur Supabase Storage:', error);
      console.error('Détails de l\'erreur:', JSON.stringify(error, null, 2));

      // Messages d'erreur plus clairs
      if (error.message?.includes('new row violates row-level security policy') ||
        error.message?.includes('violates row-level security')) {
        throw new Error('Politique RLS : Vérifiez que vous êtes admin et que les politiques Storage sont configurées. Consultez SETUP_STORAGE_SIMPLE.md');
      }
      if (error.message?.includes('Bucket not found') ||
        error.message?.includes('not found')) {
        throw new Error('Bucket "images" introuvable. Vérifiez que le bucket existe et est public dans Supabase Storage.');
      }
      if (error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')) {
        throw new Error('Erreur réseau. Vérifiez votre connexion internet et que Supabase Storage est accessible.');
      }
      if (error.message?.includes('JWT')) {
        throw new Error('Erreur d\'authentification. Déconnectez-vous et reconnectez-vous.');
      }

      // Message d'erreur générique avec plus de détails
      throw new Error(`Erreur upload: ${error.message || 'Erreur inconnue'}. Vérifiez la configuration Storage.`);
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      throw new Error('Impossible d\'obtenir l\'URL publique de l\'image');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    // Améliorer le message d'erreur
    if (error.message) {
      throw error;
    }
    throw new Error('Erreur réseau lors de l\'upload. Vérifiez votre connexion et la configuration Supabase Storage.');
  }
};

/**
 * Supprime une image de Supabase Storage
 * @param {string} imagePath - Chemin de l'image dans le storage
 */
export const deleteImage = async (imagePath) => {
  try {
    const { error } = await supabase.storage
      .from('images')
      .remove([imagePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    throw error;
  }
};

/**
 * Affiche un menu pour choisir entre galerie et appareil photo
 * @param {Function} onImageSelected - Callback appelé avec l'image sélectionnée
 */
export const showImagePicker = async (onImageSelected) => {
  const { Alert } = require('react-native');

  Alert.alert(
    'Sélectionner une image',
    'Choisissez une source',
    [
      {
        text: 'Galerie',
        onPress: async () => {
          try {
            const image = await pickImage();
            if (image) {
              onImageSelected(image);
            }
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
      {
        text: 'Appareil photo',
        onPress: async () => {
          try {
            const image = await takePhoto();
            if (image) {
              onImageSelected(image);
            }
          } catch (error) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
      {
        text: 'Annuler',
        style: 'cancel',
      },
    ]
  );
};
