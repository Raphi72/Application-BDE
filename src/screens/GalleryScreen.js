import { COLORS, SHADOWS } from '../constants/theme';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

/**
 * Écran de la galerie photos
 */
export default function GalleryScreen() {
  const { t } = useLanguage();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadAlbums();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  const loadAlbums = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const { data: albumsData, error: albumsError } = await supabase
        .from('gallery_albums')
        .select('*')
        .order('date', { ascending: false });

      if (albumsError) throw albumsError;

      // Charger les images pour chaque album
      const albumsWithImages = await Promise.all(
        (albumsData || []).map(async (album) => {
          const { data: imagesData, error: imagesError } = await supabase
            .from('gallery_images')
            .select('image_url')
            .eq('album_id', album.id)
            .order('created_at', { ascending: true });

          if (imagesError) throw imagesError;

          return {
            id: album.id,
            title: album.title,
            date: album.date,
            images: (imagesData || []).map(img => img.image_url),
          };
        })
      );

      setAlbums(albumsWithImages);
    } catch (error) {
      console.error('Erreur lors du chargement de la galerie:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAlbums(true);
  };

  const renderAlbum = ({ item }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => setSelectedAlbum(item)}
      activeOpacity={0.7}
    >
      {item.images && item.images.length > 0 && (
        <Image source={{ uri: item.images[0] }} style={styles.albumImage} />
      )}
      <View style={styles.albumOverlay}>
        <Text style={styles.albumTitle}>{item.title}</Text>
        {item.date && (
          <Text style={styles.albumDate}>{formatDate(item.date)}</Text>
        )}
        <Text style={styles.albumCount}>
          {item.images?.length || 0} photo{(item.images?.length || 0) > 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderImage = ({ item, index }) => (
    <TouchableOpacity
      style={styles.imageContainer}
      onPress={() => setSelectedImage({ uri: item, index })}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item }} style={styles.galleryImage} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={albums}
        renderItem={renderAlbum}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={COLORS.surfaceLight} />
            <Text style={styles.emptyText}>{t('gallery.noAlbums')}</Text>
          </View>
        }
      />

      {/* Modal pour afficher les images d'un album */}
      <Modal
        visible={selectedAlbum !== null}
        animationType="slide"
        onRequestClose={() => setSelectedAlbum(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedAlbum?.title}</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedAlbum(null);
                setSelectedImage(null);
              }}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={selectedAlbum?.images || []}
            renderItem={renderImage}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            contentContainerStyle={styles.galleryGrid}
          />
        </View>
      </Modal>

      {/* Modal pour afficher une image en plein écran */}
      <Modal
        visible={selectedImage !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.fullImageContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  list: {
    padding: 16,
  },
  albumCard: {
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  albumImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  albumOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(14, 14, 19, 0.85)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  albumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  albumDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  albumCount: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  galleryGrid: {
    padding: 8,
  },
  imageContainer: {
    width: (width - 32) / 2,
    height: (width - 32) / 2,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fullImageContainer: {
    flex: 1,
    backgroundColor: 'rgba(14, 14, 19, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
});
