import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, ArrowLeft, Video } from "lucide-react";
import { toast } from "sonner";
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  IconButton,
  Spinner,
  Avatar,
  SimpleGrid,
  Card,
  CardBody
} from "@chakra-ui/react";

export default function ScheduleProposal() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const targetId = Number(userId);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(30);

  // Fetch user profile
  const { data, isLoading } = useQuery({
    queryKey: ["remote-profile", targetId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${targetId}`);
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  // Check if we have a match with this user
  const { data: matchesData } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("/api/matches/all");
      if (!res.ok) throw new Error("Failed to load matches");
      return res.json();
    },
  });

  const user = data?.user || {};
  const matches = matchesData?.matches || [];
  const match = matches.find((m) => m.user.id === targetId);
  const matchId = match?.match_id;

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) {
        throw new Error("You must match with this person first");
      }
      if (!selectedDate || !selectedTime) {
        throw new Error("Please select both date and time");
      }

      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const res = await fetch("/api/schedule/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to propose schedule");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Video date proposal sent!");
      queryClient.invalidateQueries({ queryKey: ["schedule-proposals"] });
      navigate("/matches");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send proposal");
    },
  });

  // Generate time slots (every 30 minutes from 9 AM to 9 PM)
  const timeSlots = [];
  for (let hour = 9; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeSlots.push(timeStr);
    }
  }

  // Get next 14 days for date selection
  const dateOptions = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dateOptions.push({
      value: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" align="center" justify="center">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Box>
    );
  }

  return (
    <Box minH="100vh" px={4} py={8} bg="gray.50">
      <Container maxW="2xl">
        <HStack mb={6} spacing={4}>
          <IconButton
            icon={<ArrowLeft size={24} />}
            onClick={() => navigate("/messages")}
            variant="ghost"
            aria-label="Back to messages"
          />
          <Heading size="2xl" color="gray.800">
            Propose Video Date
          </Heading>
        </HStack>

        <Card mb={6} shadow="md">
          <CardBody>
            <HStack spacing={4}>
              {user.primary_photo_url && (
                <Avatar
                  src={user.primary_photo_url}
                  name={user.name}
                  size="lg"
                />
              )}
              <VStack align="start" spacing={0}>
                <Heading size="lg" color="gray.800">
                  {user.name}
                </Heading>
                {!matchId && (
                  <Text fontSize="sm" color="red.500" mt={1}>
                    You must match with this person first to schedule a video date
                  </Text>
                )}
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {matchId && (
          <>
            <Card mb={6} shadow="md">
              <CardBody>
                <HStack mb={4} spacing={2}>
                  <Calendar size={24} color="#7c3aed" />
                  <Heading size="lg" color="gray.800">
                    Select Date
                  </Heading>
                </HStack>
                <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={3}>
                  {dateOptions.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => setSelectedDate(option.value)}
                      colorScheme={selectedDate === option.value ? "purple" : "gray"}
                      variant={selectedDate === option.value ? "solid" : "outline"}
                      size="md"
                    >
                      {option.label}
                    </Button>
                  ))}
                </SimpleGrid>
              </CardBody>
            </Card>

            <Card mb={6} shadow="md">
              <CardBody>
                <HStack mb={4} spacing={2}>
                  <Clock size={24} color="#7c3aed" />
                  <Heading size="lg" color="gray.800">
                    Select Time
                  </Heading>
                </HStack>
                <SimpleGrid columns={{ base: 3, sm: 4 }} spacing={3} maxH="64" overflowY="auto">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      colorScheme={selectedTime === time ? "purple" : "gray"}
                      variant={selectedTime === time ? "solid" : "outline"}
                      size="md"
                    >
                      {time}
                    </Button>
                  ))}
                </SimpleGrid>
              </CardBody>
            </Card>

            <Card mb={6} shadow="md">
              <CardBody>
                <Heading size="lg" mb={4} color="gray.800">
                  Duration
                </Heading>
                <HStack spacing={3}>
                  {[15, 30, 45, 60].map((mins) => (
                    <Button
                      key={mins}
                      onClick={() => setDuration(mins)}
                      colorScheme={duration === mins ? "purple" : "gray"}
                      variant={duration === mins ? "solid" : "outline"}
                      flex={1}
                    >
                      {mins} min
                    </Button>
                  ))}
                </HStack>
              </CardBody>
            </Card>

            {selectedDate && selectedTime && (
              <Box
                mb={6}
                p={6}
                borderRadius="xl"
                shadow="md"
                bg="pink.50"
              >
                <Heading size="md" mb={2} color="gray.800">
                  Proposal Summary
                </Heading>
                <Text color="gray.800">
                  <Text as="strong">{user.name}</Text> will receive a proposal for a {duration}-minute
                  video date on{" "}
                  <Text as="strong">
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>{" "}
                  at <Text as="strong">{selectedTime}</Text>
                </Text>
              </Box>
            )}

            <Button
              onClick={() => proposalMutation.mutate()}
              isDisabled={!selectedDate || !selectedTime || proposalMutation.isPending}
              isLoading={proposalMutation.isPending}
              loadingText="Sending..."
              w="full"
              colorScheme="purple"
              leftIcon={<Video size={24} />}
              size="lg"
              shadow="lg"
            >
              Send Proposal
            </Button>
          </>
        )}

        {!matchId && (
          <VStack spacing={4} py={12} textAlign="center">
            <Text fontSize="lg" color="gray.800">
              You need to match with {user.name} before proposing a video date.
            </Text>
            <Button
              onClick={() => navigate(`/profile/${targetId}`)}
              colorScheme="purple"
              shadow="lg"
            >
              View Profile & Like
            </Button>
          </VStack>
        )}
      </Container>
    </Box>
  );
}
