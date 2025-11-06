import React from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
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
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load conversations");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const conversations = data?.conversations || [];

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

        {conversations.length === 0 ? (
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
            {conversations.map((item) => (
              <Card
                key={item.conversation_id}
                onClick={() => navigate(`/messages/${item.conversation_id}`)}
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
                      src={item.other_user_photo ? getAbsoluteUrl(item.other_user_photo) : undefined}
                      name={item.other_user_name || `User ${item.other_user_id}`}
                      bg="gray.200"
                    />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="semibold" color="gray.800">
                        {item.other_user_name || `User ${item.other_user_id}`}
                      </Text>
                      <Text fontSize="sm" color="gray.500" noOfLines={1}>
                        {item.last_message_body || "Start a conversation"}
                      </Text>
                    </VStack>
                    {item.unread_count > 0 && (
                      <Box
                        bg="purple.500"
                        color="white"
                        borderRadius="full"
                        minW="24px"
                        h="24px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="xs"
                        fontWeight="bold"
                        px={2}
                      >
                        {item.unread_count}
                      </Box>
                    )}
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
