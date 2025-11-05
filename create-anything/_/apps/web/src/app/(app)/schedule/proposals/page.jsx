import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Check, X, MessageSquare, ArrowLeft, Mail } from "lucide-react";
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
  Badge,
  SimpleGrid,
  Card,
  CardBody,
  Textarea
} from "@chakra-ui/react";
import { containsExternalContact } from "@/utils/safetyFilters";

export default function ScheduleProposals() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [counterProposalId, setCounterProposalId] = useState(null);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("");
  const [counterDuration, setCounterDuration] = useState(30);
  const [messageProposalId, setMessageProposalId] = useState(null);
  const [messageText, setMessageText] = useState("");

  // Fetch all schedule proposals
  const { data, isLoading } = useQuery({
    queryKey: ["schedule-proposals"],
    queryFn: async () => {
      const res = await fetch("/api/schedule/list");
      if (!res.ok) throw new Error("Failed to load proposals");
      return res.json();
    },
  });

  // Respond to proposal mutation
  const respondMutation = useMutation({
    mutationFn: async ({ proposalId, action, counterDateTime }) => {
      const res = await fetch("/api/schedule/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, action, counterDateTime }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to respond");
      }

      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-proposals"] });
      setCounterProposalId(null);
      setCounterDate("");
      setCounterTime("");
      setCounterDuration(30);
      
      if (variables.action === "accept") {
        toast.success("Video date confirmed! Get ready to connect.");
      } else if (variables.action === "substitute") {
        toast.success("Counter-proposal sent!");
      } else {
        toast.success("Proposal declined");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to respond");
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ matchId, message }) => {
      // Security check for external contact info
      if (containsExternalContact(message)) {
        throw new Error(
          "For your safety, please do not share external contact info (emails or phone numbers). Keep scheduling conversations on the platform."
        );
      }

      const res = await fetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      return res.json();
    },
    onSuccess: () => {
      setMessageProposalId(null);
      setMessageText("");
      toast.success("Scheduling message sent!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  const proposals = data?.proposals || [];
  const pendingProposals = proposals.filter((p) => p.status === "pending" && !p.is_proposer);
  const sentProposals = proposals.filter((p) => p.is_proposer);
  const completedProposals = proposals.filter(
    (p) => ["accepted", "declined", "substituted"].includes(p.status)
  );

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" align="center" justify="center">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Box>
    );
  }

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  };

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

  const ProposalCard = ({ proposal }) => {
    const { date, time } = formatDateTime(proposal.proposed_start);
    const isCounter = counterProposalId === proposal.id;
    const isMessaging = messageProposalId === proposal.id;

    return (
      <Card mb={4} shadow="md">
        <CardBody>
          <HStack mb={4} spacing={3}>
            {proposal.other_user.image && (
              <Avatar
                src={proposal.other_user.image}
                name={proposal.other_user.name}
                size="md"
              />
            )}
            <VStack align="start" spacing={0}>
              <Heading size="md" color="gray.800">
                {proposal.other_user.name}
              </Heading>
              {proposal.is_proposer && (
                <Text fontSize="sm" opacity={0.6} color="gray.800">
                  Waiting for response
                </Text>
              )}
            </VStack>
          </HStack>

          <VStack align="start" spacing={2} mb={4}>
            <HStack>
              <Calendar size={20} color="#7c3aed" />
              <Text fontWeight="semibold" color="gray.800">
                {date}
              </Text>
            </HStack>
            <HStack>
              <Clock size={20} color="#7c3aed" />
              <Text fontWeight="semibold" color="gray.800">
                {time}
              </Text>
            </HStack>
          </VStack>

          {proposal.status !== "pending" && (
            <Box mb={4}>
              <Badge
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
                fontWeight="semibold"
                colorScheme={
                  proposal.status === "accepted"
                    ? "pink"
                    : proposal.status === "substituted"
                    ? "purple"
                    : "red"
                }
              >
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </Badge>
              {proposal.substitute_note && (
                <Text mt={2} fontSize="sm" fontStyle="italic" color="gray.800">
                  Note: {proposal.substitute_note}
                </Text>
              )}
            </Box>
          )}

          {!proposal.is_proposer && proposal.status === "pending" && (
            <VStack spacing={3}>
              {!isCounter && !isMessaging ? (
                <>
                  <HStack spacing={2} w="full">
                    <Button
                      onClick={() =>
                        respondMutation.mutate({ proposalId: proposal.id, action: "accept" })
                      }
                      isLoading={respondMutation.isPending}
                      flex={1}
                      colorScheme="pink"
                      leftIcon={<Check size={18} />}
                      size="md"
                    >
                      Accept
                    </Button>
                    <Button
                      onClick={() => {
                        setCounterProposalId(proposal.id);
                        setCounterDate("");
                        setCounterTime("");
                        setCounterDuration(30);
                        setMessageProposalId(null);
                      }}
                      flex={1}
                      variant="outline"
                      colorScheme="purple"
                      leftIcon={<MessageSquare size={18} />}
                      size="md"
                    >
                      Counter
                    </Button>
                  </HStack>
                  <HStack spacing={2} w="full">
                    <Button
                      onClick={() => {
                        setMessageProposalId(proposal.id);
                        setMessageText("");
                        setCounterProposalId(null);
                      }}
                      flex={1}
                      variant="outline"
                      colorScheme="blue"
                      leftIcon={<Mail size={18} />}
                      size="md"
                    >
                      Message
                    </Button>
                    <Button
                      onClick={() =>
                        respondMutation.mutate({ proposalId: proposal.id, action: "decline" })
                      }
                      isLoading={respondMutation.isPending}
                      flex={1}
                      variant="outline"
                      colorScheme="red"
                      leftIcon={<X size={18} />}
                      size="md"
                    >
                      Decline
                    </Button>
                  </HStack>
                </>
              ) : isMessaging ? (
                <VStack spacing={3} w="full">
                  <Box w="full">
                    <Heading size="sm" mb={2} color="gray.800">
                      Send Scheduling Message
                    </Heading>
                    <Text fontSize="xs" color="gray.600" mb={2}>
                      {200 - messageText.length} characters remaining
                    </Text>
                    <Textarea
                      placeholder="Send a quick note about scheduling... (e.g., 'That time works! Looking forward to our chat.' or 'Can we do evening instead?')"
                      value={messageText}
                      onChange={(e) => {
                        if (e.target.value.length <= 200) {
                          setMessageText(e.target.value);
                        }
                      }}
                      resize="none"
                      borderColor="gray.300"
                      focusBorderColor="blue.500"
                      rows={3}
                      maxLength={200}
                    />
                    <Text fontSize="xs" color="gray.500" mt={1} fontStyle="italic">
                      Note: For your safety, phone numbers and emails are not allowed
                    </Text>
                  </Box>
                  <HStack spacing={3} w="full">
                    <Button
                      onClick={() => {
                        setMessageProposalId(null);
                        setMessageText("");
                      }}
                      flex={1}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() =>
                        sendMessageMutation.mutate({
                          matchId: proposal.match_id,
                          message: messageText,
                        })
                      }
                      isDisabled={!messageText.trim() || sendMessageMutation.isPending}
                      isLoading={sendMessageMutation.isPending}
                      flex={1}
                      colorScheme="blue"
                    >
                      Send Message
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <VStack spacing={3} w="full">
                  <Box w="full">
                    <HStack mb={3} spacing={2}>
                      <Calendar size={20} color="#7c3aed" />
                      <Heading size="sm" color="gray.800">
                        Select Date
                      </Heading>
                    </HStack>
                    <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={2}>
                      {dateOptions.map((option) => (
                        <Button
                          key={option.value}
                          onClick={() => setCounterDate(option.value)}
                          colorScheme={counterDate === option.value ? "purple" : "gray"}
                          variant={counterDate === option.value ? "solid" : "outline"}
                          size="sm"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </SimpleGrid>
                  </Box>

                  <Box w="full">
                    <HStack mb={3} spacing={2}>
                      <Clock size={20} color="#7c3aed" />
                      <Heading size="sm" color="gray.800">
                        Select Time
                      </Heading>
                    </HStack>
                    <SimpleGrid columns={{ base: 3, sm: 4 }} spacing={2} maxH="48" overflowY="auto">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          onClick={() => setCounterTime(time)}
                          colorScheme={counterTime === time ? "purple" : "gray"}
                          variant={counterTime === time ? "solid" : "outline"}
                          size="sm"
                        >
                          {time}
                        </Button>
                      ))}
                    </SimpleGrid>
                  </Box>

                  <Box w="full">
                    <Heading size="sm" mb={3} color="gray.800">
                      Duration
                    </Heading>
                    <HStack spacing={2}>
                      {[15, 30, 45, 60].map((mins) => (
                        <Button
                          key={mins}
                          onClick={() => setCounterDuration(mins)}
                          colorScheme={counterDuration === mins ? "purple" : "gray"}
                          variant={counterDuration === mins ? "solid" : "outline"}
                          flex={1}
                          size="sm"
                        >
                          {mins} min
                        </Button>
                      ))}
                    </HStack>
                  </Box>

                  {counterDate && counterTime && (
                    <Box
                      w="full"
                      p={4}
                      borderRadius="lg"
                      bg="pink.50"
                      border="1px"
                      borderColor="pink.200"
                    >
                      <Text fontSize="sm" fontWeight="semibold" color="gray.800">
                        Counter-proposal: {counterDuration}-minute call on{" "}
                        {new Date(counterDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at {counterTime}
                      </Text>
                    </Box>
                  )}

                  <HStack spacing={3} w="full">
                    <Button
                      onClick={() => {
                        setCounterProposalId(null);
                        setCounterDate("");
                        setCounterTime("");
                        setCounterDuration(30);
                      }}
                      flex={1}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const startDateTime = new Date(`${counterDate}T${counterTime}`);
                        const endDateTime = new Date(startDateTime.getTime() + counterDuration * 60000);
                        
                        respondMutation.mutate({
                          proposalId: proposal.id,
                          action: "substitute",
                          counterDateTime: {
                            start: startDateTime.toISOString(),
                            end: endDateTime.toISOString(),
                          },
                        });
                      }}
                      isDisabled={!counterDate || !counterTime || respondMutation.isPending}
                      isLoading={respondMutation.isPending}
                      flex={1}
                      colorScheme="purple"
                    >
                      Send Counter
                    </Button>
                  </HStack>
                </VStack>
              )}
            </VStack>
          )}

          {proposal.status === "accepted" && (
            <Button
              onClick={() => navigate(`/video/call?matchId=${proposal.match_id}`)}
              w="full"
              colorScheme="pink"
              shadow="lg"
              mt={4}
            >
              Join Video Date
            </Button>
          )}
        </CardBody>
      </Card>
    );
  };

  return (
    <Box minH="100vh" px={4} py={8} bg="gray.50">
      <Container maxW="2xl">
        <HStack mb={6} spacing={4}>
          <IconButton
            icon={<ArrowLeft size={24} />}
            onClick={() => navigate("/matches")}
            variant="ghost"
            aria-label="Back to matches"
          />
          <Heading size="2xl" color="gray.800">
            Video Date Proposals
          </Heading>
        </HStack>

        {pendingProposals.length > 0 && (
          <Box mb={8}>
            <Heading size="lg" mb={4} color="gray.800">
              Pending Proposals ({pendingProposals.length})
            </Heading>
            {pendingProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </Box>
        )}

        {sentProposals.length > 0 && (
          <Box mb={8}>
            <Heading size="lg" mb={4} color="gray.800">
              Sent Proposals ({sentProposals.length})
            </Heading>
            {sentProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </Box>
        )}

        {completedProposals.length > 0 && (
          <Box mb={8}>
            <Heading size="lg" mb={4} color="gray.800">
              Past Proposals ({completedProposals.length})
            </Heading>
            {completedProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </Box>
        )}

        {proposals.length === 0 && (
          <VStack spacing={4} py={12} textAlign="center">
            <Calendar size={64} opacity={0.3} color="gray.800" />
            <Text fontSize="lg" color="gray.800">
              No video date proposals yet
            </Text>
            <Button
              onClick={() => navigate("/matches")}
              colorScheme="purple"
              shadow="lg"
            >
              View Matches
            </Button>
          </VStack>
        )}
      </Container>
    </Box>
  );
}
