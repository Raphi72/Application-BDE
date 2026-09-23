import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PollCard from '../components/PollCard';
import { supabase } from '../config/supabase';
import { isPastDate } from '../utils/dateUtils';
import { COLORS, PALETTE, SECTION_COLORS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { plural } from '../utils/plural';
import { EmptyState } from '../components/ui/Deco';
import { ScreenHeader, stackScreenOptions } from '../components/ui/Headers';

const Stack = createNativeStackNavigator();
const COLOR = SECTION_COLORS.Polls;

/**
 * Écran de liste des sondages, avec vote directement dans chaque carte.
 */
function PollsListScreen() {
  const { t, language } = useLanguage();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPolls();
      loadUserVotes();
    }, [])
  );

  const loadPolls = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Formater les données
      const formattedPolls = (data || []).map(poll => {
        const options = Array.isArray(poll.options) ? poll.options : [];
        const optionsWithVotes = options.map((opt, index) => ({
          id: String.fromCharCode(97 + index),
          text: opt,
          votes: 0,
        }));

        return {
          id: poll.id,
          question: poll.question,
          options: optionsWithVotes,
          endDate: poll.end_date,
          totalVotes: poll.total_votes || 0,
          userVote: null,
        };
      });

      setPolls(formattedPolls);
      loadVoteCounts(formattedPolls);
    } catch (error) {
      console.error('Erreur lors du chargement des sondages:', error);
      Alert.alert(t('common.error'), t('errors.generic'));
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
    loadPolls(true);
    loadUserVotes();
  };

  const loadVoteCounts = async (pollsList) => {
    try {
      for (const poll of pollsList) {
        const { data, error } = await supabase
          .from('votes')
          .select('option_index')
          .eq('poll_id', poll.id);

        if (error) throw error;

        const voteCounts = {};
        (data || []).forEach(vote => {
          voteCounts[vote.option_index] = (voteCounts[vote.option_index] || 0) + 1;
        });

        const updatedOptions = poll.options.map((opt, index) => ({
          ...opt,
          votes: voteCounts[index] || 0,
        }));

        setPolls(prevPolls =>
          prevPolls.map(p =>
            p.id === poll.id
              ? { ...p, options: updatedOptions, totalVotes: (data || []).length }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement des votes:', error);
    }
  };

  const loadUserVotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('votes')
        .select('poll_id, option_index')
        .eq('user_id', user.id);

      if (error) throw error;

      const votesMap = {};
      (data || []).forEach(vote => {
        votesMap[vote.poll_id] = String.fromCharCode(97 + vote.option_index);
      });

      setPolls(prevPolls =>
        prevPolls.map(poll => ({
          ...poll,
          userVote: votesMap[poll.id] || null,
        }))
      );
    } catch (error) {
      console.error('Erreur lors du chargement des votes utilisateur:', error);
    }
  };

  const handleVote = async (poll, optionId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('common.error'), t('polls.loginRequired'));
        return;
      }
      if (poll.userVote) {
        Alert.alert(t('common.error'), t('polls.alreadyVoted'));
        return;
      }
      if (isPastDate(poll.endDate)) {
        Alert.alert(t('common.error'), t('polls.pollEnded'));
        return;
      }

      const optionIndex = optionId.charCodeAt(0) - 97;

      const { error } = await supabase
        .from('votes')
        .insert([{ poll_id: poll.id, user_id: user.id, option_index: optionIndex }]);

      if (error) throw error;

      await supabase
        .from('polls')
        .update({ total_votes: (poll.totalVotes || 0) + 1 })
        .eq('id', poll.id);

      // Mise à jour locale : la carte bascule sur les résultats
      setPolls(prev =>
        prev.map(p =>
          p.id === poll.id
            ? {
                ...p,
                userVote: optionId,
                totalVotes: (p.totalVotes || 0) + 1,
                options: p.options.map(opt =>
                  opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
                ),
              }
            : p
        )
      );
    } catch (error) {
      console.error('Erreur lors du vote:', error);
      Alert.alert(t('common.error'), t('polls.voteError'));
    }
  };

  const openCount = polls.filter((p) => !isPastDate(p.endDate)).length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('polls.title').toUpperCase()}
        subtitle={plural(t, language, openCount, 'polls.countOne', 'polls.activeCount')}
        color={COLOR}
      />
      {loading ? (
        <View style={[styles.container, styles.center]}>
          <ActivityIndicator size="large" color={PALETTE.ink} />
        </View>
      ) : (
        <FlatList
          data={polls}
          renderItem={({ item }) => <PollCard poll={item} onVote={handleVote} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState emoji="🗳️" title={t('polls.emptyTitle')} message={t('polls.emptyMessage')} color={COLOR} />
          }
        />
      )}
    </View>
  );
}

/**
 * Navigation pour les sondages
 */
export default function PollsScreen() {
  const { t } = useLanguage();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(COLOR)}>
      <Stack.Screen
        name="PollsList"
        component={PollsListScreen}
        options={{ title: t('polls.title'), headerShown: false }}
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
});
