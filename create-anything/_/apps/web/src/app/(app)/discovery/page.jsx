import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Heart, RotateCcw, Video, ChevronLeft, ChevronRight, Star, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
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
function SwipeableCard({ profile, onSwipeLeft, onSwipeRight, onTap, index, totalCards, isLocked, userInterests, isSaved, onSave }) {
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
              {/* Save button */}
              <IconButton
                icon={<Star size={20} fill={isSaved ? "#FFD700" : "none"} color={isSaved ? "#FFD700" : "white"} strokeWidth={2.5} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave();
                }}
                position="absolute"
                top={4}
                right={4}
                borderRadius="full"
                bg={isSaved ? "white" : "blackAlpha.600"}
                _hover={{ bg: isSaved ? "white" : "blackAlpha.800", transform: "scale(1.1)" }}
                shadow="lg"
                w={12}
                h={12}
                transition="all 0.2s"
                aria-label={isSaved ? "Remove from Top Picks" : "Add to Top Picks"}
                zIndex={2}
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
              {profile.compatibility_score != null && (
                <Badge 
                  bg="gradient-to-r from-pink.500 to-purple.500"
                  color="white"
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="bold"
                  shadow="md"
                >
                  {Math.round(profile.compatibility_score * 100)}% Match
                </Badge>
              )}
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [removedCards, setRemovedCards] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [savedProfileIds, setSavedProfileIds] = useState(new Set());
  const [confirmDismiss, setConfirmDismiss] = useState(false);

  // Load saved profiles
  const { data: savedData } = useQuery({
    queryKey: ["savedProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/saved-profiles");
      if (!res.ok) throw new Error("Failed to load saved profiles");
      const data = await res.json();
      const ids = new Set(data.savedProfiles?.map(p => p.id) || []);
      setSavedProfileIds(ids);
      return data;
    },
  });
  
  useEffect(() => {
    setCurrentIndex(0);
    setRemovedCards([]);
  }, [data]);

  const profiles = data?.profiles || [];
  const visibleProfiles = profiles.filter((_, i) => !removedCards.includes(i));

  // Clamp currentIndex when visible profiles change (after like/block)
  useEffect(() => {
    const maxIndex = Math.max(0, visibleProfiles.length - 1);
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [visibleProfiles.length, currentIndex]);

  // Reset confirmDismiss when profile changes (using index and visible profiles)
  useEffect(() => {
    setConfirmDismiss(false);
  }, [currentIndex, visibleProfiles.length]);

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

  // Skip to next profile without blocking (swipe left)
  const handleSkip = () => {
    setConfirmDismiss(false);
    setCurrentIndex((i) => {
      const maxIndex = Math.max(0, visibleProfiles.length - 1);
      return Math.min(i + 1, maxIndex);
    });
  };

  // Go back to previous profile
  const handlePrevious = () => {
    setConfirmDismiss(false);
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  // Save/unsave profile mutation
  const saveMutation = useMutation({
    mutationFn: async ({ profileId, action }) => {
      if (action === "save") {
        const res = await fetch("/api/saved-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedUserId: profileId }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to save profile");
        }
        return res.json();
      } else {
        const res = await fetch(`/api/saved-profiles?savedUserId=${profileId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to unsave profile");
        return res.json();
      }
    },
    onSuccess: (data, { profileId, action }) => {
      queryClient.invalidateQueries({ queryKey: ["savedProfiles"] });
      
      if (action === "save") {
        if (data.alreadySaved) {
          toast.info("Profile already in Top Picks");
        } else if (data.limitReached) {
          toast.error("Maximum 5 profiles allowed in Top Picks");
        } else {
          setSavedProfileIds(prev => new Set([...prev, profileId]));
          toast.success("Added to Top Picks ⭐");
        }
      } else {
        setSavedProfileIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(profileId);
          return newSet;
        });
        toast.success("Removed from Top Picks");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Could not update Top Picks");
    },
  });

  // Handle dismiss with two-tap confirmation
  const handleDismiss = (profileId) => {
    if (!confirmDismiss) {
      setConfirmDismiss(true);
      toast.warning("Tap X again to permanently dismiss this profile", {
        duration: 3000,
      });
    } else {
      setConfirmDismiss(false);
      blockMutation.mutate(profileId);
    }
  };

  // Permanent block (separate explicit action)
  const blockMutation = useMutation({
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
      if (!res.ok) throw new Error("Failed to block");
      return res.json();
    },
    onMutate: async (blockedId) => {
      const profileIndex = profiles.findIndex(p => p.id === blockedId);
      setRemovedCards(prev => [...prev, profileIndex]);
      
      return { profileIndex };
    },
    onSuccess: (data, blockedId) => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success("Profile blocked");
      
      if (data?.warning) {
        toast.warning(data.warning, { duration: 6000 });
      }
    },
    onError: (e, blockedId, context) => {
      if (context?.profileIndex !== undefined) {
        setRemovedCards(prev => prev.filter(idx => idx !== context.profileIndex));
      }
      
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required", {
          description: "Please sign in to continue.",
        });
        navigate("/account/signin");
        return;
      }
      toast.error("Could not block profile");
    },
  });

  const safeCurrentIndex = Math.min(Math.max(0, currentIndex), Math.max(0, visibleProfiles.length - 1));
  const current = visibleProfiles[safeCurrentIndex];
  const isFirstProfile = safeCurrentIndex === 0;
  const isLastProfile = safeCurrentIndex >= visibleProfiles.length - 1;

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
    if (error?.message === "AUTH_401") {
      return <SessionExpired />;
    }
    return (
      <Box pt={20} px={4} bg="gray.50" minH="100vh">
        <Text color="gray.700">Error loading profiles</Text>
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
              {visibleProfiles.slice(safeCurrentIndex, safeCurrentIndex + 3).map((profile, idx) => (
                <SwipeableCard
                  key={profile.id}
                  profile={profile}
                  index={idx}
                  totalCards={Math.min(3, visibleProfiles.length - safeCurrentIndex)}
                  isLocked={idx === 0 && likeMutation.isPending}
                  userInterests={user?.interests || []}
                  onSwipeLeft={handleSkip}
                  onSwipeRight={() => likeMutation.mutate(profile.id)}
                  onTap={() => navigate(`/profile/${profile.id}`)}
                  isSaved={savedProfileIds.has(profile.id)}
                  onSave={() => {
                    const action = savedProfileIds.has(profile.id) ? "unsave" : "save";
                    saveMutation.mutate({ profileId: profile.id, action });
                  }}
                />
              ))}
            </AnimatePresence>
          </Box>

          {/* Navigation Counter */}
          <HStack spacing={4} justify="center">
            <IconButton
              onClick={handlePrevious}
              isDisabled={isFirstProfile}
              icon={<ChevronLeft size={24} />}
              borderRadius="full"
              variant="outline"
              colorScheme="purple"
              bg="white"
              shadow="md"
              _hover={{ shadow: "lg" }}
              aria-label="Previous profile"
            />
            <Text fontSize="sm" fontWeight="medium" color="gray.700" minW="80px" textAlign="center">
              {safeCurrentIndex + 1} of {visibleProfiles.length}
            </Text>
            <IconButton
              onClick={handleSkip}
              isDisabled={isLastProfile}
              icon={<ChevronRight size={24} />}
              borderRadius="full"
              variant="outline"
              colorScheme="purple"
              bg="white"
              shadow="md"
              _hover={{ shadow: "lg" }}
              aria-label="Next profile"
            />
          </HStack>

          {/* Action buttons */}
          <HStack spacing={6} justify="center" align="center">
            <VStack 
              spacing={1}
              p={3}
              borderWidth={3}
              borderColor={confirmDismiss ? "red.500" : "red.300"}
              borderRadius="2xl"
              bg={confirmDismiss ? "red.50" : "white"}
              shadow="lg"
              transition="all 0.3s"
            >
              {confirmDismiss && (
                <HStack spacing={1} mb={1}>
                  <AlertTriangle color="#E74C3C" size={16} />
                  <Text fontSize="xs" fontWeight="bold" color="red.600">
                    Are you sure?
                  </Text>
                </HStack>
              )}
              <IconButton
                onClick={() => handleDismiss(current.id)}
                isDisabled={blockMutation.isPending}
                icon={<X color="#E74C3C" size={32} strokeWidth={2.5} />}
                w={20}
                h={20}
                borderRadius="full"
                bg="white"
                shadow="md"
                _hover={{ shadow: "xl", transform: "scale(1.05)", bg: "red.50" }}
                transition="all 0.2s"
                aria-label={confirmDismiss ? "Confirm dismiss" : "Not interested (tap twice to dismiss)"}
              />
              {!confirmDismiss && (
                <HStack spacing={1} mt={1}>
                  <AlertTriangle color="#E74C3C" size={12} />
                  <Text fontSize="2xs" fontWeight="medium" color="red.500">
                    Permanent
                  </Text>
                </HStack>
              )}
            </VStack>
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
        <VStack minH="60vh" justify="center" align="center" spacing={4} px={6}>
          <Box textAlign="center">
            <Text fontSize="2xl" fontWeight="bold" color="gray.700" mb={2}>
              You've reached the end!
            </Text>
            <Text color="gray.600" mb={4}>
              {visibleProfiles.length > 0 
                ? "Use the 'Previous' button above to browse back through profiles, or refresh to check for new matches."
                : "No profiles to show right now. Check back later for new matches!"}
            </Text>
          </Box>
          <VStack spacing={2}>
            <Button
              onClick={() => refetch()}
              colorScheme="purple"
              shadow="lg"
              size="lg"
            >
              Check for New Matches
            </Button>
            {visibleProfiles.length > 0 && (
              <Button
                onClick={() => setCurrentIndex(0)}
                variant="outline"
                colorScheme="purple"
                size="md"
              >
                Start Over from Beginning
              </Button>
            )}
          </VStack>
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
