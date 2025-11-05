import React from "react";
import { useNavigate, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Avatar,
  VStack,
  HStack,
  Flex,
  Spinner,
  Card,
  CardBody,
} from "@chakra-ui/react";

function MatchesContent() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading} = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches-list");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const matches = data?.matches || [];
  
  // Fetch notes for all matched users
  const { data: notesData } = useQuery({
    queryKey: ["all-notes", matches.map(m => m.user.id).join(",")],
    queryFn: async () => {
      if (matches.length === 0) return {};
      
      const notesMap = {};
      await Promise.all(
        matches.map(async (match) => {
          try {
            const res = await fetch(`/api/notes?targetUserId=${match.user.id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.note) {
                notesMap[match.user.id] = data.note.note_content;
              }
            }
          } catch (err) {
            console.error(`Failed to fetch note for user ${match.user.id}:`, err);
          }
        })
      );
      return notesMap;
    },
    enabled: matches.length > 0,
  });

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
          <Text color="gray.700">Loading...</Text>
        </VStack>
      </Box>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <Heading size="xl" mb={4} color="gray.800">Matches</Heading>
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

  if (error) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <Heading size="xl" mb={4} color="gray.800">Matches</Heading>
          <Text color="red.500">Error loading matches</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" px={4} py={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="xl" color="gray.800">Matches</Heading>
          <Button
            as={Link}
            to="/matches/likers"
            colorScheme="purple"
            variant="outline"
            bg="purple.50"
            shadow="md"
          >
            View Likers
          </Button>
        </Flex>

        {matches.length === 0 ? (
          <VStack spacing={4} py={12}>
            <Text color="gray.700" fontSize="lg" textAlign="center">
              No matches yet. Visit the Discovery page to start swiping and connecting!
            </Text>
            <Button
              onClick={() => navigate("/discovery")}
              colorScheme="purple"
              size="lg"
              shadow="md"
            >
              Go to Discovery
            </Button>
          </VStack>
        ) : (
          <VStack spacing={3} align="stretch">
            {matches.map((item) => {
              const userNote = notesData?.[item.user.id];
              
              return (
                <Card
                  key={item.match_id}
                  as="button"
                  onClick={() => navigate(`/messages/${item.match_id}`)}
                  cursor="pointer"
                  _hover={{ bg: "white", shadow: "md" }}
                  transition="all 0.2s"
                  bg="gray.100"
                  variant="outline"
                >
                  <CardBody p={4}>
                    <HStack spacing={3}>
                      <Box
                        w="48px"
                        h="48px"
                        borderRadius="full"
                        overflow="hidden"
                        flexShrink={0}
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
                          <Flex w="full" h="full" align="center" justify="center" bg="gray.300" color="gray.600" fontWeight="semibold" fontSize="lg">
                            {(item.user.name || 'U').charAt(0).toUpperCase()}
                          </Flex>
                        )}
                      </Box>
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="semibold" color="gray.800">
                          {item.user.name || `User ${item.user.id}`}
                        </Text>
                        {userNote ? (
                          <Text fontSize="sm" color="gray.600" noOfLines={1}>
                            📝 {userNote}
                          </Text>
                        ) : (
                          <Text fontSize="sm" color="gray.500">
                            {item.last_chat_at ? "Active chat" : "New match"}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              );
            })}
          </VStack>
        )}
      </Container>
    </Box>
  );
}

export default function Matches() {
  return (
    <ErrorBoundary componentName="Matches">
      <MatchesContent />
    </ErrorBoundary>
  );
}
