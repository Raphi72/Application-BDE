import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Text, { TextInput } from '../../components/ui/AppText';
import { PopButton, RoundButton } from '../../components/ui/Pop';
import { SectionTitle, Sticker } from '../../components/ui/Deco';
import { DetailHeader } from '../../components/ui/Headers';
import { showImagePicker, uploadImage } from '../../services/imageUpload';
import { useLanguage } from '../../context/LanguageContext';
import { confirmAction, showMessage } from '../../utils/dialogs';
import { COLORS, FONTS, PALETTE, STROKE } from '../../constants/theme';

/**
 * Kit partagé des écrans d'administration : état des formulaires en modale,
 * upload d'images, validation et composants NØVYX (modale, sections, champs,
 * puces, images, actions sous une carte).
 */

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

/**
 * Liste des images d'un champ image (URL simple ou tableau JSON d'URLs).
 */
export function parseImages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // pas du JSON : URL simple
  }
  return [value];
}

// Partie date d'une valeur ISO ("2026-10-15T18:00:00" -> "2026-10-15").
export const dayOnly = (value) => (value ? String(value).split('T')[0] : '');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// Date AAAA-MM-JJ existante (rejette le 31 février).
export const isValidDate = (value) => {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// Heure HH:MM (ou HH:MM:SS).
export const isValidTime = (value) => TIME_RE.test(value);

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * État d'un formulaire admin en modale : valeurs, élément en cours d'édition,
 * et confirmation avant de fermer si la saisie a changé depuis l'ouverture
 * (ouvrir un élément existant puis le refermer sans rien toucher ne demande
 * donc rien).
 * @param {Object} emptyForm - Valeurs d'un formulaire vierge (constante de module)
 */
export function useAdminForm(emptyForm) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const initialRef = useRef(emptyForm);

  const open = useCallback(
    (item = null, values = emptyForm) => {
      initialRef.current = values;
      setForm(values);
      setEditing(item);
      setVisible(true);
    },
    [emptyForm]
  );

  // Accepte une valeur ou une fonction (valeur précédente -> nouvelle valeur).
  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: typeof value === 'function' ? value(prev[key]) : value }));
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const requestClose = async () => {
    const dirty = JSON.stringify(form) !== JSON.stringify(initialRef.current);
    if (dirty) {
      const discard = await confirmAction({
        title: t('admin.discardChangesTitle'),
        message: t('admin.discardChangesConfirm'),
        confirmLabel: t('admin.discardChanges'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!discard) return;
    }
    setVisible(false);
  };

  return { visible, editing, form, setField, open, close, requestClose };
}

/**
 * Choix d'une image (galerie ou appareil photo) puis upload dans le dossier
 * Storage donné.
 * @param {string} folder - Dossier Supabase Storage ('events', 'news', 'clubs')
 * @param {Function} onUploaded - Appelée avec l'URL publique de l'image
 */
export function useImageUploader(folder, onUploaded) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);

  const pick = () => {
    showImagePicker(async (selected) => {
      if (!selected) return;
      setUploading(true);
      try {
        const url = await uploadImage(selected.uri, folder);
        onUploaded(url);
      } catch (error) {
        console.error('Erreur upload:', error);
        showMessage(t('common.error'), `${t('admin.imageUploadError')}\n\n${error.message ?? ''}`.trim());
      } finally {
        setUploading(false);
      }
    });
  };

  return { pick, uploading };
}

// ---------------------------------------------------------------------------
// Composants
// ---------------------------------------------------------------------------

/**
 * Haut de liste admin : bouton de création à la couleur de la rubrique, puis
 * titre de section avec compteur.
 */
export function AdminListHeader({ actionLabel, onAction, color, title, count }) {
  return (
    <View>
      <PopButton title={actionLabel} icon="add" color={color} onPress={onAction} containerStyle={styles.createButton} />
      <SectionTitle title={title} count={count} color={color} />
    </View>
  );
}

/**
 * Actions sous une carte de la liste : modifier / supprimer.
 */
export function AdminItemActions({ onEdit, onDelete }) {
  const { t } = useLanguage();
  return (
    <View style={styles.itemActions}>
      <PopButton
        compact
        variant="light"
        icon="create-outline"
        title={t('common.edit')}
        onPress={onEdit}
        containerStyle={styles.itemAction}
      />
      <PopButton
        compact
        variant="danger"
        icon="trash-outline"
        title={t('common.delete')}
        onPress={onDelete}
        containerStyle={styles.itemAction}
      />
    </View>
  );
}

/**
 * Modale plein écran d'un formulaire admin : header de détail à la couleur de
 * la rubrique avec bouton fermer, contenu défilant et, en option, une barre
 * d'action fixée en bas.
 */
export function AdminFormModal({ visible, title, color, onClose, footer, children }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  // Translucide (Android) : la modale passe sous les barres système comme le
  // reste de l'app ; sinon le header ajoutait insets.top sous une barre d'état
  // déjà réservée, et laissait un vide en haut du bandeau.
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.modal}>
        <DetailHeader
          title={title}
          color={color}
          right={<RoundButton icon="close" onPress={onClose} size={40} accessibilityLabel={t('common.close')} />}
        />
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.modal}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/**
 * Bloc de formulaire : carte blanche contour encre et titre Display.
 */
export function FormSection({ title, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

/**
 * Libellé d'un champ (astérisque si obligatoire) et aide optionnelle.
 */
export function FieldLabel({ label, required = false, hint }) {
  return (
    <>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );
}

/**
 * Groupe de formulaire sans champ texte (puces, images…) : libellé et
 * espacement identiques à FormField.
 */
export function FormGroup({ label, required, hint, children, style }) {
  return (
    <View style={[styles.field, style]}>
      <FieldLabel label={label} required={required} hint={hint} />
      {children}
    </View>
  );
}

/**
 * Champ de formulaire : libellé, aide optionnelle et champ papier contour
 * encre, surligné pendant la saisie.
 */
export function FormField({
  label,
  required = false,
  hint,
  multiline = false,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, containerStyle]}>
      <FieldLabel label={label} required={required} hint={hint} />
      <TextInput
        {...inputProps}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={COLORS.textSecondary}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, multiline && styles.textArea, focused && styles.inputFocused, style]}
      />
    </View>
  );
}

/**
 * Choix unique parmi des puces en pilule. L'option choisie prend la couleur
 * de la rubrique et une coche (l'état ne repose pas que sur la couleur).
 * @param {Array<string|{key: string, label: string}>} options
 */
export function ChipSelect({ options, value, onChange, color = PALETTE.sun, style }) {
  return (
    <View style={[styles.chips, style]}>
      {options.map((option) => {
        const key = typeof option === 'string' ? option : option.key;
        const label = typeof option === 'string' ? option : option.label;
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={4}
            style={[styles.chip, active && { backgroundColor: color }]}
          >
            {active ? <Ionicons name="checkmark" size={15} color={PALETTE.ink} style={{ marginRight: 4 }} /> : null}
            <Text style={styles.chipText}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Images d'un élément : vignettes (la première sert de couverture sur les
 * cartes), bouton de retrait, et tuile d'ajout.
 */
export function ImagesField({ images, onAdd, onRemove, uploading = false, hint }) {
  const { t } = useLanguage();
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.images}>
        {images.map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.thumbWrap}>
            <Image source={{ uri }} style={styles.thumb} />
            <Pressable
              onPress={() => onRemove(index)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('admin.removeImage')}
              style={styles.thumbRemove}
            >
              <Ionicons name="close" size={16} color={PALETTE.paper} />
            </Pressable>
            {index === 0 ? (
              <Sticker label={t('admin.cover')} color={PALETTE.sun} rotate={-3} small style={styles.coverSticker} />
            ) : null}
          </View>
        ))}
        <Pressable
          onPress={onAdd}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={t('admin.addImage')}
          style={styles.addTile}
        >
          {uploading ? (
            <ActivityIndicator color={PALETTE.ink} />
          ) : (
            <>
              <Ionicons name="add" size={30} color={PALETTE.ink} />
              <Text style={styles.addTileText}>{t('admin.addImage')}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
      {hint ? <Text style={[styles.hint, { marginTop: 10, marginBottom: 0 }]}>{hint}</Text> : null}
    </View>
  );
}

const THUMB = 104;

const styles = StyleSheet.create({
  createButton: {
    marginBottom: 22,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  itemAction: {
    flex: 1,
  },
  modal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: PALETTE.paper,
    borderTopWidth: STROKE,
    borderTopColor: PALETTE.ink,
  },
  section: {
    backgroundColor: PALETTE.white,
    borderRadius: 20,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    padding: 16,
    paddingBottom: 4,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    lineHeight: 24,
    color: PALETTE.ink,
    marginBottom: 14,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: PALETTE.ink,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: PALETTE.paper,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: PALETTE.ink,
  },
  inputFocused: {
    backgroundColor: '#FFF3CF',
  },
  textArea: {
    minHeight: 110,
    paddingTop: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: PALETTE.white,
    borderWidth: 2,
    borderColor: PALETTE.ink,
  },
  chipText: {
    fontFamily: FONTS.varsity,
    fontSize: 16,
    lineHeight: 19,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  images: {
    gap: 12,
    paddingBottom: 2,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.paperDeep,
  },
  thumbRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverSticker: {
    position: 'absolute',
    left: 6,
    bottom: 6,
  },
  addTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: PALETTE.ink,
    borderStyle: 'dashed',
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: {
    fontFamily: FONTS.varsity,
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: PALETTE.ink,
    textAlign: 'center',
    marginTop: 2,
    includeFontPadding: false,
  },
});
