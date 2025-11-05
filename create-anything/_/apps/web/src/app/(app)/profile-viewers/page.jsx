import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, X, Eye } from "lucide-react";
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
  Avatar,
  Card,
  CardBody,
  Divider,
  Badge,
} from "@chakra-ui/react";

export default function ProfileViewers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [matchedUser, setMatchedUser] = React.useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["profileViewers"],
    queryFn: async () => {
      const res = await fetch("/api/profile-views");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profile viewers");
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
      queryClient.invalidateQueries({ queryKey: ["profileViewers"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      
      if (data?.matched) {
        const likedViewer = viewers.find(v => v.user.id === likedId);
        setMatchedUser({
          name: likedViewer?.user.name,
          photo: likedViewer?.user.photo,
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
      queryClient.invalidateQueries({ queryKey: ["profileViewers"] });
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

  const viewers = data?.viewers || [];

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
            <Eye size={28} color="#7c3aed" />
            <Heading size="2xl" color="gray.800">
              Profile Viewers
            </Heading>
          </HStack>
          <Text color="gray.600">
            See who's been checking out your profile
          </Text>
          <Text fontSize="sm" color="gray.500">
            Recent viewers from the last 7 days
          </Text>
        </VStack>

        {viewers.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Text color="gray.700">No profile views yet. Keep being active!</Text>
          </Box>
        ) : (
          <VStack spacing={4} align="stretch">
            {viewers.map((viewer) => (
              <Card
                key={viewer.user.id}
                shadow="md"
                overflow="hidden"
              >
                <CardBody p={4}>
                  <Button
                    onClick={() => navigate(`/profile/${viewer.user.id}`)}
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    w="full"
                    textAlign="left"
                  >
                    <Avatar
                      size="lg"
                      src={viewer.user.photo ? getAbsoluteUrl(viewer.user.photo) : undefined}
                      name={viewer.user.name || `User ${viewer.user.id}`}
                      bg="gray.200"
                    />
                    <VStack align="start" ml={4} flex={1} spacing={1}>
                      <Text fontWeight="bold" fontSize="lg" color="gray.800">
                        {viewer.user.name || `User ${viewer.user.id}`}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Viewed {new Date(viewer.viewed_at).toLocaleDateString()} at{" "}
                        {new Date(viewer.viewed_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                      <HStack spacing={2}>
                        {viewer.user.immediate_available && (
                          <HStack spacing={1}>
                            <Box w={2} h={2} borderRadius="full" bg="green.500" animation="pulse 2s infinite" />
                            <Text fontSize="xs" color="green.600" fontWeight="semibold">Online Now</Text>
                          </HStack>
                        )}
                        {viewer.user.membership_tier && (
                          <Badge colorScheme="gray" fontSize="xs">
                            {viewer.user.membership_tier.charAt(0).toUpperCase() + viewer.user.membership_tier.slice(1)}
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                  </Button>
                </CardBody>

                {viewer.user.bio && (
                  <Box px={4} pb={3}>
                    <Text fontSize="sm" color="gray.700" noOfLines={2}>{viewer.user.bio}</Text>
                  </Box>
                )}

                <Divider />

                <HStack spacing={0}>
                  <Button
                    onClick={() => passMutation.mutate(viewer.user.id)}
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
                    onClick={() => likeMutation.mutate(viewer.user.id)}
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
          </VStack>
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
