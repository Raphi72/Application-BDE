import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity, Platform, ScrollView } from 'react-native';

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

import { COLORS, SHADOWS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

/**
 * Navigation pour les utilisateurs authentifiés
 */
function MainTabs({ isAdmin }) {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => {
        // Les écrans avec Stack Navigator gèrent leur propre header
        const hasStackNavigator = ['Events', 'Polls', 'News', 'Clubs'].includes(route.name);
        
        return {
          headerShown: !hasStackNavigator, // Cacher le header pour les écrans avec Stack
          headerStyle: {
            backgroundColor: COLORS.surface,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: 'bold',
            color: COLORS.text,
          },
          headerRight: !hasStackNavigator ? () => (
            <TouchableOpacity
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) {
                  parent.navigate('Profile');
                } else {
                  navigation.navigate('Profile');
                }
              }}
              style={{ marginRight: 8, padding: 4 }} // petit espace à droite
            >
              <Ionicons name="person-circle" size={32} color={COLORS.primary} />
            </TouchableOpacity>
          ) : undefined,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            const iconSize = size || 24;

            if (route.name === 'Events') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Polls') {
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
            } else if (route.name === 'News') {
              iconName = focused ? 'newspaper' : 'newspaper-outline';
            } else if (route.name === 'Clubs') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Gallery') {
              iconName = focused ? 'images' : 'images-outline';
            } else if (route.name === 'Admin') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return <Ionicons name={iconName} size={iconSize} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            height: 65,
            // Sur Android, on remonte un peu la barre pour éviter
            // que les boutons système (◁ ○ ▢) ne passent par-dessus.
            paddingBottom: Platform.OS === 'android' ? 12 : 5,
            paddingTop: 5,
            paddingHorizontal: 20, // Ajouter du padding horizontal pour centrer
          },
          tabBarItemStyle: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 4,
            minHeight: 55,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            marginTop: 2,
            marginBottom: 0,
            textAlign: 'center',
            numberOfLines: 1,
          },
          tabBarIconStyle: {
            marginBottom: 2,
          },
          tabBarLabelPosition: 'below-icon',
        };
      }}
    >
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ title: 'Événements', headerShown: false }}
      />
      <Tab.Screen
        name="Polls"
        component={PollsScreen}
        options={{ title: 'Sondages', headerShown: false }}
      />
      <Tab.Screen
        name="News"
        component={NewsScreen}
        options={{ title: 'Actualités', headerShown: false }}
      />
      <Tab.Screen
        name="Clubs"
        component={ClubsScreen}
        options={{ title: 'Clubs', headerShown: false }}
      />
      {/* Galerie temporairement désactivée
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{ title: 'Galerie' }}
      />
      */}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminStack}
          options={{ title: 'Admin' }}
        />
      )}
    </Tab.Navigator>
  );
}

/**
 * Stack admin
 */
function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.text,
        },
        headerShadowVisible: false, // Cleaner look
      }}
    >
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: 'Administration' }}
      />
      <Stack.Screen
        name="AdminEvents"
        component={AdminEventsScreen}
        options={{ title: 'Gestion des Événements' }}
      />
      <Stack.Screen
        name="AdminPolls"
        component={AdminPollsScreen}
        options={{ title: 'Gestion des Sondages' }}
      />
      <Stack.Screen
        name="AdminNews"
        component={AdminNewsScreen}
        options={{ title: 'Gestion des Actualités' }}
      />
      <Stack.Screen
        name="AdminClubs"
        component={AdminClubsScreen}
        options={{ title: 'Gestion des Clubs' }}
      />
      <Stack.Screen
        name="AdminClubProposals"
        component={AdminClubProposalsScreen}
        options={{ title: 'Propositions de Clubs' }}
      />
    </Stack.Navigator>
  );
}

/**
 * Écran d'accueil admin
 */
/**
 * Écran d'accueil admin
 */
function AdminHomeScreen({ navigation }) {
  const { signOut, user } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panneau d'Administration</Text>
        <Text style={styles.subtitle}>Bienvenue, {user?.email}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.menu}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminEvents')}
        >
          <Ionicons name="calendar" size={32} color={COLORS.primary} />
          <Text style={styles.menuText}>Gérer les Événements</Text>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminPolls')}
        >
          <Ionicons name="checkmark-circle" size={32} color={COLORS.primary} />
          <Text style={styles.menuText}>Gérer les Sondages</Text>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminNews')}
        >
          <Ionicons name="newspaper" size={32} color={COLORS.primary} />
          <Text style={styles.menuText}>Gérer les Actualités</Text>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminClubs')}
        >
          <Ionicons name="people" size={32} color={COLORS.primary} />
          <Text style={styles.menuText}>Gérer les Clubs</Text>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('AdminClubProposals')}
        >
          <Ionicons name="document-text" size={32} color={COLORS.secondary} />
          <Text style={styles.menuText}>Propositions de Clubs</Text>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
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
  const [adminStatus, setAdminStatus] = React.useState(false);

  React.useEffect(() => {
    const checkAdmin = async () => {
      if (session) {
        const admin = await isAdmin();
        setAdminStatus(admin);
      } else {
        setAdminStatus(false);
      }
    };
    checkAdmin();
  }, [session]);

  if (loading) {
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
        <StatusBar style="light" />
        <ResetPasswordScreen onPasswordReset={clearPasswordRecovery} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
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
              headerShown: true,
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
              title: 'Profil',
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
  header: {
    backgroundColor: COLORS.surface,
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  menu: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  menuText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 16,
  },
});
