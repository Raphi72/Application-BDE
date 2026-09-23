import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { DelaGothicOne_400Regular } from '@expo-google-fonts/dela-gothic-one';
import {
  BigShouldersDisplay_800ExtraBold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { PALETTE } from './src/constants/theme';

const isExpoGo = Constants.appOwnership === 'expo';

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const hideNavBar = () => {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    };

    hideNavBar();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') hideNavBar();
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isExpoGo) return;

    // Import différé : charger expo-notifications dans Expo Go affiche une
    // erreur (push Android retiré depuis SDK 53), même sans l'utiliser.
    const Notifications = require('expo-notifications');

    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: PALETTE.tangerine,
        });
      }
    })();
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    DelaGothicOne_400Regular,
    BigShouldersDisplay_800ExtraBold,
    BigShouldersDisplay_900Black,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Fond papier le temps du chargement des polices (quelques centaines de ms)
  // pour ne jamais afficher l'app avec la police système. En cas d'échec, on
  // démarre quand même avec les polices système.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: PALETTE.paper }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover, 
    input:-webkit-autofill:focus, 
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px #1E1E24 inset !important;
      -webkit-text-fill-color: white !important;
      caret-color: white !important;
      transition: background-color 5000s ease-in-out 0s;
    }
  `;
  document.head.appendChild(style);
}
