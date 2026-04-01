import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PollCard from '../components/PollCard';
import { supabase } from '../config/supabase';
import { formatDate, isPastDate } from '../utils/dateUtils';
import { COLORS, SHADOWS } from '../constants/theme';

const Stack = createNativeStackNavigator();

/**
 * Écran de liste des sondages
 */
function PollsListScreen({ navigation }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadPolls();
      loadUserVotes();
    }, [])
  );

  const loadPolls = async () => {
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
      Alert.alert('Erreur', 'Impossible de charger les sondages');
    } finally {
      setLoading(false);
    }
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

      setUserVotes(votesMap);

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

  // handleVote logic moved to PollDetailsScreen

  const renderPoll = ({ item }) => (
    <PollCard
      poll={item}
      onPress={() => navigation.navigate('PollDetails', { poll: item })}
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
        data={polls}
        renderItem={renderPoll}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadPolls}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.surfaceLight} />
            <Text style={styles.emptyText}>Aucun sondage disponible</Text>
          </View>
        }
      />
    </View>
  );
}

/**
 * Écran de détails d'un sondage avec possibilité de voter
 */
function PollDetailsScreen({ route, navigation }) {
  const { poll } = route.params;
  const [localPoll, setLocalPoll] = useState(poll);

  const isPast = isPastDate(localPoll.endDate);
  const hasVoted = !!localPoll.userVote;
  const selectedOption = localPoll.userVote;

  const handleVote = async (optionId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour voter');
        return;
      }

      if (hasVoted) {
        Alert.alert('Erreur', 'Vous avez déjà voté pour ce sondage');
        return;
      }

      if (isPast) {
        Alert.alert('Erreur', 'Ce sondage est terminé');
        return;
      }

      const optionIndex = optionId.charCodeAt(0) - 97;

      const { error } = await supabase
        .from('votes')
        .insert([{ poll_id: localPoll.id, user_id: user.id, option_index: optionIndex }]);

      if (error) throw error;

      await supabase
        .from('polls')
        .update({ total_votes: (localPoll.totalVotes || 0) + 1 })
        .eq('id', localPoll.id);

      // Mettre à jour l'état local
      setLocalPoll(prev => ({
        ...prev,
        userVote: optionId,
        totalVotes: (prev.totalVotes || 0) + 1,
        options: prev.options.map(opt =>
          opt.id === optionId ? { ...opt, votes: (opt.votes || 0) + 1 } : opt
        ),
      }));

      Alert.alert('Merci !', 'Votre vote a été enregistré.');
    } catch (error) {
      console.error('Erreur lors du vote:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer votre vote');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.detailsContainer}>
        <Text style={styles.question}>{localPoll.question}</Text>

        {isPast && (
          <View style={[styles.alertBox, styles.alertWarning]}>
            <Ionicons name="information-circle" size={20} color={COLORS.warning} />
            <Text style={[styles.alertText, { color: COLORS.warning }]}>Ce sondage est terminé</Text>
          </View>
        )}

        {hasVoted && !isPast && (
          <View style={[styles.alertBox, styles.alertSuccess]}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={[styles.alertText, { color: COLORS.success }]}>Vous avez déjà voté</Text>
          </View>
        )}

        <View style={styles.optionsContainer}>
          {localPoll.options.map((option) => {
            const percentage = localPoll.totalVotes > 0
              ? Math.round((option.votes / localPoll.totalVotes) * 100)
              : 0;
            const isSelected = selectedOption === option.id;
            const canVote = !hasVoted && !isPast;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.selectedOption,
                  !canVote && styles.disabledOption,
                ]}
                onPress={() => handleVote(option.id)}
                disabled={!canVote}
              >
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionText, isSelected && styles.selectedText]}>
                    {option.text}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  )}
                </View>

                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${percentage}%` }]} />
                </View>

                <View style={styles.optionFooter}>
                  <Text style={styles.percentage}>{percentage}%</Text>
                  <Text style={styles.votesCount}>
                    {option.votes} vote{option.votes > 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.summaryText}>
              Total : {localPoll.totalVotes} vote{localPoll.totalVotes > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.summaryText}>
              {isPast
                ? 'Terminé'
                : localPoll.endDate
                  ? `Jusqu'au ${formatDate(localPoll.endDate)}`
                  : 'Durée illimitée'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Navigation pour les sondages
 */
export default function PollsScreen() {
  const navigation = useNavigation();
  
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
        name="PollsList"
        component={PollsListScreen}
        options={{
          title: 'Sondages',
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
                style={{ marginRight: 24, padding: 4 }} // un peu plus à droite
              >
                <Ionicons name="person-circle" size={32} color={COLORS.primary} />
              </TouchableOpacity>
            );
          },
        }}
      />
      <Stack.Screen
        name="PollDetails"
        component={PollDetailsScreen}
        options={{ title: 'Détails du sondage' }}
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
  question: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  alertWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: COLORS.warning,
  },
  alertSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: COLORS.success,
  },
  alertText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  selectedOption: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  disabledOption: {
    opacity: 0.7,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  selectedText: {
    fontWeight: 'bold',
    color: COLORS.success,
  },
  barContainer: {
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  optionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  votesCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summary: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
});
