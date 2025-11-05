import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { Calendar, Save, Trash2 } from "lucide-react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Spinner,
  Image,
  Textarea,
  FormControl,
  FormLabel,
  Avatar
} from "@chakra-ui/react";

export default function BlockedUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingNotes, setEditingNotes] = useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["blockers"],
    queryFn: async () => {
      const res = await fetch("/api/blockers");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load blocked users");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ blockedId, notes }) => {
      const res = await fetch("/api/blockers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId, notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return res.json();
    },
    onSuccess: (_, { blockedId }) => {
      queryClient.invalidateQueries({ queryKey: ["blockers"] });
      setEditingNotes(prev => {
        const updated = { ...prev };
        delete updated[blockedId];
        return updated;
      });
      toast.success("Notes saved");
    },
    onError: () => toast.error("Could not save notes"),
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
    onError: () => toast.error("Could not unblock user"),
  });

  const handleNotesChange = (blockedId, value) => {
    setEditingNotes(prev => ({
      ...prev,
      [blockedId]: value,
    }));
  };

  const handleSaveNotes = (blockedId) => {
    const notes = editingNotes[blockedId];
    updateNotesMutation.mutate({ blockedId, notes });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const blockers = data?.blockers || [];

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <VStack py={12}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text mt={4} color="gray.800">Loading...</Text>
        </VStack>
      </Box>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Box maxW="2xl" mx="auto" px={4} py={8}>
          <Heading size="xl" mb={4} color="gray.800">
            Blocked Users
          </Heading>
          <VStack align="start" spacing={4}>
            <Text color="gray.800">
              Session expired. Please sign in.
            </Text>
            <Button
              onClick={() => navigate("/account/signin")}
              colorScheme="purple"
              shadow="md"
            >
              Sign In
            </Button>
          </VStack>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Box maxW="2xl" mx="auto" px={4} py={8}>
          <Heading size="xl" mb={4} color="gray.800">
            Blocked Users
          </Heading>
          <Text color="red.500">Error loading blocked users</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Box maxW="3xl" mx="auto" px={4} py={8}>
        <VStack align="start" mb={6} spacing={1}>
          <Heading size="xl" color="gray.800">
            Blocked Users
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Manage your blocked users and add private notes
          </Text>
        </VStack>

        {blockers.length === 0 ? (
          <Box textAlign="center" py={12} bg="white" borderRadius="xl">
            <Text color="gray.800">No blocked users</Text>
          </Box>
        ) : (
          <VStack spacing={4} align="stretch">
            {blockers.map((item) => {
              const currentNotes =
                editingNotes[item.blocked_id] !== undefined
                  ? editingNotes[item.blocked_id]
                  : item.notes || "";
              const hasUnsavedChanges = editingNotes[item.blocked_id] !== undefined;

              return (
                <Box
                  key={item.id}
                  bg="white"
                  borderRadius="xl"
                  p={4}
                  shadow="sm"
                  borderWidth="1px"
                  borderColor="gray.200"
                >
                  <HStack align="start" spacing={4}>
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name || "User"}
                        boxSize="16"
                        borderRadius="full"
                        objectFit="cover"
                        flexShrink={0}
                      />
                    ) : (
                      <Avatar size="lg" name={item.name || "User"} />
                    )}

                    <Box flex={1} minW={0}>
                      <HStack justify="space-between" mb={2} align="start">
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="semibold" fontSize="lg" color="gray.800">
                            {item.name || `User ${item.blocked_id}`}
                          </Text>
                          <HStack spacing={1} fontSize="sm" color="gray.500">
                            <Calendar size={14} />
                            <Text>Blocked on {formatDate(item.created_at)}</Text>
                          </HStack>
                        </VStack>

                        <Button
                          onClick={() => unblockMutation.mutate(item.blocked_id)}
                          isLoading={unblockMutation.isPending}
                          leftIcon={<Trash2 size={16} />}
                          colorScheme="red"
                          variant="ghost"
                          size="md"
                        >
                          Unblock
                        </Button>
                      </HStack>

                      <FormControl mt={3}>
                        <FormLabel fontSize="sm" fontWeight="medium" color="gray.800" mb={1}>
                          Private Notes
                        </FormLabel>
                        <HStack spacing={2} align="start">
                          <Textarea
                            value={currentNotes}
                            onChange={(e) => handleNotesChange(item.blocked_id, e.target.value)}
                            placeholder="Add a note to remember why you blocked this user..."
                            rows={2}
                            borderColor="gray.300"
                            focusBorderColor="purple.500"
                            resize="none"
                          />
                          {hasUnsavedChanges && (
                            <Button
                              onClick={() => handleSaveNotes(item.blocked_id)}
                              isLoading={updateNotesMutation.isPending}
                              leftIcon={<Save size={16} />}
                              colorScheme="pink"
                              size="md"
                              flexShrink={0}
                            >
                              Save
                            </Button>
                          )}
                        </HStack>
                      </FormControl>
                    </Box>
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        )}
      </Box>
    </Box>
  );
}
