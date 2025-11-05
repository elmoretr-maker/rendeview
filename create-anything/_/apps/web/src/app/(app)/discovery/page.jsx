import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Heart, RotateCcw, Video } from "lucide-react";
import { useNavigate } from "react-router";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import MatchCelebration from "@/components/MatchCelebration";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { DiscoveryCardSkeleton } from "@/app/components/SkeletonLoader";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
import {
  Box,
  Button,
  Heading,
  Text,
  Badge,
  VStack,
  HStack,
  Flex,
  IconButton,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";

// Swipeable Card Component
function SwipeableCard({ profile, onSwipeLeft, onSwipeRight, onTap, index, totalCards, isLocked, userInterests }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const [exitX, setExitX] = React.useState(0);

  // Calculate mutual interests
  const mutualInterests = React.useMemo(() => {
    if (!userInterests || !profile.interests) return [];
    return userInterests.filter(interest => 
      profile.interests.includes(interest)
    );
  }, [userInterests, profile.interests]);

  // Check if user has availability set
  const hasAvailability = React.useMemo(() => {
    return profile.typical_availability && Array.isArray(profile.typical_availability) && profile.typical_availability.length > 0;
  }, [profile.typical_availability]);

  const handleDragEnd = (event, info) => {
    if (isLocked) return;
    
    if (Math.abs(info.offset.x) > 100) {
      setExitX(info.offset.x > 0 ? 300 : -300);
      if (info.offset.x > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }
  };

  return (
    <Box
      as={motion.div}
      style={{
        x,
        rotate,
        opacity,
        position: 'absolute',
        width: '100%',
        cursor: isLocked ? 'not-allowed' : 'grab',
      }}
      drag={isLocked ? false : "x"}
      dragConstraints={{ left: -1000, right: 1000, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: index * 10,
        zIndex: totalCards - index,
      }}
      exit={{
        x: exitX,
        opacity: 0,
        rotate: exitX > 0 ? 25 : -25,
        transition: { duration: 0.3 }
      }}
      whileDrag={isLocked ? {} : { cursor: 'grabbing', scale: 1.05 }}
      userSelect="none"
    >
      <Box 
        w="full"
        borderRadius="3xl"
        shadow="2xl"
        overflow="hidden"
        position="relative"
        bg="white"
      >
        <Box
          as="button"
          onClick={onTap}
          w="full"
          position="relative"
          textAlign="left"
        >
          {profile.photo ? (
            <Box position="relative">
              <Box
                as="img"
                src={getAbsoluteUrl(profile.photo)}
                alt={profile.name || `User ${profile.id}`}
                w="full"
                h="500px"
                objectFit="cover"
                bg="gray.100"
              />
              {/* Gradient overlay for text readability */}
              <Box 
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                h="32"
                bgGradient="linear(to-t, blackAlpha.700, transparent)"
              />
            </Box>
          ) : (
            <Flex
              w="full"
              h="500px"
              align="center"
              justify="center"
              bg="gray.100"
            >
              <Text color="gray.600">View Profile</Text>
            </Flex>
          )}
          
          {/* Profile info overlay */}
          <Box position="absolute" bottom={0} left={0} right={0} p={6} color="white">
            <Flex align="center" justify="space-between" mb={2}>
              <Heading as="h2" size="xl" fontWeight="bold">
                {profile.name || "User " + profile.id}
              </Heading>
              {profile.immediate_available && (
                <Flex align="center" gap={1.5} px={2} py={1} borderRadius="full" bg="green.500">
                  <Box w={2} h={2} borderRadius="full" bg="white" animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" />
                  <Text fontSize="xs" fontWeight="semibold">Online</Text>
                </Flex>
              )}
            </Flex>
            
            {/* Special indicators */}
            <Flex flexWrap="wrap" gap={2} mb={2}>
              {profile.liked_you && (
                <Badge 
                  colorScheme="teal"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="semibold"
                >
                  <Heart size={12} fill="white" />
                  Likes You
                </Badge>
              )}
              {mutualInterests.length > 0 && (
                <Badge 
                  colorScheme="purple"
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="semibold"
                >
                  {mutualInterests.length} Shared Interest{mutualInterests.length > 1 ? 's' : ''}
                </Badge>
              )}
              {profile.membership_tier && (
                <Badge 
                  bg="whiteAlpha.200"
                  color="white"
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="semibold"
                >
                  {profile.membership_tier.charAt(0).toUpperCase() + profile.membership_tier.slice(1)}
                </Badge>
              )}
              {hasAvailability && (
                <Badge 
                  colorScheme="green"
                  px={2.5}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="semibold"
                >
                  📅 Availability Set
                </Badge>
              )}
            </Flex>
            
            {/* Show mutual interests details */}
            {mutualInterests.length > 0 && (
              <Flex flexWrap="wrap" gap={1.5} mb={2}>
                {mutualInterests.slice(0, 3).map((interest, idx) => (
                  <Text 
                    key={idx}
                    fontSize="xs"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    bg="whiteAlpha.150"
                  >
                    {interest}
                  </Text>
                ))}
                {mutualInterests.length > 3 && (
                  <Text fontSize="xs" opacity={0.75}>+{mutualInterests.length - 3} more</Text>
                )}
              </Flex>
            )}
            
            {profile.bio && (
              <Text fontSize="sm" opacity={0.9} noOfLines={2} mt={2}>
                {profile.bio}
              </Text>
            )}
          </Box>
        </Box>

        {/* Tap to view full profile hint */}
        <Box px={6} py={4} textAlign="center" borderTop="1px" borderColor="gray.100">
          <Text fontSize="sm" opacity={0.6} color="gray.600">
            Swipe or tap photo to interact
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

function DiscoveryContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user, loading: userLoading } = useUser();
  const [videoMeetingsCount, setVideoMeetingsCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["discovery"],
    queryFn: async () => {
      const res = await fetch("/api/discovery/list");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profiles");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  useEffect(() => {
    if (user?.membership_tier === 'free') {
      fetch("/api/profile")
        .then(res => res.json())
        .then(data => {
          if (data?.user?.video_meetings_count !== undefined) {
            setVideoMeetingsCount(data.user.video_meetings_count);
          }
        })
        .catch(err => console.error("Failed to load meeting count:", err));
    }
  }, [user]);

  const [index, setIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  
  useEffect(() => {
    setIndex(0);
    setRemovedCards([]);
  }, [data]);

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
    onMutate: async (likedId) => {
      const profileIndex = profiles.findIndex(p => p.id === likedId);
      setRemovedCards(prev => [...prev, profileIndex]);
      setIndex((i) => i + 1);
      
      return { profileIndex };
    },
    onSuccess: (data, likedId) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      
      if (data?.matched) {
        const matchedProfile = profiles.find(p => p.id === likedId);
        setMatchedUser({
          name: matchedProfile?.name,
          photo: matchedProfile?.photo,
        });
        setShowCelebration(true);
      } else {
        toast.success("Profile liked!");
      }
    },
    onError: (e, likedId, context) => {
      if (context?.profileIndex !== undefined) {
        setRemovedCards(prev => prev.filter(idx => idx !== context.profileIndex));
        setIndex((i) => Math.max(0, i - 1));
      }
      
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required", {
          description: "Please sign in to continue.",
        });
        navigate("/account/signin");
        return;
      }
      toast.error("Could not perform action");
    },
  });

  const discardMutation = useMutation({
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
      if (!res.ok) throw new Error("Failed to discard");
      return res.json();
    },
    onMutate: async (blockedId) => {
      const profileIndex = profiles.findIndex(p => p.id === blockedId);
      setRemovedCards(prev => [...prev, profileIndex]);
      setIndex((i) => i + 1);
      
      return { profileIndex };
    },
    onSuccess: (data, blockedId) => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      
      if (data?.warning) {
        toast.warning(data.warning, { duration: 6000 });
      }
    },
    onError: (e, blockedId, context) => {
      if (context?.profileIndex !== undefined) {
        setRemovedCards(prev => prev.filter(idx => idx !== context.profileIndex));
        setIndex((i) => Math.max(0, i - 1));
      }
      
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required", {
          description: "Please sign in to continue.",
        });
        navigate("/account/signin");
        return;
      }
      toast.error("Could not discard profile");
    },
  });

  const profiles = data?.profiles || [];
  const visibleProfiles = profiles.filter((_, i) => !removedCards.includes(i));
  const currentIndex = profiles.findIndex((_, i) => !removedCards.includes(i));
  const current = visibleProfiles[0];

  if (userLoading || isLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <VStack pt={4} px={4} spacing={4}>
          <Heading size="lg" fontFamily="Playfair Display" fontWeight="bold" textAlign="center" color="gray.800">
            Discover Your Match
          </Heading>
          <DiscoveryCardSkeleton />
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box pt={20} px={4} bg="gray.50" minH="100vh">
        {error?.message === "AUTH_401" ? (
          <VStack spacing={3} align="start">
            <Text color="gray.700">
              Session expired. Please sign in.
            </Text>
            <Button
              onClick={() => navigate("/account/signin")}
              colorScheme="purple"
              size="lg"
              shadow="lg"
            >
              Sign In
            </Button>
          </VStack>
        ) : (
          <Text color="gray.700">Error loading profiles</Text>
        )}
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <MatchCelebration
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        matchedUser={matchedUser}
      />
      
      {user?.membership_tier === 'free' && (
        <Box px={4} pt={4}>
          <Alert 
            status="info"
            borderRadius="xl"
            borderWidth={2}
            borderColor="indigo.400"
            bg="indigo.50"
            p={4}
          >
            <Flex align="center" justify="space-between" w="full">
              <HStack spacing={3}>
                <Flex
                  w={10}
                  h={10}
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg="indigo.200"
                >
                  <Video size={24} color="#4F46E5" />
                </Flex>
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="bold" color="indigo.600">
                    Free Video Calls Today
                  </Text>
                  <Text fontSize="xs" color="indigo.500">
                    {3 - videoMeetingsCount} of 3 remaining
                  </Text>
                </VStack>
              </HStack>
              {videoMeetingsCount >= 2 && (
                <Button
                  onClick={() => navigate("/settings/subscription")}
                  size="sm"
                  colorScheme="indigo"
                  fontSize="xs"
                >
                  Upgrade
                </Button>
              )}
            </Flex>
          </Alert>
        </Box>
      )}
      
      <VStack pt={4} px={4} spacing={3}>
        <Heading size="lg" fontFamily="Playfair Display" fontWeight="bold" textAlign="center" color="gray.800">
          Discover Your Match
        </Heading>
      {current ? (
        <VStack w="full" maxW="md" mx="auto" pb={8} spacing={6}>
          {/* Card Carousel Stack */}
          <Box position="relative" w="full" h="580px">
            <AnimatePresence>
              {visibleProfiles.slice(0, 3).map((profile, idx) => (
                <SwipeableCard
                  key={profile.id}
                  profile={profile}
                  index={idx}
                  totalCards={Math.min(3, visibleProfiles.length)}
                  isLocked={idx === 0 && (likeMutation.isPending || discardMutation.isPending)}
                  userInterests={user?.interests || []}
                  onSwipeLeft={() => discardMutation.mutate(profile.id)}
                  onSwipeRight={() => likeMutation.mutate(profile.id)}
                  onTap={() => navigate(`/profile/${profile.id}`)}
                />
              ))}
            </AnimatePresence>
          </Box>

          {/* Counter and Reset */}
          <HStack spacing={3} justify="center">
            <Button
              onClick={() => setRemovedCards([])}
              isDisabled={removedCards.length === 0}
              leftIcon={<RotateCcw size={18} />}
              borderRadius="full"
              colorScheme="purple"
              variant="outline"
              bg="white"
              shadow="md"
              _hover={{ shadow: "lg" }}
            >
              Reset
            </Button>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              {currentIndex + 1} of {profiles.length}
            </Text>
          </HStack>

          {/* Action buttons */}
          <HStack spacing={6} justify="center">
            <IconButton
              onClick={() => discardMutation.mutate(current.id)}
              isDisabled={discardMutation.isPending}
              icon={<X color="#E74C3C" size={32} strokeWidth={2.5} />}
              w={20}
              h={20}
              borderRadius="full"
              bg="white"
              shadow="lg"
              _hover={{ shadow: "xl", transform: "scale(1.1)" }}
              transition="all 0.2s"
              aria-label="Pass"
            />
            <IconButton
              onClick={() => likeMutation.mutate(current.id)}
              isDisabled={likeMutation.isPending}
              icon={<Heart color="white" size={36} fill="white" strokeWidth={2.5} />}
              w={24}
              h={24}
              borderRadius="full"
              colorScheme="purple"
              shadow="xl"
              _hover={{ shadow: "2xl", transform: "scale(1.1)" }}
              transition="all 0.2s"
              aria-label="Like"
            />
          </HStack>
        </VStack>
      ) : (
        <VStack minH="60vh" justify="center" align="center" spacing={3}>
          <Text color="gray.600">No more profiles.</Text>
          <Button
            onClick={() => refetch()}
            colorScheme="purple"
            shadow="lg"
          >
            Refresh
          </Button>
        </VStack>
      )}
      </VStack>
    </Box>
  );
}

export default function Discovery() {
  return (
    <ErrorBoundary componentName="Discovery">
      <DiscoveryContent />
    </ErrorBoundary>
  );
}
