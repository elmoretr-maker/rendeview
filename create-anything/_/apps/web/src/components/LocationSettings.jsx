import React, { useState, useEffect, useMemo } from 'react';
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

function MapController({ center }) {
  const [map, setMap] = useState(null);
  const [useMapHook, setUseMapHook] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-leaflet').then((reactLeaflet) => {
        setUseMapHook(() => reactLeaflet.useMap);
      });
    }
  }, []);

  if (useMapHook) {
    const MapUpdater = () => {
      const mapInstance = useMapHook();
      
      useEffect(() => {
        if (mapInstance && center) {
          mapInstance.setView(center, mapInstance.getZoom());
        }
      }, [center, mapInstance]);
      
      return null;
    };
    
    return <MapUpdater />;
  }
  
  return null;
}

function LocationMap({ center, maxDistance }) {
  const [MapComponents, setMapComponents] = useState(null);
  const [L, setL] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-leaflet'),
        import('leaflet'),
        import('leaflet/dist/leaflet.css'),
      ]).then(([reactLeaflet, leaflet]) => {
        setMapComponents(reactLeaflet);
        setL(leaflet.default);
        
        delete leaflet.default.Icon.Default.prototype._getIconUrl;
        leaflet.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      });
    }
  }, []);

  if (!MapComponents || !L) {
    return (
      <Box h="300px" borderRadius="lg" overflow="hidden" borderWidth={2} borderColor="gray.200" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
        <Text color="gray.500">Loading map...</Text>
      </Box>
    );
  }

  const { MapContainer, TileLayer, Marker, Circle, useMap } = MapComponents;

  function MapCenterUpdater() {
    const map = useMap();
    
    useEffect(() => {
      if (map && center) {
        map.setView(center, map.getZoom());
      }
    }, [center, map]);
    
    return null;
  }

  return (
    <Box h="300px" borderRadius="lg" overflow="hidden" borderWidth={2} borderColor="gray.200">
      <MapContainer
        center={center}
        zoom={center[0] === 40.7128 ? 4 : 11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <MapCenterUpdater />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {center[0] !== 40.7128 && (
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
  );
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialLatitude != null) {
      setLatitude(initialLatitude);
    }
    if (initialLongitude != null) {
      setLongitude(initialLongitude);
    }
  }, [initialLatitude, initialLongitude]);

  useEffect(() => {
    if (initialMaxDistance != null) {
      setMaxDistance(initialMaxDistance);
    }
  }, [initialMaxDistance]);

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

  if (!mounted) {
    return (
      <Card shadow="md">
        <CardBody p={6}>
          <Text>Loading location settings...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card shadow="md">
      <CardBody p={6}>
        <VStack spacing={4} align="stretch">
          <Heading size="md" color="gray.800">Location & Discovery Range</Heading>
          
          <Text fontSize="sm" color="gray.600">
            Set your location to discover matches nearby. Adjust the distance slider to control how far you want to search.
          </Text>

          <LocationMap center={center} maxDistance={maxDistance} />

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
