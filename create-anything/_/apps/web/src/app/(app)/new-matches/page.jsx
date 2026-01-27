import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
import { Heart, Sparkles, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
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
  Badge,
  Flex,
} from "@chakra-ui/react";

export default function NewMatches() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUser();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["newMatches"],
    queryFn: async () => {
      const res = await fetch("/api/new-matches");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load new matches");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const markViewedMutation = useMutation({
    mutationFn: async (matchId) => {
      const res = await fetch("/api/mark-match-viewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) throw new Error("Failed to mark as viewed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newMatches"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      refetch();
    },
  });

  const matches = data?.matches || [];

  const handleViewMatch = async (matchId) => {
    await markViewedMutation.mutateAsync(matchId);
    navigate(`/messages/${matchId}`);
  };

  React.useEffect(() => {
    if (error?.message === "AUTH_401") {
      toast.error("Session expired. Please sign in.");
    }
  }, [error]);

  if (userLoading || isLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <VStack py={12} spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="gray.700">Loading your new matches...</Text>
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
        <Container maxW="2xl" px={4} py={8}>
          <Heading size="xl" mb={4} color="gray.800">New Matches</Heading>
          <Text color="red.500">Error loading new matches</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" px={4} py={8}>
        {matches.length === 0 ? (
          <VStack textAlign="center" py={12} spacing={6}>
            <Box
              as={motion.div}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Heart 
                size={80} 
                style={{ margin: '0 auto', marginBottom: '16px' }}
                color="#7c3aed"
                fill="#7c3aed"
              />
            </Box>
            <Heading size="2xl" color="gray.800">
              No New Matches Yet
            </Heading>
            <Text fontSize="lg" color="gray.700">
              Keep swiping in Discovery to find your next connection!
            </Text>
            <Button
              onClick={() => navigate("/discovery")}
              colorScheme="purple"
              size="lg"
              shadow="lg"
              _hover={{ shadow: "xl" }}
            >
              Go to Discovery
            </Button>
          </VStack>
        ) : (
          <VStack spacing={8} align="stretch">
            <Box
              as={motion.div}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              textAlign="center"
            >
              <HStack justify="center" spacing={2} mb={2}>
                <Sparkles size={32} color="#00BFA6" />
                <Heading size="2xl" color="gray.800">
                  You Have {matches.length} New {matches.length === 1 ? "Match" : "Matches"}!
                </Heading>
                <Sparkles size={32} color="#00BFA6" />
              </HStack>
              <Text fontSize="lg" color="gray.700">
                Start a conversation and make a connection!
              </Text>
            </Box>

            <VStack spacing={4} align="stretch">
              {matches.map((item, idx) => (
                <Box
                  key={item.match_id}
                  as={motion.div}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Button
                    onClick={() => handleViewMatch(item.match_id)}
                    isDisabled={markViewedMutation.isPending}
                    w="full"
                    p={6}
                    h="auto"
                    borderRadius="2xl"
                    bgGradient="linear(135deg, purple.500 0%, purple.600 100%)"
                    position="relative"
                    overflow="hidden"
                    _hover={{ shadow: "xl", transform: "scale(1.02)", bgGradient: "linear(135deg, purple.600 0%, purple.700 100%)" }}
                    transition="all 0.2s"
                  >
                    <Badge
                      position="absolute"
                      top={0}
                      right={0}
                      borderRadius="0 xl 0 md"
                      bg="white"
                      color="purple.600"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      NEW
                    </Badge>
                    
                    <HStack spacing={4} w="full" align="center">
                      <Box position="relative">
                        <Box
                          w="56px"
                          h="56px"
                          borderRadius="full"
                          overflow="hidden"
                          ring={4}
                          ringColor="white"
                          bg="gray.200"
                        >
                          {item.user.photo ? (
                            <Box
                              as="img"
                              src={getAbsoluteUrl(item.user.photo)}
                              alt={item.user.name || `User ${item.user.id}`}
                              w="full"
                              h="full"
                              objectFit="cover"
                            />
                          ) : (
                            <Flex w="full" h="full" align="center" justify="center" bg="purple.200" color="purple.800" fontWeight="bold">
                              {(item.user.name || 'U').charAt(0).toUpperCase()}
                            </Flex>
                          )}
                        </Box>
                        <Flex
                          position="absolute"
                          bottom={-1}
                          right={-1}
                          w={8}
                          h={8}
                          borderRadius="full"
                          bg="white"
                          align="center"
                          justify="center"
                          shadow="lg"
                        >
                          <Heart size={16} fill="#7c3aed" color="#7c3aed" />
                        </Flex>
                      </Box>
                      <VStack align="start" flex={1} spacing={1}>
                        <Text fontSize="2xl" fontWeight="bold" color="white">
                          {item.user.name || `User ${item.user.id}`}
                        </Text>
                        <Text fontSize="sm" color="whiteAlpha.900">
                          Matched {new Date(item.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </Text>
                        <Flex
                          align="center"
                          gap={2}
                          px={3}
                          py={1.5}
                          borderRadius="full"
                          bg="whiteAlpha.200"
                        >
                          <MessageCircle size={16} color="white" />
                          <Text fontSize="sm" fontWeight="semibold" color="white">
                            Start Chatting
                          </Text>
                        </Flex>
                      </VStack>
                    </HStack>
                  </Button>
                </Box>
              ))}
            </VStack>

            <Box
              as={motion.div}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              textAlign="center"
            >
              <Text fontSize="sm" color="gray.600" mb={4}>
                After you start a conversation, these matches will move to your Matches page
              </Text>
              <Button
                onClick={() => navigate("/matches")}
                variant="outline"
                shadow="md"
                _hover={{ shadow: "lg" }}
              >
                View All Matches
              </Button>
            </Box>
          </VStack>
        )}
      </Container>
    </Box>
  );
}
