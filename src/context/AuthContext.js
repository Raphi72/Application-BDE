import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';
import { AUTH_EMAIL_REDIRECT_URL } from '../config/authEmail';
import { notificationService } from '../services/NotificationService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Extrait les tokens (access_token, refresh_token) d'une URL de deep link
 * et les injecte dans la session Supabase.
 */
const handleDeepLink = async (url) => {
  if (!url) return;
  const fragment = url.split('#')[1];
  if (!fragment) return;

  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    console.log('Deep link reçu, injection de la session Supabase...');
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushToken, setPushToken] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const notificationRegistered = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Ecouter les deep links (quand l'app est deja ouverte)
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Verifier si l'app a ete ouverte par un deep link
    Linking.getInitialURL().then(handleDeepLink);

    // Rafraichir la session quand l'app revient au premier plan
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && !notificationRegistered.current && event !== 'PASSWORD_RECOVERY') {
        notificationRegistered.current = true;
        const token = await notificationService.registerForPushNotifications(session.user.id);
        setPushToken(token);
      }

      if (!session) {
        notificationRegistered.current = false;
        setPushToken(null);
        setIsPasswordRecovery(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
      appStateSub.remove();
    };
  }, []);

  /**
   * Terminer la récupération de mot de passe
   */
  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  /**
   * Inscription
   */
  const signUp = async (email, password, userData = {}) => {
    try {
      // Ne pas spécifier de redirectTo - Supabase utilisera le Site URL configuré
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData, // Données supplémentaires (nom, rôle, etc.)
          ...(AUTH_EMAIL_REDIRECT_URL ? { emailRedirectTo: AUTH_EMAIL_REDIRECT_URL } : {}),
        },
      });

      if (error) throw error;
      
      // Si l'email n'est pas confirmé mais que l'inscription a réussi
      if (data.user && !data.session) {
        console.log('📧 Email de confirmation envoyé. L\'utilisateur doit confirmer son email.');
      }
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  /**
   * Connexion
   */
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  /**
   * Déconnexion
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  /**
   * Vérifier si l'utilisateur est admin
   */
  const isAdmin = async () => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) return false;
      return data?.role === 'admin';
    } catch (error) {
      return false;
    }
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin,
    pushToken,
    isPasswordRecovery,
    clearPasswordRecovery,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
