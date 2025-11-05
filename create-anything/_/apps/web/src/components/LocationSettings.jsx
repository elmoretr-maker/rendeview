import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  Button,
  HStack,
  Card,
  CardBody,
  Heading,
  useToast,
} from '@chakra-ui/react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapController({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

export default function LocationSettings({ 
  initialLatitude, 
  initialLongitude, 
  initialMaxDistance,
  onSave 
}) {
  const toast = useToast();
  const [latitude, setLatitude] = useState(initialLatitude || null);
  const [longitude, setLongitude] = useState(initialLongitude || null);
  const [maxDistance, setMaxDistance] = useState(initialMaxDistance ?? 100);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const center = useMemo(() => {
    if (latitude != null && longitude != null) {
      return [latitude, longitude];
    }
    return [40.7128, -74.0060];
  }, [latitude, longitude]);

  const hasLocation = latitude != null && longitude != null;

  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        status: 'error',
        duration: 3000,
      });
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setGettingLocation(false);
        toast({
          title: 'Location found',
          description: 'Your current location has been set.',
          status: 'success',
          duration: 2000,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: 'Location access denied',
          description: 'Please allow location access in your browser settings.',
          status: 'error',
          duration: 3000,
        });
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSave = async () => {
    if (latitude == null || longitude == null) {
      toast({
        title: 'Location required',
        description: 'Please set your location before saving.',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      await onSave({ latitude, longitude, max_distance: maxDistance });
      toast({
        title: 'Location saved',
        description: 'Your location preferences have been updated.',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save location preferences.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="md">
      <CardBody p={6}>
        <VStack spacing={4} align="stretch">
          <Heading size="md" color="gray.800">Location & Discovery Range</Heading>
          
          <Text fontSize="sm" color="gray.600">
            Set your location to discover matches nearby. Adjust the distance slider to control how far you want to search.
          </Text>

          <Box h="300px" borderRadius="lg" overflow="hidden" borderWidth={2} borderColor="gray.200">
            <MapContainer
              center={center}
              zoom={hasLocation ? 11 : 4}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <MapController center={center} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {hasLocation && (
                <>
                  <Marker position={center} />
                  <Circle
                    center={center}
                    radius={maxDistance * 1000}
                    pathOptions={{
                      color: '#7c3aed',
                      fillColor: '#7c3aed',
                      fillOpacity: 0.1,
                    }}
                  />
                </>
              )}
            </MapContainer>
          </Box>

          <Button
            onClick={getCurrentLocation}
            isLoading={gettingLocation}
            loadingText="Getting location..."
            colorScheme="purple"
            variant="outline"
            size="sm"
          >
            {hasLocation ? 'Update My Location' : 'Use My Current Location'}
          </Button>

          {hasLocation && (
            <Text fontSize="xs" color="gray.500">
              Current: {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
          )}

          <FormControl>
            <FormLabel fontWeight="semibold" color="gray.800">
              Discovery Range: {maxDistance} km
            </FormLabel>
            <Slider
              value={maxDistance}
              onChange={setMaxDistance}
              min={1}
              max={200}
              step={1}
              colorScheme="purple"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb boxSize={6} />
            </Slider>
            <HStack justify="space-between" mt={1}>
              <Text fontSize="xs" color="gray.500">1 km</Text>
              <Text fontSize="xs" color="gray.500">200 km</Text>
            </HStack>
          </FormControl>

          <Button
            onClick={handleSave}
            isLoading={loading}
            loadingText="Saving..."
            colorScheme="purple"
            isDisabled={!hasLocation}
          >
            Save Location Settings
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
}
