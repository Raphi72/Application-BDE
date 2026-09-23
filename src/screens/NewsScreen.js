import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import Text from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NewsCard from '../components/NewsCard';
import { supabase } from '../config/supabase';
import { dateParts } from '../utils/dateUtils';
import { COLORS, FONTS, PALETTE, SECTION_COLORS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { plural } from '../utils/plural';
import { PosterFallback } from '../components/EventCard';
import { EmptyState, Sticker } from '../components/ui/Deco';
import { ScreenHeader, stackScreenOptions } from '../components/ui/Headers';

const Stack = createNativeStackNavigator();
const COLOR = SECTION_COLORS.News;

/**
 * Écran de liste des actualités
 */
function NewsListScreen({ navigation }) {
  const { t, language } = useLanguage();
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

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('news.title').toUpperCase()}
        subtitle={plural(t, language, news.length, 'news.countOne', 'news.countLabel')}
        color={COLOR}
      />
      {loading ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={PALETTE.ink} />
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={({ item, index }) => (
            <NewsCard
              news={item}
              featured={index === 0}
              onPress={() => navigation.navigate('NewsDetails', { news: item })}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState emoji="📰" title={t('news.emptyTitle')} message={t('news.emptyMessage')} color={COLOR} />
          }
        />
      )}
    </View>
  );
}

/**
 * Écran de détails d'une actualité
 */
function NewsDetailsScreen({ route }) {
  const { t, language } = useLanguage();
  const { news } = route.params;
  const { width } = useWindowDimensions();
  const parts = dateParts(news.date, language);

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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.hero}>
        {images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.map((img, index) => (
              <Image key={index} source={{ uri: img }} style={[styles.heroImage, { width }]} />
            ))}
          </ScrollView>
        ) : (
          <PosterFallback color={COLOR} emoji="📰" height={180} />
        )}
        {images.length > 1 ? (
          <Sticker label={`${images.length} photos`} icon="images" color={PALETTE.white} rotate={0} small style={styles.photoCount} />
        ) : null}
      </View>

      <View style={styles.detailsContent}>
        <Sticker label={news.category} color={COLOR} rotate={-3} style={{ marginBottom: 12 }} />
        <Text style={styles.title}>{news.title}</Text>
        <View style={styles.meta}>
          <Ionicons name="calendar" size={16} color={PALETTE.ink} />
          <Text style={styles.metaText}>
            {parts.day} {parts.month} {parts.year}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{t('news.by')}</Text>
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
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(COLOR)}>
      <Stack.Screen
        name="NewsList"
        component={NewsListScreen}
        options={{ title: t('news.title'), headerShown: false }}
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
  list: {
    padding: 16,
    paddingTop: 12,
  },
  hero: {
    borderBottomWidth: 2.5,
    borderBottomColor: PALETTE.ink,
  },
  heroImage: {
    height: 250,
    resizeMode: 'cover',
    backgroundColor: PALETTE.paperDeep,
  },
  photoCount: {
    position: 'absolute',
    left: 14,
    bottom: 14,
  },
  detailsContent: {
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 26,
    lineHeight: 34,
    color: PALETTE.ink,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: PALETTE.ink,
  },
  metaText: {
    fontFamily: FONTS.varsityBold,
    fontSize: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    marginLeft: 6,
  },
  metaDot: {
    marginLeft: 6,
    color: PALETTE.ink,
  },
  content: {
    fontSize: 17,
    lineHeight: 27,
    color: PALETTE.ink,
  },
});
