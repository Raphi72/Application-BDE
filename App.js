import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import Constants from 'expo-constants';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';

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
          lightColor: '#7C5CFF',
        });
      }
    })();
  }, []);

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
