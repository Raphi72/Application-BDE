import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './ui/AppText';
import { FONTS, PALETTE, STROKE } from '../constants/theme';
import { useCategorySwipeGesture } from '../navigation/CategorySwipe';

const pageFromEvent = (event, width) =>
  Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));

/**
 * Carrousel photo prioritaire sur le swipe des catégories. Un appui ouvre la
 * photo dans une visionneuse plein écran qui conserve le balayage horizontal.
 */
export default function SwipeablePhotoGallery({
  images,
  height = 260,
  openPhotoLabel,
  closeLabel,
}) {
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const categorySwipeGesture = useCategorySwipeGesture();
  const viewerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  const galleryGesture = useMemo(() => {
    const gesture = Gesture.Native();
    return categorySwipeGesture
      ? gesture.blocksExternalGesture(categorySwipeGesture)
      : gesture;
  }, [categorySwipeGesture]);

  const labelFor = (index) =>
    openPhotoLabel
      ? openPhotoLabel(index + 1, images.length)
      : `Photo ${index + 1} / ${images.length}`;

  const openViewer = (index) => {
    setActiveIndex(index);
    setViewerVisible(true);
  };

  const positionViewer = () => {
    requestAnimationFrame(() => {
      viewerRef.current?.scrollTo({ x: activeIndex * width, animated: false });
    });
  };

  return (
    <>
      <View style={{ height }}>
        <GestureDetector gesture={galleryGesture}>
          <ScrollView
            horizontal
            pagingEnabled
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setActiveIndex(pageFromEvent(event, width))}
          >
            {images.map((uri, index) => (
              <Pressable
                key={`${uri}-${index}`}
                onPress={() => openViewer(index)}
                accessibilityRole="button"
                accessibilityLabel={labelFor(index)}
                style={{ width, height }}
              >
                <Image source={{ uri }} style={styles.inlineImage} />
              </Pressable>
            ))}
          </ScrollView>
        </GestureDetector>

        <View pointerEvents="none" style={styles.expandHint}>
          <Ionicons name="expand" size={18} color={PALETTE.ink} />
        </View>
      </View>

      <Modal
        visible={viewerVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onShow={positionViewer}
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewer}>
          <ScrollView
            ref={viewerRef}
            horizontal
            pagingEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setActiveIndex(pageFromEvent(event, width))}
          >
            {images.map((uri, index) => (
              <View
                key={`viewer-${uri}-${index}`}
                style={{ width, height: windowHeight }}
              >
                <Image source={{ uri }} style={styles.viewerImage} />
              </View>
            ))}
          </ScrollView>

          <View
            pointerEvents="none"
            style={[styles.counter, { top: Math.max(insets.top, 12) + 4 }]}
          >
            <Text style={styles.counterText}>
              {activeIndex + 1} / {images.length}
            </Text>
          </View>

          <Pressable
            onPress={() => setViewerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            hitSlop={10}
            style={[styles.closeButton, { top: Math.max(insets.top, 12) }]}
          >
            <Ionicons name="close" size={26} color={PALETTE.ink} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inlineImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: PALETTE.paperDeep,
  },
  expandHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewer: {
    flex: 1,
    backgroundColor: PALETTE.ink,
  },
  viewerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    minWidth: 58,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontFamily: FONTS.varsityBold,
    fontSize: 17,
    lineHeight: 20,
    color: PALETTE.ink,
    includeFontPadding: false,
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: STROKE,
    borderColor: PALETTE.ink,
    backgroundColor: PALETTE.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
