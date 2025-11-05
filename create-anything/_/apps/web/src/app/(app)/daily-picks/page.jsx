import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, X, Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import MatchCelebration from "@/components/MatchCelebration";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Card,
  SimpleGrid,
  Badge,
  Flex,
  Divider,
  Image,
} from "@chakra-ui/react";

export default function DailyPicks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [matchedUser, setMatchedUser] = React.useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dailyPicks"],
    queryFn: async () => {
      const res = await fetch("/api/daily-picks");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load daily picks");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
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
    onSuccess: (data, likedId) => {
      queryClient.invalidateQueries({ queryKey: ["dailyPicks"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      
      if (data?.matched) {
        const likedPick = picks.find(p => p.id === likedId);
        setMatchedUser({
          name: likedPick?.name,
          photo: likedPick?.photo,
        });
        setShowCelebration(true);
      } else {
        toast.success("Profile liked!");
      }
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
      queryClient.invalidateQueries({ queryKey: ["dailyPicks"] });
      toast.success("Profile passed");
    },
    onError: (e) => {
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Session expired. Please sign in.");
        navigate("/account/signin");
        return;
      }
      toast.error("Could not pass profile");
    },
  });

  const picks = data?.picks || [];
  const generated = data?.generated || false;

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <VStack minH="60vh" justify="center">
          <Spinner size="xl" color="purple.500" thickness="4px" />
        </VStack>
      </Box>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <VStack align="start" spacing={4}>
            <Text color="gray.700">Session expired. Please sign in.</Text>
            <Button
              onClick={() => navigate("/account/signin")}
              colorScheme="purple"
              shadow="md"
            >
              Sign In
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      
      <Container maxW="4xl" px={4} py={8}>
        <VStack textAlign="center" mb={8} spacing={2}>
          <HStack justify="center" spacing={2}>
            <Sparkles size={28} color="#7c3aed" />
            <Heading size="2xl" color="gray.800">
              Daily Picks
            </Heading>
          </HStack>
          <Text color="gray.600">
            {generated ? "Fresh" : "Today's"} curated matches just for you
          </Text>
          <Text fontSize="sm" color="gray.500">
            10 compatible profiles selected daily based on your interests and activity
          </Text>
        </VStack>

        {picks.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Text color="gray.700">No picks available today. Check back tomorrow!</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {picks.map((pick) => (
              <Card
                key={pick.id}
                shadow="md"
                overflow="hidden"
              >
                <Button
                  onClick={() => navigate(`/profile/${pick.id}`)}
                  variant="unstyled"
                  w="full"
                  p={0}
                  h="auto"
                >
                  {pick.photo ? (
                    <Box position="relative">
                      <Image
                        src={pick.photo}
                        alt={pick.name || "User"}
                        w="full"
                        h="64"
                        objectFit="cover"
                        bg="gray.100"
                      />
                      <Box
                        position="absolute"
                        bottom={0}
                        left={0}
                        right={0}
                        h={24}
                        bgGradient="linear(to-t, blackAlpha.700, transparent)"
                      />
                      
                      <Box position="absolute" bottom={0} left={0} right={0} p={4} color="white">
                        <Flex align="center" justify="space-between" mb={1}>
                          <Heading size="md">
                            {pick.name || `User ${pick.id}`}
                          </Heading>
                          {pick.immediate_available && (
                            <Badge colorScheme="green" fontSize="xs">
                              <Flex align="center" gap={1}>
                                <Box w={1.5} h={1.5} borderRadius="full" bg="white" animation="pulse 2s infinite" />
                                Online
                              </Flex>
                            </Badge>
                          )}
                        </Flex>
                        
                        <HStack spacing={2}>
                          <Badge colorScheme="teal" fontSize="xs" fontWeight="bold">
                            {Math.round(pick.compatibility_score * 100)}% Match
                          </Badge>
                          {pick.membership_tier && (
                            <Badge bg="whiteAlpha.200" color="white" fontSize="xs">
                              {pick.membership_tier.charAt(0).toUpperCase() + pick.membership_tier.slice(1)}
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    </Box>
                  ) : (
                    <Flex
                      w="full"
                      h="64"
                      align="center"
                      justify="center"
                      bg="gray.100"
                    >
                      <Text color="gray.600">No Photo</Text>
                    </Flex>
                  )}
                </Button>

                {pick.bio && (
                  <Box px={4} py={2} borderBottom="1px" borderColor="gray.100">
                    <Text fontSize="sm" color="gray.700" noOfLines={2}>{pick.bio}</Text>
                  </Box>
                )}

                {pick.interests && pick.interests.length > 0 && (
                  <Box px={4} py={2} borderBottom="1px" borderColor="gray.100">
                    <Flex flexWrap="wrap" gap={1.5}>
                      {pick.interests.slice(0, 3).map((interest, idx) => (
                        <Badge
                          key={idx}
                          colorScheme="gray"
                          fontSize="xs"
                        >
                          {interest}
                        </Badge>
                      ))}
                      {pick.interests.length > 3 && (
                        <Text fontSize="xs" color="gray.500" px={2} py={1}>
                          +{pick.interests.length - 3}
                        </Text>
                      )}
                    </Flex>
                  </Box>
                )}

                <HStack spacing={0}>
                  <Button
                    onClick={() => passMutation.mutate(pick.id)}
                    isDisabled={passMutation.isPending || likeMutation.isPending}
                    flex={1}
                    variant="ghost"
                    colorScheme="red"
                    leftIcon={<X size={20} />}
                    py={4}
                    borderRadius={0}
                  >
                    Pass
                  </Button>
                  <Divider orientation="vertical" h="auto" />
                  <Button
                    onClick={() => likeMutation.mutate(pick.id)}
                    isDisabled={likeMutation.isPending || passMutation.isPending}
                    flex={1}
                    variant="ghost"
                    colorScheme="teal"
                    leftIcon={<Heart size={20} />}
                    py={4}
                    borderRadius={0}
                  >
                    Like
                  </Button>
                </HStack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Container>

      <MatchCelebration
        show={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          navigate("/new-matches");
        }}
        matchedUser={matchedUser}
        onViewMatches={() => {
          setShowCelebration(false);
          navigate("/new-matches");
        }}
      />
    </Box>
  );
}
