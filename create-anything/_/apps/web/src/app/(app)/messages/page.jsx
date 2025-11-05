import React from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
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
  Spinner,
  Card,
  CardBody,
} from "@chakra-ui/react";

export default function Messages() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches/list");
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
          <Heading size="xl" mb={4} color="gray.800">Messages</Heading>
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
          <Heading size="xl" mb={4} color="gray.800">Messages</Heading>
          <Text color="red.500">Error loading messages</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" px={4} py={8}>
        <Heading size="xl" mb={6} color="gray.800">Messages</Heading>

        {matches.length === 0 ? (
          <VStack spacing={4} py={12}>
            <Text color="gray.700" fontSize="lg" textAlign="center">
              No conversations yet. Visit the Discovery page to start matching and chatting!
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
            {matches.map((item) => (
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
                    <Avatar
                      size="md"
                      src={item.user.photo ? getAbsoluteUrl(item.user.photo) : undefined}
                      name={item.user.name || `User ${item.user.id}`}
                      bg="gray.200"
                    />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="semibold" color="gray.800">
                        {item.user.name || `User ${item.user.id}`}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Tap to chat
                      </Text>
                    </VStack>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        )}
      </Container>
    </Box>
  );
}
