import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NewsCard from '../components/NewsCard';
import { supabase } from '../config/supabase';
import { formatDate } from '../utils/dateUtils';
import { COLORS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';

const Stack = createNativeStackNavigator();

/**
 * Écran de liste des actualités
 */
function NewsListScreen({ navigation }) {
  const { t } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedNews = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        image: item.image,
        category: item.category || 'Actualité',
        author: 'BDE',
        date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      }));

      setNews(formattedNews);
    } catch (error) {
      console.error('Erreur lors du chargement des actualités:', error);
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
    loadNews(true);
  };

  const renderNews = ({ item }) => (
    <NewsCard
      news={item}
      onPress={() => navigation.navigate('NewsDetails', { news: item })}
    />
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
        data={news}
        renderItem={renderNews}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={64} color={COLORS.surfaceLight} />
            <Text style={styles.emptyText}>{t('news.noNews')}</Text>
          </View>
        }
      />
    </View>
  );
}

/**
 * Écran de détails d'une actualité
 */
function NewsDetailsScreen({ route }) {
  const { t } = useLanguage();
  const { news } = route.params;
  const { width } = Dimensions.get('window');

  // Parse images
  const images = (() => {
    if (!news.image) return [];
    try {
      const parsed = JSON.parse(news.image);
      return Array.isArray(parsed) ? parsed : [news.image];
    } catch {
      return [news.image];
    }
  })();

  return (
    <ScrollView style={styles.container}>
      {images.length > 0 && (
        <View style={styles.sliderContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={[styles.sliderImage, { width }]}
              />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.sliderBadge}>
              <Ionicons name="images" size={12} color="#fff" />
              <Text style={styles.sliderText}>{images.length} photos</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.detailsContainer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{news.category}</Text>
        </View>

        <Text style={styles.title}>{news.title}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{formatDate(news.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{news.author}</Text>
          </View>
        </View>

        <Text style={styles.content}>{news.content}</Text>
      </View>
    </ScrollView>
  );
}

/**
 * Navigation pour les actualités
 */
export default function NewsScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.text,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="NewsList"
        component={NewsListScreen}
        options={{
          title: t('news.title'),
          headerRight: () => {
            const parentNav = navigation.getParent();
            return (
              <TouchableOpacity
                onPress={() => {
                  if (parentNav) {
                    parentNav.navigate('Profile');
                  } else {
                    navigation.navigate('Profile');
                  }
                }}
                style={{ marginRight: 16, padding: 8 }}
              >
                <Ionicons name="person-circle" size={32} color={COLORS.primary} />
              </TouchableOpacity>
            );
          },
        }}
      />
      <Stack.Screen
        name="NewsDetails"
        component={NewsDetailsScreen}
        options={{ title: t('news.articleDetailsTitle') }}
      />
    </Stack.Navigator>
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
  detailsContainer: {
    padding: 24,
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  meta: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  content: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 32,
  },
  sliderContainer: {
    height: 250,
    backgroundColor: '#000',
    marginBottom: -20,
    zIndex: 1,
  },
  sliderImage: {
    height: 250,
    resizeMode: 'cover',
  },
  sliderBadge: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
