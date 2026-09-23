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
 * Admin reste un écran à part (affiché/masqué via adminActive) et la barre du
 * bas reste synchronisée dans les deux sens (swipe <-> onglet).
 */
function CategoryPagerView({ state, navigation, descriptors, isAdmin }) {
  const { t } = useLanguage();
  const [adminActive, setAdminActive] = useState(false);
  const [width, setWidth] = useState(WINDOW_WIDTH);
  const routeCount = state.routes.length;

  const translateX = useRef(new Animated.Value(-state.index * WINDOW_WIDTH)).current;
  // Miroirs synchrones lus depuis les callbacks du geste (closures figées).
  const widthRef = useRef(width);
  const indexRef = useRef(state.index);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Anime la rangée vers la catégorie active à chaque changement d'index (tap
  // sur la barre, changement post-geste) ou de largeur (rotation / resize web).
  // L'animation part de la valeur courante de translateX (position du doigt),
  // ce qui enchaîne naturellement le suivi du doigt puis le snap.
  useEffect(() => {
    indexRef.current = state.index;
    Animated.spring(translateX, {
      toValue: -state.index * width,
      useNativeDriver: USE_NATIVE_DRIVER,
      bounciness: 0,
      speed: 14,
    }).start();
  }, [state.index, width, translateX]);

  // Change de catégorie d'un cran (ou revient à la page courante si pas de
  // changement possible). navigation.navigate met à jour state.index, ce qui
  // déclenche l'animation via l'effet ci-dessus.
  const goToIndex = useCallback(
    (index) => {
      const clamped = Math.max(0, Math.min(routeCount - 1, index));
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
    [navigation, routeCount, state.routes, translateX]
  );

  // Pendant le geste : le contenu suit le doigt, borné à la page courante ±1
  // (garantit « un seul changement de catégorie par geste ») et aux bords.
  const onPanUpdate = useCallback(
    (translationX) => {
      const w = widthRef.current;
      const base = -indexRef.current * w;
      const upperBound = -Math.max(0, indexRef.current - 1) * w; // vers la gauche (précédent)
      const lowerBound = -Math.min(routeCount - 1, indexRef.current + 1) * w; // vers la droite (suivant)
      let next = base + translationX;
      if (next > upperBound) next = upperBound;
      if (next < lowerBound) next = lowerBound;
      translateX.setValue(next);
    },
    [routeCount, translateX]
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

  const tabs = state.routes.map((route) => {
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
                width: width * routeCount,
                transform: [{ translateX }],
              }}
            >
              {state.routes.map((route) => (
                <View key={route.key} style={{ width, height: '100%' }}>
                  {descriptors[route.key].render()}
                </View>
              ))}
            </Animated.View>
          </View>
        </GestureDetector>

        {isAdmin && adminActive && (
          <View style={{ flex: 1 }}>
            <AdminStack />
          </View>
        )}

        <CustomBottomTabBar
          tabs={tabs}
          activeTabName={state.routes[state.index].name}
          onSelectTab={(name) => {
            setAdminActive(false);
            navigation.navigate(name);
          }}
          isAdmin={isAdmin}
          adminActive={adminActive}
          adminLabel={t('navigation.admin')}
          onSelectAdmin={() => setAdminActive(true)}
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
function CategoryPagerNavigator({ id, initialRouteName, children, screenOptions, isAdmin }) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(TabRouter, {
    id,
    initialRouteName,
    children,
    screenOptions,
  });

  return (
    <NavigationContent>
      <CategoryPagerView
        state={state}
        navigation={navigation}
        descriptors={descriptors}
        isAdmin={isAdmin}
      />
    </NavigationContent>
  );
}

const createCategoryPagerNavigator = createNavigatorFactory(CategoryPagerNavigator);
const CategoryPager = createCategoryPagerNavigator();

/**
 * Navigation pour les utilisateurs authentifiés : les 4 catégories dans notre
 * pager swipeable maison. Admin (non swipeable) et Profil sont gérés dans
 * CategoryPagerView / la pile externe.
 */
function MainTabs({ isAdmin }) {
  const { t } = useLanguage();
  return (
    <CategoryPager.Navigator isAdmin={isAdmin}>
      {SWIPE_TABS.map((tab) => (
        <CategoryPager.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ title: t(tab.translationKey), icon: tab.icon }}
        />
      ))}
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
  const [adminStatus, setAdminStatus] = React.useState(false);
  // Reste à false tant que le statut admin n'a pas été résolu pour cette session,
  // afin de ne jamais afficher les tabs avant de savoir si l'onglet Admin doit y figurer
  // (évite un redimensionnement visible de la tab bar juste après le chargement).
  const [adminChecked, setAdminChecked] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setAdminChecked(false);

    const checkAdmin = async () => {
      if (session) {
        const admin = await isAdmin();
        if (!cancelled) {
          setAdminStatus(admin);
          setAdminChecked(true);
        }
      } else {
        if (!cancelled) {
          setAdminStatus(false);
          setAdminChecked(true);
        }
      }
    };
    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading || (session && !adminChecked)) {
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
