import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  Button,
  HStack,
  useToast,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';

export default function LocationSettings({
  latitude,
  longitude,
  maxDistance,
  onSave,
}) {
  const [localLat, setLocalLat] = useState(latitude || null);
  const [localLng, setLocalLng] = useState(longitude || null);
  const [distance, setDistance] = useState(maxDistance || 100);
  const [locationText, setLocationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  // Update local state when props change
  useEffect(() => {
    if (latitude != null) setLocalLat(latitude);
    if (longitude != null) setLocalLng(longitude);
    if (maxDistance != null) setDistance(maxDistance);
  }, [latitude, longitude, maxDistance]);

  // Reverse geocode coordinates to display location text
  useEffect(() => {
    if (localLat && localLng && !locationText) {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${localLat}&lon=${localLng}&format=json`)
        .then((res) => res.json())
        .then((data) => {
          if (data.display_name) {
            setLocationText(data.display_name.split(',').slice(0, 3).join(','));
          }
        })
        .catch(() => {
          // Silently fail reverse geocoding
        });
    }
  }, [localLat, localLng]);

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation. Please enter your location manually.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setLocalLat(lat);
        setLocalLng(lng);
        
        // Reverse geocode to get location text
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            setLocationText(data.display_name.split(',').slice(0, 3).join(','));
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
        }
        
        // Auto-save
        if (onSave) {
          onSave(lat, lng, distance);
        }
        
        setIsLoading(false);
        toast({
          title: 'Location updated',
          description: 'Your current location has been set.',
          status: 'success',
          duration: 3000,
        });
      },
      (error) => {
        setIsLoading(false);
        toast({
          title: 'Location access denied',
          description: 'Please allow location access or enter your location manually.',
          status: 'error',
          duration: 5000,
        });
      }
    );
  };

  const handleSearchLocation = async () => {
    if (!locationText.trim()) {
      toast({
        title: 'Enter a location',
        description: 'Please enter a city, address, or ZIP code.',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationText)}&format=json&limit=1`
      );
      const data = await res.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        setLocalLat(lat);
        setLocalLng(lng);
        
        // Auto-save
        if (onSave) {
          onSave(lat, lng, distance);
        }
        
        toast({
          title: 'Location set',
          description: `Location set to ${data[0].display_name.split(',').slice(0, 3).join(',')}`,
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Location not found',
          description: 'Please try a different city or address.',
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Search failed',
        description: 'Unable to search for location. Please try again.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDistanceChange = (value) => {
    setDistance(value);
    // Auto-save distance changes
    if (onSave && localLat && localLng) {
      onSave(localLat, localLng, value);
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      <Box>
        <FormControl>
          <FormLabel fontWeight="600" color="gray.700">
            📍 Your Location
          </FormLabel>
          <Input
            placeholder="Enter city, address, or ZIP code"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearchLocation();
              }
            }}
            size="lg"
          />
          <HStack mt={3} spacing={3}>
            <Button
              onClick={handleSearchLocation}
              isLoading={isLoading}
              colorScheme="purple"
              size="md"
              flex={1}
            >
              Search Location
            </Button>
            <Button
              onClick={handleUseCurrentLocation}
              isLoading={isLoading}
              colorScheme="purple"
              variant="outline"
              size="md"
              flex={1}
            >
              📍 Use Current Location
            </Button>
          </HStack>
        </FormControl>

        {localLat && localLng && (
          <Box mt={3} p={3} bg="green.50" borderRadius="md" borderWidth={1} borderColor="green.200">
            <Text fontSize="sm" color="green.700" fontWeight="500">
              ✓ Location set: {localLat.toFixed(4)}°, {localLng.toFixed(4)}°
            </Text>
          </Box>
        )}
      </Box>

      <FormControl>
        <FormLabel fontWeight="600" color="gray.700">
          🎯 Search Radius: {distance} km
        </FormLabel>
        <Text fontSize="sm" color="gray.600" mb={3}>
          Find matches within this distance from your location
        </Text>
        <Slider
          value={distance}
          onChange={handleDistanceChange}
          min={1}
          max={200}
          step={1}
          colorScheme="purple"
        >
          <SliderTrack bg="gray.200">
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb boxSize={6} bg="purple.500" />
        </Slider>
        <HStack justify="space-between" mt={2}>
          <Text fontSize="xs" color="gray.500">1 km</Text>
          <Text fontSize="xs" color="gray.500">200 km</Text>
        </HStack>
      </FormControl>

      {!localLat || !localLng ? (
        <Box p={4} bg="yellow.50" borderRadius="md" borderWidth={1} borderColor="yellow.200">
          <Text fontSize="sm" color="yellow.800">
            <strong>💡 Note:</strong> Set your location to enable proximity-based matching. Without a location, you'll see all available matches.
          </Text>
        </Box>
      ) : null}
    </VStack>
  );
}
