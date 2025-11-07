import React from "react";
import { useNavigate, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
import { Star, X } from "lucide-react";
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
  IconButton,
  Badge,
} from "@chakra-ui/react";

function MatchesContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // Fetch saved profiles (Top Picks)
  const { data: savedData, isLoading: savedLoading } = useQuery({
    queryKey: ["savedProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/saved-profiles");
      if (!res.ok) throw new Error("Failed to load saved profiles");
      return res.json();
    },
  });

  // Remove from Top Picks mutation
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

  const matches = data?.matches || [];
  const savedProfiles = savedData?.savedProfiles || [];
  
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
    return <SessionExpired />;
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
            onClick={() => navigate("/matches/likers")}
            colorScheme="purple"
            variant="outline"
            bg="purple.50"
            shadow="md"
          >
            View Likers
          </Button>
        </Flex>

        {/* Top Picks Section - Always Visible */}
        <Box mb={8}>
          <Flex align="center" gap={2} mb={4}>
            <Star size={24} color="#FFD700" fill="#FFD700" />
            <Heading size="md" color="gray.800">Top Picks</Heading>
            <Badge colorScheme="purple" fontSize="xs" px={2} py={0.5} borderRadius="full">
              {savedProfiles.length}/5
            </Badge>
          </Flex>
          
          {savedProfiles.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {savedProfiles.map((profile) => (
                <Card
                  key={profile.id}
                  _hover={{ bg: "white", shadow: "md" }}
                  transition="all 0.2s"
                  bg="purple.50"
                  variant="outline"
                  borderColor="purple.200"
                  position="relative"
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
                        cursor="pointer"
                        onClick={() => navigate(`/profile/${profile.id}`)}
                        _hover={{ opacity: 0.8 }}
                      >
                        {profile.photo ? (
                          <Box
                            as="img"
                            src={getAbsoluteUrl(profile.photo)}
                            alt={profile.name || `User ${profile.id}`}
                            w="full"
                            h="full"
                            objectFit="cover"
                          />
                        ) : (
                          <Flex w="full" h="full" align="center" justify="center" bg="gray.300" color="gray.600" fontWeight="semibold" fontSize="lg">
                            {(profile.name || 'U').charAt(0).toUpperCase()}
                          </Flex>
                        )}
                      </Box>
                      <VStack 
                        align="start" 
                        spacing={0} 
                        flex={1}
                        cursor="pointer"
                        onClick={() => navigate(`/profile/${profile.id}`)}
                      >
                        <Text fontWeight="semibold" color="gray.800">
                          {profile.name || `User ${profile.id}`}
                        </Text>
                        <Text fontSize="sm" color="gray.600" noOfLines={1}>
                          {profile.bio || "No bio available"}
                        </Text>
                      </VStack>
                      <IconButton
                        icon={<X size={18} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSavedMutation.mutate(profile.id);
                        }}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        borderRadius="full"
                        aria-label="Remove from Top Picks"
                      />
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          ) : (
            <Card bg="purple.50" variant="outline" borderColor="purple.200">
              <CardBody p={6}>
                <VStack spacing={3}>
                  <Star size={32} color="#D1D5DB" strokeWidth={1.5} />
                  <Text fontSize="md" color="gray.700" fontWeight="medium" textAlign="center">
                    No Top Picks saved yet
                  </Text>
                  <Text fontSize="sm" color="gray.600" textAlign="center" maxW="sm">
                    Save up to 5 profiles from Discovery to keep track of people you're most interested in
                  </Text>
                  <Button
                    onClick={() => navigate("/discovery")}
                    colorScheme="purple"
                    size="sm"
                    mt={2}
                  >
                    Go to Discovery
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}
          
          {savedProfiles.length > 0 && savedProfiles.length < 5 && (
            <Text fontSize="sm" color="gray.600" mt={2} textAlign="center">
              Save up to 5 profiles from Discovery to your Top Picks
            </Text>
          )}
        </Box>

        {/* Regular Matches Section */}
        <Heading size="md" color="gray.800" mb={4}>
          All Matches
        </Heading>

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
              
              const handleStartChat = async () => {
                try {
                  const res = await fetch(`/api/conversations/with/${item.user.id}`);
                  if (!res.ok) throw new Error("Failed to get conversation");
                  const data = await res.json();
                  navigate(`/messages/${data.conversation_id}`);
                } catch (error) {
                  console.error("Error starting chat:", error);
                  toast.error("Could not start chat. Please try again.");
                }
              };
              
              return (
                <Card
                  key={item.match_id}
                  bg="white"
                  variant="outline"
                  shadow="sm"
                >
                  <CardBody p={4}>
                    <HStack spacing={3} align="center">
                      <Box
                        w="56px"
                        h="56px"
                        borderRadius="full"
                        overflow="hidden"
                        flexShrink={0}
                        bg="gray.200"
                        cursor="pointer"
                        onClick={() => navigate(`/profile/${item.user.id}`)}
                        _hover={{ opacity: 0.8 }}
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
                        <Text 
                          fontWeight="semibold" 
                          color="gray.800"
                          cursor="pointer"
                          onClick={() => navigate(`/profile/${item.user.id}`)}
                          _hover={{ color: "purple.600" }}
                        >
                          {item.user.name || `User ${item.user.id}`}
                        </Text>
                        {userNote ? (
                          <Text fontSize="sm" color="gray.600" noOfLines={1}>
                            📝 {userNote}
                          </Text>
                        ) : (
                          <Text fontSize="sm" color="gray.500">
                            Matched on {new Date(item.created_at).toLocaleDateString()}
                          </Text>
                        )}
                      </VStack>
                      <Button
                        colorScheme="purple"
                        size="sm"
                        onClick={handleStartChat}
                      >
                        Start Chat
                      </Button>
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
