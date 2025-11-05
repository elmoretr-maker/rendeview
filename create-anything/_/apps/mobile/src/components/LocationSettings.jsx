import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';

const COLORS = {
  primary: '#5B3BAF',
  secondary: '#00BFA6',
  text: '#2C3E50',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  error: '#EF4444',
  gray: '#9CA3AF',
};

export default function LocationSettings({ 
  initialLatitude, 
  initialLongitude, 
  initialMaxDistance = 100,
  onSave,
  fontLoaded = true 
}) {
  const [latitude, setLatitude] = useState(initialLatitude || null);
  const [longitude, setLongitude] = useState(initialLongitude || null);
  const [maxDistance, setMaxDistance] = useState(initialMaxDistance);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const hasLocation = latitude != null && longitude != null;

  const region = hasLocation
    ? {
        latitude,
        longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }
    : {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 50,
        longitudeDelta: 50,
      };

  const getCurrentLocation = async () => {
    setGettingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to find matches nearby. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      setGettingLocation(false);
      
      Alert.alert('Success', 'Your location has been set.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Error',
        'Could not get your location. Please try again.',
        [{ text: 'OK' }]
      );
      setGettingLocation(false);
    }
  };

  const handleSave = async () => {
    if (latitude == null || longitude == null) {
      Alert.alert(
        'Location Required',
        'Please set your location before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      await onSave({ latitude, longitude, max_distance: maxDistance });
      Alert.alert('Success', 'Location preferences saved.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Error',
        'Could not save location preferences.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const textStyle = fontLoaded
    ? { fontFamily: 'Inter_400Regular' }
    : {};
  const boldTextStyle = fontLoaded
    ? { fontFamily: 'Inter_600SemiBold' }
    : { fontWeight: '600' };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, boldTextStyle]}>Location & Discovery Range</Text>
      
      <Text style={[styles.description, textStyle]}>
        Set your location to discover matches nearby. Adjust the distance slider to control how far you want to search.
      </Text>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          scrollEnabled={true}
          zoomEnabled={true}
        >
          {hasLocation && (
            <>
              <Marker
                coordinate={{ latitude, longitude }}
                pinColor={COLORS.primary}
              />
              <Circle
                center={{ latitude, longitude }}
                radius={maxDistance * 1000}
                strokeColor={COLORS.primary}
                fillColor="rgba(91, 59, 175, 0.1)"
                strokeWidth={2}
              />
            </>
          )}
        </MapView>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.outlineButton]}
        onPress={getCurrentLocation}
        disabled={gettingLocation}
      >
        {gettingLocation ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={[styles.buttonText, styles.outlineButtonText, textStyle]}>
            {hasLocation ? 'Update My Location' : 'Use My Current Location'}
          </Text>
        )}
      </TouchableOpacity>

      {hasLocation && (
        <Text style={[styles.coordinates, textStyle]}>
          Current: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </Text>
      )}

      <View style={styles.sliderContainer}>
        <Text style={[styles.sliderLabel, boldTextStyle]}>
          Discovery Range: {maxDistance} km
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={200}
          step={1}
          value={maxDistance}
          onValueChange={setMaxDistance}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.gray}
          thumbTintColor={COLORS.primary}
        />
        <View style={styles.sliderLabels}>
          <Text style={[styles.sliderLabelText, textStyle]}>1 km</Text>
          <Text style={[styles.sliderLabelText, textStyle]}>200 km</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton, !hasLocation && styles.disabledButton]}
        onPress={handleSave}
        disabled={!hasLocation || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={[styles.buttonText, styles.primaryButtonText, textStyle]}>
            Save Location Settings
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 16,
    lineHeight: 18,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  outlineButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
  },
  outlineButtonText: {
    color: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.white,
  },
  coordinates: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
    marginVertical: 4,
  },
  sliderContainer: {
    marginVertical: 12,
  },
  sliderLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    fontSize: 11,
    color: COLORS.gray,
  },
});
