import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NavigationContainer,
  createNavigatorFactory,
  useNavigationBuilder,
  TabRouter,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Text from '../components/ui/AppText';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import CustomBottomTabBar from './CustomBottomTabBar';
import { ProfileNavContext } from './ProfileNav';

// Écrans d'authentification
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

// Écrans principaux
import EventsScreen from '../screens/EventsScreen';
import PollsScreen from '../screens/PollsScreen';
import NewsScreen from '../screens/NewsScreen';
import ClubsScreen from '../screens/ClubsScreen';
import GalleryScreen from '../screens/GalleryScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Écrans admin
import AdminEventsScreen from '../screens/admin/AdminEventsScreen';
import AdminPollsScreen from '../screens/admin/AdminPollsScreen';
import AdminNewsScreen from '../screens/admin/AdminNewsScreen';
import AdminClubsScreen from '../screens/admin/AdminClubsScreen';
import AdminClubProposalsScreen from '../screens/admin/AdminClubProposalsScreen';

import { COLORS, FONTS, PALETTE, SECTION_COLORS } from '../constants/theme';
import { PopPressable } from '../components/ui/Pop';
import { ScreenHeader, stackScreenOptions } from '../components/ui/Headers';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

// Le suivi du doigt et l'animation de snap utilisent l'Animated du cœur de
// React Native (pas de dépendance reanimated). Le driver natif n'est pas
// utilisé : on écrit translateX à chaque frame du geste via setValue, et
// mélanger setValue (JS) et animation native sur un même noeud lève une
// erreur. Le driver JS reste fluide pour un simple translateX et se comporte
// de façon identique sur web et mobile.
const USE_NATIVE_DRIVER = false;
const WINDOW_WIDTH = Dimensions.get('window').width;

// Route de l'espace admin dans le navigateur de catégories : déclarée en
// dernier, affichée à part (hors de la rangée swipeable).
const ADMIN_ROUTE = 'Admin';

// Les 4 catégories principales, swipeables horizontalement, dans cet ordre.
const SWIPE_TABS = [
  { name: 'Events', translationKey: 'navigation.events', icon: 'calendar', component: EventsScreen },
  { name: 'Polls', translationKey: 'navigation.polls', icon: 'stats-chart', component: PollsScreen },
  { name: 'News', translationKey: 'navigation.news', icon: 'newspaper', component: NewsScreen },
  { name: 'Clubs', translationKey: 'navigation.clubs', icon: 'people', component: ClubsScreen },
];

// Seuils du geste de swipe entre catégories : une distance suffisante
// OU une vitesse de relâchement suffisante (flick rapide) déclenche le
// changement de page ; en dessous, rien ne se passe (retour naturel).
const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 800;
// Déplacement horizontal (dp) à partir duquel le pager prend le geste. Il doit
// rester proche du seuil de scroll vertical natif d'Android (8 dp) pour que les
// swipes légèrement en biais soient bien reconnus comme horizontaux. Au-delà
// de SWIPE_FAIL_DY verticaux sans activation, le geste est laissé au scroll.
const SWIPE_ACTIVATE_DX = 10;
const SWIPE_FAIL_DY = 20;

/**
 * Vue du pager de catégories, rendue à l'intérieur de notre navigateur
 * personnalisé (voir CategoryPagerNavigator). Elle reçoit l'état du TabRouter :
 * - `state` : routes + index de la catégorie active,
 * - `navigation` : pour changer de catégorie (navigate) et ouvrir Profil,
 * - `descriptors` : `render()` fournit le conteneur de scène de chaque écran.
 *
 * Les 4 écrans sont rendus côte à côte dans une rangée Animated translatée que
 * le geste fait suivre au doigt (aucun react-native-pager-view). Comme chaque
 * scène provient du même navigateur (un seul arbre de navigation), le bouton
 * retour Android, le focus et useFocusEffect se comportent correctement.
 *
 * Admin (comptes admin uniquement) est une route de ce même navigateur, rendue
 * à part, hors de la rangée swipeable. Elle doit rester une route : sa pile
 * est un navigateur, et react-navigation interdit deux navigateurs sous le
 * même écran (« Another navigator is already registered for this container »).
 * La barre du bas reste synchronisée dans les deux sens (swipe <-> onglet).
 */
function CategoryPagerView({ state, navigation, descriptors }) {
  const [width, setWidth] = useState(WINDOW_WIDTH);
  const pageRoutes = state.routes.filter((route) => route.name !== ADMIN_ROUTE);
  const adminRoute = state.routes.find((route) => route.name === ADMIN_ROUTE);
  const adminActive = state.routes[state.index].name === ADMIN_ROUTE;
  const pageCount = pageRoutes.length;

  // Page affichée par la rangée. Admin étant déclarée en dernier, les index
  // des catégories coïncident avec ceux de state.routes. Pendant qu'Admin est
  // affichée, la rangée (masquée) garde sa dernière catégorie : au retour, elle
  // n'a donc pas à traverser toutes les pages.
  const lastPageRef = useRef(adminActive ? 0 : state.index);
  if (!adminActive) lastPageRef.current = state.index;
  const pageIndex = lastPageRef.current;

  // La pile admin n'est montée qu'à la première visite, puis reste montée
  // (masquée) pour retrouver l'écran où on l'avait laissée.
  const adminVisitedRef = useRef(false);
  if (adminActive) adminVisitedRef.current = true;

  const translateX = useRef(new Animated.Value(-pageIndex * WINDOW_WIDTH)).current;
  // Miroirs synchrones lus depuis les callbacks du geste (closures figées).
  const widthRef = useRef(width);
  const indexRef = useRef(pageIndex);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Anime la rangée vers la catégorie active à chaque changement d'index (tap
  // sur la barre, changement post-geste) ou de largeur (rotation / resize web).
  // L'animation part de la valeur courante de translateX (position du doigt),
  // ce qui enchaîne naturellement le suivi du doigt puis le snap.
  useEffect(() => {
    indexRef.current = pageIndex;
    Animated.spring(translateX, {
      toValue: -pageIndex * width,
      useNativeDriver: USE_NATIVE_DRIVER,
      bounciness: 0,
      speed: 14,
    }).start();
  }, [pageIndex, width, translateX]);

  // Change de catégorie d'un cran (ou revient à la page courante si pas de
  // changement possible). navigation.navigate met à jour state.index, ce qui
  // déclenche l'animation via l'effet ci-dessus.
  const goToIndex = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(pageCount - 1, index));
      if (clamped === indexRef.current) {
        // Pas de changement : on ramène la rangée sur la page courante.
        Animated.spring(translateX, {
          toValue: -clamped * widthRef.current,
          useNativeDriver: USE_NATIVE_DRIVER,
          bounciness: 0,
          speed: 14,
        }).start();
        return;
      }
      navigation.navigate(state.routes[clamped].name);
    },
    [navigation, pageCount, state.routes, translateX]
  );

  // Pendant le geste : le contenu suit le doigt, borné à la page courante ±1
  // (garantit « un seul changement de catégorie par geste ») et aux bords.
  const onPanUpdate = useCallback(
    (translationX) => {
      const w = widthRef.current;
      const base = -indexRef.current * w;
      const upperBound = -Math.max(0, indexRef.current - 1) * w; // vers la gauche (précédent)
      const lowerBound = -Math.min(pageCount - 1, indexRef.current + 1) * w; // vers la droite (suivant)
      let next = base + translationX;
      if (next > upperBound) next = upperBound;
      if (next < lowerBound) next = lowerBound;
      translateX.setValue(next);
    },
    [pageCount, translateX]
  );

  // Au relâchement : une distance OU une vitesse suffisante change de page d'un
  // cran ; sinon retour à la page courante.
  const onPanFinish = useCallback(
    (translationX, velocityX) => {
      const distanceOk = Math.abs(translationX) > SWIPE_DISTANCE_THRESHOLD;
      const velocityOk = Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD;
      if (!distanceOk && !velocityOk) {
        goToIndex(indexRef.current);
        return;
      }
      const goingNext = distanceOk ? translationX < 0 : velocityX < 0;
      goToIndex(indexRef.current + (goingNext ? 1 : -1));
    },
    [goToIndex]
  );

  // Geste horizontal via react-native-gesture-handler. La décision
  // « horizontal ou vertical ? » est prise nativement sur le thread UI, au même
  // niveau que celle des ScrollView/FlatList des écrans. Avec PanResponder,
  // cette décision passait par le thread JS (asynchrone) : sur Android, dès
  // qu'un vrai doigt dérivait un peu à la verticale (~20° suffisent), la liste
  // native franchissait son seuil de scroll (8 dp) avant que le JS ait réclamé
  // le geste, et le pager ne recevait plus rien. Ici le pan s'active dès
  // SWIPE_ACTIVATE_DX horizontaux et échoue si le doigt part d'abord à la
  // verticale (le scroll de la liste reste alors prioritaire).
  // runOnJS : pas de reanimated, les callbacks pilotent l'Animated (driver JS).
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-SWIPE_ACTIVATE_DX, SWIPE_ACTIVATE_DX])
        .failOffsetY([-SWIPE_FAIL_DY, SWIPE_FAIL_DY])
        .runOnJS(true)
        .onUpdate((e) => onPanUpdate(e.translationX))
        .onEnd((e, success) => {
          if (success) onPanFinish(e.translationX, e.velocityX);
          else goToIndex(indexRef.current);
        }),
    [onPanUpdate, onPanFinish, goToIndex]
  );

  const openProfile = useCallback(() => navigation.navigate('Profile'), [navigation]);

  const tabs = pageRoutes.map((route) => {
    const { options } = descriptors[route.key];
    return {
      name: route.name,
      icon: options.icon,
      color: SECTION_COLORS[route.name],
      title: options.title ?? route.name,
    };
  });

  return (
    <ProfileNavContext.Provider value={openProfile}>
      <View style={styles.mainTabsContainer}>
        <GestureDetector gesture={panGesture}>
          <View
            style={[styles.pagerViewport, { display: adminActive ? 'none' : 'flex' }]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setWidth(w);
            }}
          >
            <Animated.View
              style={{
                flex: 1,
                flexDirection: 'row',
                width: width * pageCount,
                transform: [{ translateX }],
              }}
            >
              {pageRoutes.map((route) => (
                <View key={route.key} style={{ width, height: '100%' }}>
                  {descriptors[route.key].render()}
                </View>
              ))}
            </Animated.View>
          </View>
        </GestureDetector>

        {adminRoute && adminVisitedRef.current && (
          <View style={[styles.adminScene, { display: adminActive ? 'flex' : 'none' }]}>
            {descriptors[adminRoute.key].render()}
          </View>
        )}

        <CustomBottomTabBar
          tabs={tabs}
          activeTabName={state.routes[state.index].name}
          onSelectTab={(name) => navigation.navigate(name)}
          isAdmin={Boolean(adminRoute)}
          adminActive={adminActive}
          adminLabel={adminRoute ? descriptors[adminRoute.key].options.title : undefined}
          onSelectAdmin={() => navigation.navigate(ADMIN_ROUTE)}
        />
      </View>
    </ProfileNavContext.Provider>
  );
}

/**
 * Navigateur personnalisé (API bas-niveau react-navigation) branché sur le
 * TabRouter. Il rend TOUTES les scènes en même temps (via CategoryPagerView)
 * pour permettre le pager côte à côte, tout en fournissant un vrai conteneur
 * de scène par écran et en restant un seul arbre de navigation.
 */
function CategoryPagerNavigator({ id, initialRouteName, children, screenOptions }) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(TabRouter, {
    id,
    initialRouteName,
    children,
    screenOptions,
  });

  return (
    <NavigationContent>
      <CategoryPagerView state={state} navigation={navigation} descriptors={descriptors} />
    </NavigationContent>
  );
}

const createCategoryPagerNavigator = createNavigatorFactory(CategoryPagerNavigator);
const CategoryPager = createCategoryPagerNavigator();

/**
 * Navigation pour les utilisateurs authentifiés : les 4 catégories dans notre
 * pager swipeable maison, plus l'espace Admin (non swipeable) pour les comptes
 * admin. Profil est géré par la pile externe.
 */
function MainTabs({ isAdmin }) {
  const { t } = useLanguage();
  return (
    <CategoryPager.Navigator>
      {SWIPE_TABS.map((tab) => (
        <CategoryPager.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ title: t(tab.translationKey), icon: tab.icon }}
        />
      ))}
      {isAdmin && (
        <CategoryPager.Screen
          name={ADMIN_ROUTE}
          component={AdminStack}
          options={{ title: t('navigation.admin') }}
        />
      )}
    </CategoryPager.Navigator>
  );
}

/**
 * Stack admin : l'accueil rend son propre ScreenHeader, les sous-écrans le
 * header de détail de la rubrique (bandeau rose).
 */
function AdminStack() {
  const { t } = useLanguage();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions(SECTION_COLORS.Admin)}>
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: t('admin.title'), headerShown: false }}
      />
      <Stack.Screen
        name="AdminEvents"
        component={AdminEventsScreen}
        options={{ title: t('admin.events') }}
      />
      <Stack.Screen
        name="AdminPolls"
        component={AdminPollsScreen}
        options={{ title: t('admin.polls') }}
      />
      <Stack.Screen
        name="AdminNews"
        component={AdminNewsScreen}
        options={{ title: t('admin.news') }}
      />
      <Stack.Screen
        name="AdminClubs"
        component={AdminClubsScreen}
        options={{ title: t('admin.clubs') }}
      />
      <Stack.Screen
        name="AdminClubProposals"
        component={AdminClubProposalsScreen}
        options={{ title: t('admin.clubProposals') }}
      />
    </Stack.Navigator>
  );
}

const ADMIN_MENU = [
  { route: 'AdminEvents', labelKey: 'admin.events', icon: 'calendar', color: SECTION_COLORS.Events },
  { route: 'AdminPolls', labelKey: 'admin.polls', icon: 'stats-chart', color: SECTION_COLORS.Polls },
  { route: 'AdminNews', labelKey: 'admin.news', icon: 'newspaper', color: SECTION_COLORS.News },
  { route: 'AdminClubs', labelKey: 'admin.clubs', icon: 'people', color: SECTION_COLORS.Clubs },
  { route: 'AdminClubProposals', labelKey: 'admin.clubProposals', icon: 'document-text', color: PALETTE.mint },
];

/**
 * Écran d'accueil admin
 */
function AdminHomeScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('navigation.admin').toUpperCase()}
        subtitle={t('admin.welcome', { email: user?.email })}
        color={SECTION_COLORS.Admin}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.menu}>
        {ADMIN_MENU.map((item) => (
          <PopPressable
            key={item.route}
            onPress={() => navigation.navigate(item.route)}
            containerStyle={styles.menuItemContainer}
            style={styles.menuItem}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={24} color={PALETTE.ink} />
            </View>
            <Text style={styles.menuText}>{t(item.labelKey)}</Text>
            <Ionicons name="arrow-forward" size={22} color={PALETTE.ink} />
          </PopPressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Navigation d'authentification
 */
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

/**
 * Navigateur principal de l'application
 */
export default function AppNavigator() {
  const { session, loading, isAdmin, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const { t } = useLanguage();
  const userId = session?.user?.id ?? null;
  const [adminStatus, setAdminStatus] = React.useState(false);
  // Utilisateur pour lequel adminStatus a été résolu. Tant qu'il ne correspond
  // pas à l'utilisateur connecté, on n'affiche pas les onglets : on ne sait pas
  // encore si l'onglet Admin doit y figurer.
  // La vérification dépend de l'utilisateur et non de l'objet session : Supabase
  // en fournit un nouveau à chaque rafraîchissement du jeton (toutes les heures,
  // au retour au premier plan…). Relancer la vérification à ce moment-là
  // démontait toute la navigation, et un admin perdait le formulaire en cours.
  const [adminCheckedFor, setAdminCheckedFor] = React.useState(null);

  React.useEffect(() => {
    if (!userId) {
      setAdminStatus(false);
      setAdminCheckedFor(null);
      return undefined;
    }

    let cancelled = false;
    isAdmin().then((admin) => {
      if (!cancelled) {
        setAdminStatus(admin);
        setAdminCheckedFor(userId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading || (userId && adminCheckedFor !== userId)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Si l'utilisateur est en mode récupération de mot de passe
  if (session && isPasswordRecovery) {
    return (
      <NavigationContainer>
        <StatusBar style="dark" />
        <ResetPasswordScreen onPasswordReset={clearPasswordRecovery} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      {session ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="MainTabs">
            {(props) => <MainTabs {...props} isAdmin={adminStatus} />}
          </Stack.Screen>
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              ...stackScreenOptions(SECTION_COLORS.Profile),
              headerShown: true,
              title: t('profile.title'),
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainTabsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pagerViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  adminScene: {
    flex: 1,
  },
  menu: {
    padding: 16,
    paddingTop: 12,
  },
  menuItemContainer: {
    marginBottom: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 17,
    color: COLORS.text,
    marginLeft: 14,
  },
});
