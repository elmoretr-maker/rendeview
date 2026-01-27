import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
import MatchCelebration from "@/components/MatchCelebration";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
import MatchBadge from "@/components/MatchBadge";
import { useIsMatched } from "@/hooks/useIsMatched";
import { formatDistance } from "@/utils/distance";
import { Star, X, Video, Play, MapPin, ArrowLeft, Heart } from "lucide-react";
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

function SavedProfileCard({ profile, navigate, removeSavedMutation, likeMutation, passMutation, setMatchedUser, setShowCelebration }) {
  const { data: matchStatus } = useIsMatched(profile.id);
  
  const handleLike = (e) => {
    e.stopPropagation();
    likeMutation.mutate(profile.id, {
      onSuccess: (data) => {
        if (data?.matched) {
          setMatchedUser({ name: profile.name, photo: profile.photo });
          setShowCelebration(true);
        } else {
          toast.success("Profile liked!");
        }
      }
    });
  };

  const handlePass = (e) => {
    e.stopPropagation();
    passMutation.mutate(profile.id);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    removeSavedMutation.mutate(profile.id);
  };
  
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
          h="320px"
          objectFit="cover"
          bg="gray.200"
          cursor="pointer"
          onClick={() => navigate(`/profile/${profile.id}`)}
        />
        {/* Video indicator badge */}
        {profile.video_url && (
          <Flex
            position="absolute"
            top={3}
            left={3}
            align="center"
            gap={1.5}
            px={3}
            py={1.5}
            borderRadius="full"
            bg="purple.500"
            shadow="lg"
            zIndex={2}
          >
            <Play size={14} fill="white" color="white" />
            <Text fontSize="xs" fontWeight="bold" color="white">VIDEO</Text>
          </Flex>
        )}
        {/* Remove from saved button */}
        <IconButton
          icon={<Star size={18} fill="#FFD700" color="#FFD700" />}
          onClick={handleRemove}
          position="absolute"
          top={3}
          right={3}
          size="md"
          borderRadius="full"
          bg="white"
          _hover={{ bg: "gray.100", transform: "scale(1.1)" }}
          shadow="lg"
          aria-label="Remove from Top Picks"
          zIndex={2}
        />
        {/* Gradient overlay */}
        <Box 
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          h="32"
          bgGradient="linear(to-t, blackAlpha.700, transparent)"
        />
        {/* Profile info overlay */}
        <Box position="absolute" bottom={0} left={0} right={0} p={4} color="white">
          <Flex align="center" justify="space-between" mb={1}>
            <HStack spacing={2}>
              <Heading size="md" fontWeight="bold">
                {profile.name || `User ${profile.id}`}
              </Heading>
              {matchStatus?.isMatched && <MatchBadge size="sm" />}
            </HStack>
            {profile.immediate_available && (
              <Flex align="center" gap={1} px={2} py={0.5} borderRadius="full" bg="green.500">
                <Box w={2} h={2} borderRadius="full" bg="white" />
                <Text fontSize="xs" fontWeight="semibold">Online</Text>
              </Flex>
            )}
          </Flex>
          
          {/* Badges row */}
          <Flex flexWrap="wrap" gap={1.5} mb={1}>
            {profile.distance_miles != null && (
              <Badge 
                bg="whiteAlpha.300"
                color="white"
                display="inline-flex"
                alignItems="center"
                gap={1}
                px={2}
                py={0.5}
                borderRadius="full"
                fontSize="xs"
                fontWeight="semibold"
              >
                <MapPin size={10} />
                {formatDistance(profile.distance_miles)}
              </Badge>
            )}
            {profile.compatibility_score != null && (
              <Badge 
                bg="purple.500"
                color="white"
                px={2}
                py={0.5}
                borderRadius="full"
                fontSize="xs"
                fontWeight="bold"
              >
                {Math.round(profile.compatibility_score * 100)}% Match
              </Badge>
            )}
          </Flex>
          
          {profile.bio && (
            <Text fontSize="sm" opacity={0.9} noOfLines={2}>
              {profile.bio}
            </Text>
          )}
        </Box>
      </Box>
      
      {/* Action buttons */}
      <CardBody p={3}>
        <HStack spacing={2} justify="center">
          <IconButton
            icon={<X size={20} />}
            onClick={handlePass}
            colorScheme="red"
            variant="outline"
            borderRadius="full"
            size="md"
            isLoading={passMutation.isPending}
            aria-label="Pass"
            title="Pass on this profile"
          />
          <IconButton
            icon={<Heart size={20} fill={matchStatus?.isMatched ? "#E91E63" : "none"} />}
            onClick={handleLike}
            colorScheme="pink"
            variant={matchStatus?.isMatched ? "solid" : "outline"}
            borderRadius="full"
            size="md"
            isLoading={likeMutation.isPending}
            aria-label="Like"
          />
          {matchStatus?.isMatched && (
            <Button
              size="sm"
              colorScheme="green"
              leftIcon={<Video size={16} />}
              onClick={() => navigate(`/schedule/propose/${profile.id}`)}
              borderRadius="full"
            >
              Video Call
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            colorScheme="purple"
            onClick={() => navigate(`/profile/${profile.id}`)}
            borderRadius="full"
          >
            View
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
}

function SavedProfilesContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [matchedUser, setMatchedUser] = React.useState(null);

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

  const likeMutation = useMutation({
    mutationFn: async (likedId) => {
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Session expired. Please sign in.");
        navigate("/account/signin");
        return;
      }
      toast.error("Could not like profile");
    },
  });

  const passMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to pass");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success("Passed on profile");
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Session expired. Please sign in.");
        navigate("/account/signin");
        return;
      }
      toast.error("Could not pass on profile");
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
      
      {/* Match celebration modal */}
      {showCelebration && matchedUser && (
        <MatchCelebration
          matchedUser={matchedUser}
          onClose={() => {
            setShowCelebration(false);
            setMatchedUser(null);
          }}
          onSendMessage={() => {
            setShowCelebration(false);
            navigate("/messages");
          }}
          onScheduleVideo={() => {
            setShowCelebration(false);
            navigate("/schedule/proposals");
          }}
        />
      )}
      
      <Container maxW="4xl" px={4} py={8}>
        <HStack mb={6} spacing={4}>
          <IconButton
            icon={<ArrowLeft size={20} />}
            bg="purple.500"
            color="white"
            _hover={{ bg: "purple.600" }}
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
                  likeMutation={likeMutation}
                  passMutation={passMutation}
                  setMatchedUser={setMatchedUser}
                  setShowCelebration={setShowCelebration}
                />
              </GridItem>
            ))}
          </Grid>
        )}
        
        {/* Continue discovering */}
        {savedProfiles.length > 0 && savedProfiles.length < 5 && (
          <Box mt={8} textAlign="center">
            <Text color="gray.600" mb={3}>
              You can save {5 - savedProfiles.length} more profile{5 - savedProfiles.length > 1 ? 's' : ''}
            </Text>
            <Button
              colorScheme="purple"
              variant="outline"
              onClick={() => navigate("/discovery")}
            >
              Continue Discovering
            </Button>
          </Box>
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
