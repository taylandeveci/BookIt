import { useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { Business } from '../types';
import { calculateDistance } from '../lib/calculateDistance';

export interface BusinessLocationResult {
  distance: string | null;
  hasCoordinates: boolean;
  coordinates: { latitude: number; longitude: number } | null;
  openMapModal: () => Promise<void>;
  closeMapModal: () => void;
  modalVisible: boolean;
  userCoords: { latitude: number; longitude: number } | null;
  isLocating: boolean;
}

export function useBusinessLocation(
  business: Business | null | undefined,
  externalUserCoords?: { latitude: number; longitude: number } | null,
): BusinessLocationResult {
  const { t } = useTranslation();
  const [internalUserCoords, setInternalUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const coordinates =
    business?.locationLat && business?.locationLng
      ? { latitude: Number(business.locationLat), longitude: Number(business.locationLng) }
      : null;

  const hasCoordinates = coordinates !== null;

  // When externalUserCoords is explicitly passed (even as null), use it.
  // When omitted entirely (undefined), fall back to internally managed coords.
  const userCoords = externalUserCoords !== undefined ? externalUserCoords : internalUserCoords;

  const distance: string | null = (() => {
    if (!hasCoordinates) return null;
    if (!userCoords) return t('search.distanceUnavailable');
    const meters = calculateDistance(userCoords, coordinates!);
    if (meters < 1000) return `${Math.round(meters)} m uzakta`;
    return `${(meters / 1000).toFixed(1)} km uzakta`;
  })();

  const openMapModal = async () => {
    if (!hasCoordinates) {
      Alert.alert(
        t('businessDetail.locationNotAvailableTitle'),
        t('businessDetail.locationNotAvailable'),
      );
      return;
    }
    setIsLocating(true);
    setModalVisible(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const result = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setInternalUserCoords({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
      } catch {
        // map still shows business pin without user location dot
      }
    }
    setIsLocating(false);
  };

  return {
    distance,
    hasCoordinates,
    coordinates,
    openMapModal,
    closeMapModal: () => setModalVisible(false),
    modalVisible,
    userCoords,
    isLocating,
  };
}
