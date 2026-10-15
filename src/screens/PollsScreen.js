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
      loadVoteCounts();
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

  // Nombre de voix par option, pour tous les sondages en une requête. La RPC
  // ne renvoie que des totaux : qui a voté quoi reste privé.
  const loadVoteCounts = async () => {
    try {
      const { data, error } = await supabase.rpc('poll_results');
      if (error) throw error;

      const counts = {};
      (data || []).forEach(({ poll_id, option_index, votes }) => {
        counts[poll_id] = counts[poll_id] || {};
        counts[poll_id][option_index] = Number(votes);
      });

      setPolls(prevPolls =>
        prevPolls.map(p => {
          const pollCounts = counts[p.id] || {};
          const options = p.options.map((opt, index) => ({ ...opt, votes: pollCounts[index] || 0 }));
          return { ...p, options, totalVotes: options.reduce((sum, opt) => sum + opt.votes, 0) };
        })
      );
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

      // Refus du trigger check_vote (database/schema.sql) ; polls.total_votes
      // est tenu à jour par la base.
      if (error?.message?.includes('poll_closed')) {
        Alert.alert(t('common.error'), t('polls.pollEnded'));
        return;
      }
      if (error) throw error;

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
