import React from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
} from "@chakra-ui/react";
import AppHeader from "@/components/AppHeader";

export default function Blockers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const res = await fetch("/api/blockers");
      if (!res.ok) throw new Error("Failed to load blockers");
      return res.json();
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockedId) => {
      const res = await fetch("/api/blockers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error("Failed to unblock");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
      toast.success("User unblocked");
    },
    onError: () => toast.error("Could not unblock"),
  });

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    navigate("/account/signin");
  };

  const blockers = data?.blockers || [];

  return (
    <Box minH="100vh" bg="white">
      <AppHeader />
      <Container maxW="2xl" px={4} py={8}>
        <HStack justify="space-between" mb={6}>
          <Heading size="xl" color="gray.800">Blocked Users</Heading>
          <Button
            onClick={handleSignOut}
            colorScheme="red"
            variant="outline"
          >
            Sign Out
          </Button>
        </HStack>

        {isLoading ? (
          <VStack py={12}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
          </VStack>
        ) : error ? (
          <Text color="red.500">Error loading blocked users</Text>
        ) : blockers.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Text color="gray.600">No blocked users</Text>
          </Box>
        ) : (
          <VStack spacing={3} align="stretch">
            {blockers.map((item) => (
              <Card key={item.id} p={4}>
                <HStack spacing={3}>
                  <Avatar
                    size="md"
                    src={item.image || undefined}
                    name={item.name || `User ${item.blocked_id}`}
                    bg="gray.200"
                  />
                  <Text flex={1} fontWeight="semibold" color="gray.800">
                    {item.name || `User ${item.blocked_id}`}
                  </Text>
                  <Button
                    onClick={() => unblockMutation.mutate(item.blocked_id)}
                    isDisabled={unblockMutation.isPending}
                    colorScheme="purple"
                    size="sm"
                  >
                    Unblock
                  </Button>
                </HStack>
              </Card>
            ))}
          </VStack>
        )}
      </Container>
    </Box>
  );
}
