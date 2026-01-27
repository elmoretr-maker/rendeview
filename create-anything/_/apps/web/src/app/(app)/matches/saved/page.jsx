import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
import MatchBadge from "@/components/MatchBadge";
import { useIsMatched } from "@/hooks/useIsMatched";
import { Star, X, Video, Play, MapPin, ArrowLeft } from "lucide-react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Spinner,
  Card,
  CardBody,
  IconButton,
  Badge,
  Grid,
  GridItem,
} from "@chakra-ui/react";

export function meta() {
  return [{ title: "Top Picks | Rende-View" }];
}

function SavedProfileCard({ profile, navigate, removeSavedMutation }) {
  const { data: matchStatus } = useIsMatched(profile.id);
  
  return (
    <Card
      overflow="hidden"
      shadow="lg"
      borderRadius="2xl"
      _hover={{ shadow: "xl", transform: "translateY(-2px)" }}
      transition="all 0.2s"
      bg="white"
    >
      <Box position="relative">
        <Box
          as="img"
          src={getAbsoluteUrl(profile.photo)}
          alt={profile.name || `User ${profile.id}`}
          w="full"
          h="280px"
          objectFit="cover"
          bg="gray.200"
          cursor="pointer"
          onClick={() => navigate(`/profile/${profile.id}`)}
        />
        {profile.video_url && (
          <Flex
            position="absolute"
            top={3}
            left={3}
            align="center"
            gap={1}
            px={2}
            py={1}
            borderRadius="full"
            bg="purple.500"
            shadow="md"
          >
            <Play size={12} fill="white" color="white" />
            <Text fontSize="xs" fontWeight="bold" color="white">VIDEO</Text>
          </Flex>
        )}
        <IconButton
          icon={<X size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            removeSavedMutation.mutate(profile.id);
          }}
          position="absolute"
          top={3}
          right={3}
          size="sm"
          borderRadius="full"
          bg="blackAlpha.600"
          color="white"
          _hover={{ bg: "blackAlpha.800" }}
          aria-label="Remove from Top Picks"
        />
        <Box 
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          h="24"
          bgGradient="linear(to-t, blackAlpha.700, transparent)"
        />
        <Box position="absolute" bottom={3} left={3} right={3}>
          <HStack spacing={2} mb={1}>
            <Heading size="md" color="white" fontWeight="bold">
              {profile.name || `User ${profile.id}`}
            </Heading>
            {matchStatus?.isMatched && <MatchBadge size="sm" />}
          </HStack>
          {profile.bio && (
            <Text fontSize="sm" color="whiteAlpha.900" noOfLines={2}>
              {profile.bio}
            </Text>
          )}
        </Box>
      </Box>
      <CardBody p={4}>
        <HStack justify="space-between">
          <Button
            size="sm"
            variant="outline"
            colorScheme="purple"
            onClick={() => navigate(`/profile/${profile.id}`)}
          >
            View Profile
          </Button>
          {matchStatus?.isMatched && (
            <Button
              size="sm"
              colorScheme="green"
              leftIcon={<Video size={16} />}
              onClick={() => navigate(`/video/schedule?userId=${profile.id}`)}
            >
              Schedule Video
            </Button>
          )}
        </HStack>
      </CardBody>
    </Card>
  );
}

function SavedProfilesContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: savedData, isLoading, error } = useQuery({
    queryKey: ["savedProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/saved-profiles");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load saved profiles");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const removeSavedMutation = useMutation({
    mutationFn: async (savedUserId) => {
      const res = await fetch(`/api/saved-profiles?savedUserId=${savedUserId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove from Top Picks");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedProfiles"] });
      toast.success("Removed from Top Picks");
    },
    onError: () => {
      toast.error("Could not remove from Top Picks");
    },
  });

  const savedProfiles = savedData?.savedProfiles || [];

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <VStack py={12} spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="gray.700">Loading your Top Picks...</Text>
        </VStack>
      </Box>
    );
  }

  if (error?.message === "AUTH_401") {
    return <SessionExpired />;
  }

  if (error) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="4xl" px={4} py={8}>
          <Heading size="xl" mb={4} color="gray.800">Top Picks</Heading>
          <Text color="red.500">Error loading saved profiles</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="4xl" px={4} py={8}>
        <HStack mb={6} spacing={4}>
          <IconButton
            icon={<ArrowLeft size={20} />}
            variant="ghost"
            onClick={() => navigate("/matches")}
            aria-label="Back to Matches"
          />
          <VStack align="start" spacing={0}>
            <Heading size="xl" color="gray.800">
              <Star size={28} style={{ display: 'inline', marginRight: '8px', color: '#FFD700' }} fill="#FFD700" />
              Top Picks
            </Heading>
            <Text color="gray.600" fontSize="sm">
              {savedProfiles.length}/5 profiles saved
            </Text>
          </VStack>
        </HStack>

        {savedProfiles.length === 0 ? (
          <Card bg="white" p={8} textAlign="center" borderRadius="xl">
            <VStack spacing={4}>
              <Star size={48} color="#E2E8F0" />
              <Heading size="md" color="gray.600">No Top Picks Yet</Heading>
              <Text color="gray.500">
                Save profiles you're interested in by tapping the star icon on Discovery cards.
                You can save up to 5 profiles.
              </Text>
              <Button
                colorScheme="purple"
                onClick={() => navigate("/discovery")}
              >
                Discover Profiles
              </Button>
            </VStack>
          </Card>
        ) : (
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
            {savedProfiles.map((profile) => (
              <GridItem key={profile.id}>
                <SavedProfileCard
                  profile={profile}
                  navigate={navigate}
                  removeSavedMutation={removeSavedMutation}
                />
              </GridItem>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

export default function SavedProfilesPage() {
  return (
    <ErrorBoundary>
      <SavedProfilesContent />
    </ErrorBoundary>
  );
}
