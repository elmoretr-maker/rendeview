import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Heart, X } from "lucide-react";
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

export default function Likers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [matchedUser, setMatchedUser] = React.useState(null);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["likers"],
    queryFn: async () => {
      const res = await fetch("/api/matches/likers");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load likers");
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
      queryClient.invalidateQueries({ queryKey: ["likers"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      
      if (data?.matched) {
        const likedUser = likers.find(l => l.user.id === likedId);
        setMatchedUser({
          name: likedUser?.user.name,
          photo: likedUser?.user.photo,
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
      queryClient.invalidateQueries({ queryKey: ["likers"] });
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

  const likers = data?.likers || [];

  React.useEffect(() => {
    if (error?.message === "AUTH_401") {
      toast.error("Session expired. Please sign in.");
    }
  }, [error]);

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" px={4} py={8}>
        <Heading size="xl" mb={6} color="gray.800">Likers</Heading>
        
        {isLoading ? (
          <VStack py={12}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
          </VStack>
        ) : error?.message === "AUTH_401" ? (
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
        ) : error ? (
          <Text color="red.500">Error loading likers</Text>
        ) : likers.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Text color="gray.700">No likers yet</Text>
          </Box>
        ) : (
          <VStack spacing={4} align="stretch">
            {likers.map((item, idx) => (
              <Card
                key={idx}
                shadow="md"
                overflow="hidden"
              >
                <CardBody p={4}>
                  <Button
                    onClick={() => navigate(`/profile/${item.user.id}`)}
                    variant="unstyled"
                    display="flex"
                    alignItems="center"
                    w="full"
                    textAlign="left"
                  >
                    <Avatar
                      size="md"
                      src={item.user.photo ? getAbsoluteUrl(item.user.photo) : undefined}
                      name={item.user.name || `User ${item.user.id}`}
                      bg="gray.200"
                    />
                    <VStack align="start" ml={4} flex={1} spacing={1}>
                      <Text fontWeight="bold" fontSize="lg" color="gray.800">
                        {item.user.name || `User ${item.user.id}`}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        liked you {new Date(item.liked_at).toLocaleDateString()}
                      </Text>
                      {item.user.immediate_available && (
                        <HStack spacing={1.5}>
                          <Box w={2} h={2} borderRadius="full" bg="green.500" animation="pulse 2s infinite" />
                          <Text fontSize="xs" color="green.600" fontWeight="semibold">Online Now</Text>
                        </HStack>
                      )}
                    </VStack>
                  </Button>
                </CardBody>

                <Divider />

                <HStack spacing={0}>
                  <Button
                    onClick={() => passMutation.mutate(item.user.id)}
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
                    onClick={() => likeMutation.mutate(item.user.id)}
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
