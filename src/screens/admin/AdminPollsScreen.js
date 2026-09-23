import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Text, { TextInput } from '../../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { COLORS, SHADOWS } from '../../constants/theme';
import { notificationService } from '../../services/NotificationService';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Écran admin pour gérer les sondages
 */
export default function AdminPollsScreen() {
  const { t } = useLanguage();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);

  // Formulaire
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [endDate, setEndDate] = useState('');

  React.useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async (isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (error) {
      Alert.alert(t('common.error'), 'Impossible de charger les sondages');
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
  };

  // Un champ du formulaire a-t-il été rempli ? (pour confirmer avant de perdre la saisie)
  const hasUnsavedChanges = () => {
    return Boolean(question || options.some(opt => opt.trim()) || endDate);
  };

  const requestCloseModal = async () => {
    if (hasUnsavedChanges()) {
      const confirmClose = Platform.OS === 'web'
        ? window.confirm(`${t('admin.discardChangesTitle')}\n\n${t('admin.discardChangesConfirm')}`)
        : await new Promise((resolve) => {
            Alert.alert(
              t('admin.discardChangesTitle'),
              t('admin.discardChangesConfirm'),
              [
                { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
                { text: t('admin.discardChanges'), style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });
      if (!confirmClose) return;
    }
    setModalVisible(false);
  };

  const openModal = (poll = null) => {
    if (poll) {
      setEditingPoll(poll);
      setQuestion(poll.question);
      setOptions(poll.options || ['', '', '', '']);
      setEndDate(poll.end_date || '');
    } else {
      setEditingPoll(null);
      setQuestion('');
      setOptions(['', '', '', '']);
      setEndDate('');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!question || options.filter(opt => opt.trim()).length < 2) {
      Alert.alert(t('common.error'), 'Veuillez remplir la question et au moins 2 options');
      return;
    }

    try {
      const pollData = {
        question,
        options: options.filter(opt => opt.trim()),
        end_date: endDate || null,
      };

      if (editingPoll) {
        const { error } = await supabase
          .from('polls')
          .update(pollData)
          .eq('id', editingPoll.id);

        if (error) throw error;
        Alert.alert(t('common.success'), t('admin.saveSuccess'));
      } else {
        const { error } = await supabase
          .from('polls')
          .insert([pollData]);

        if (error) throw error;

        // Envoyer une notification à tous les utilisateurs
        await notificationService.notifyNewPoll(question);

        Alert.alert(t('common.success'), `${t('admin.saveSuccess')} - ${t('admin.notificationSent')}`);
      }

      setModalVisible(false);
      loadPolls();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };



  const handleDelete = async (pollId) => {
    Alert.alert(
      t('admin.deleteConfirm'),
      t('admin.deletePollConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('polls')
                .delete()
                .eq('id', pollId);

              if (error) throw error;
              loadPolls();
            } catch (error) {
              Alert.alert(t('common.error'), t('admin.deleteError'));
            }
          },
        },
      ]
    );
  };

  const updateOption = (index, text) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Ionicons name="add-circle" size={24} color={COLORS.onPrimary} />
          <Text style={styles.addButtonText}>{t('admin.newPoll')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={polls}
        renderItem={({ item }) => (
          <View style={styles.pollCard}>
            <Text style={styles.pollQuestion}>{item.question}</Text>
            <Text style={styles.pollOptions}>
              {item.options?.length || 0} options •
              {item.end_date ? ` ${t('polls.endDate')} : ${item.end_date}` : ` ${t('polls.noEndDate')}`}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openModal(item)}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primaryText} />
                <Text style={styles.editButtonText}>{t('common.edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={requestCloseModal}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPoll ? t('admin.editPoll') : t('admin.newPoll')}
            </Text>
            <TouchableOpacity onPress={requestCloseModal}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>{t('form.question')} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={question}
              onChangeText={setQuestion}
              placeholder="Posez votre question..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />

            <Text style={styles.label}>{t('form.options')} * ({t('form.minOptions')})</Text>
            {options.map((option, index) => (
              <TextInput
                key={index}
                style={styles.input}
                value={option}
                onChangeText={(value) => updateOption(index, value)}
                placeholder={`${t('form.option')} ${index + 1}`}
                placeholderTextColor={COLORS.textSecondary}
              />
            ))}

            <Text style={styles.label}>{t('form.endDate')} ({t('form.optional')})</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder={`${t('form.dateFormat')} (${t('form.endDateHint')})`}
              placeholderTextColor={COLORS.textSecondary}
            />
            <Text style={styles.hint}>
              💡 Astuce : Laissez vide pour créer un sondage qui ne se termine jamais
            </Text>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editingPoll ? t('common.update') : t('common.create')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    ...SHADOWS.neon,
  },
  addButtonText: {
    color: COLORS.onPrimary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  list: {
    padding: 16,
  },
  pollCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    ...SHADOWS.card,
  },
  pollQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  pollOptions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  editButtonText: {
    color: COLORS.primaryText,
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  deleteButtonText: {
    color: COLORS.error,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: COLORS.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    ...SHADOWS.neon,
  },
  saveButtonText: {
    color: COLORS.onPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
