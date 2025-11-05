import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { BuyCreditsModal } from "@/components/BuyCreditsModal";
import { SmartNudge } from "@/components/SmartNudge";
import { Video, X, Clock, Crown } from "lucide-react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Spinner,
  Input,
  Textarea,
  Progress,
  IconButton,
  Badge,
  Card,
  CardBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Divider,
} from "@chakra-ui/react";

function ChatContent() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const { user, isLoading: userLoading } = useUser();
  
  // Notes state
  const [noteContent, setNoteContent] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  
  // Credits modal state
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  
  // Video call modal state
  const [showVideoCallModal, setShowVideoCallModal] = useState(false);
  const [creatingVideoCall, setCreatingVideoCall] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["messages", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${matchId}`);
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: 5000,
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  // Fetch note for the other user
  const { data: noteData } = useQuery({
    queryKey: ["note", data?.otherUser?.id],
    queryFn: async () => {
      if (!data?.otherUser?.id) return null;
      const res = await fetch(`/api/notes?targetUserId=${data.otherUser.id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!data?.otherUser?.id,
  });

  // Fetch message quota
  const { data: quotaData, refetch: refetchQuota } = useQuery({
    queryKey: ["messageQuota", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/quota?matchId=${matchId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!matchId,
    refetchInterval: 10000,
  });

  // Update note content when noteData changes
  React.useEffect(() => {
    if (noteData?.note) {
      setNoteContent(noteData.note.note_content || "");
    }
  }, [noteData]);

  const sendMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch(`/api/messages/${matchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const err = new Error(errorData.error || "Failed to send");
        err.response = res;
        err.data = errorData;
        throw err;
      }
      return res.json();
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["messages", matchId] });
      
      const previousMessages = queryClient.getQueryData(["messages", matchId]);
      
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        match_id: matchId,
        from_user_id: user?.id,
        body,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };
      
      queryClient.setQueryData(["messages", matchId], (old) => ({
        ...old,
        messages: [...(old?.messages || []), optimisticMessage],
      }));
      
      return { previousMessages };
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
      refetchQuota();
    },
    onError: async (e, body, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", matchId], context.previousMessages);
      }
      
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required. Please sign in to continue.");
        navigate("/account/signin");
        return;
      }
      
      if (e?.data?.quotaExceeded) {
        toast.error("Out of messages!");
        setShowBuyCreditsModal(true);
        return;
      }
      
      toast.error(e?.message || "Message failed to send");
    },
  });

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 50) {
      toast.error("Message must be between 1 and 50 characters");
      return;
    }
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  const startVideoCall = async () => {
    if (!data?.otherUser?.id) {
      toast.error("Unable to start video call");
      return;
    }
    
    setCreatingVideoCall(true);
    try {
      const res = await fetch("/api/video/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        if (error.upgradeRequired) {
          toast.error(error.error || "Please upgrade to start video calls");
          setShowVideoCallModal(false);
          navigate("/settings/subscription");
          return;
        }
        throw new Error(error.error || "Failed to create video call");
      }
      
      const data = await res.json();
      toast.success("Starting video call...");
      setShowVideoCallModal(false);
      
      navigate(`/video/call?matchId=${matchId}&minutes=${getCallDuration(user?.membership_tier || 'free')}`);
    } catch (error) {
      console.error("Video call error:", error);
      toast.error(error.message || "Could not start video call");
    } finally {
      setCreatingVideoCall(false);
    }
  };
  
  const getCallDuration = (tier) => {
    const durations = { free: 5, casual: 15, dating: 25, business: 45 };
    return durations[tier.toLowerCase()] || 5;
  };
  
  const getTierDisplay = (tier) => {
    const tierMap = { free: 'Free', casual: 'Casual', dating: 'Dating', business: 'Business' };
    return tierMap[tier.toLowerCase()] || 'Free';
  };

  const saveNote = async () => {
    if (!data?.otherUser?.id) return;
    
    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: data.otherUser.id,
          noteContent: noteContent.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to save note" }));
        throw new Error(error.error || "Failed to save note");
      }

      toast.success("Note saved!");
      setIsEditingNote(false);
      queryClient.invalidateQueries({ queryKey: ["note", data.otherUser.id] });
    } catch (err) {
      console.error("Failed to save note:", err);
      toast.error(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const msgs = data?.messages || [];
  const otherUser = data?.otherUser;
  
  const daysSinceFirstMessage = React.useMemo(() => {
    if (!msgs || msgs.length === 0) return 0;
    const firstMessage = msgs[0];
    const firstMessageDate = new Date(firstMessage.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - firstMessageDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [msgs]);

  // Conversation starters based on profile info
  const conversationStarters = React.useMemo(() => {
    const starters = [
      "Hey! How's your day going?",
      "Hi there! Great to connect with you 😊",
      "What are you up to today?",
      "Happy to match with you!",
    ];
    
    // Add personalized starters if we have profile info
    if (otherUser) {
      if (otherUser.membership_tier) {
        starters.push(`I see you're on the ${otherUser.membership_tier} plan too!`);
      }
    }
    
    return starters.slice(0, 4); // Show max 4 starters
  }, [otherUser]);

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
          <Text color="gray.700">Loading chat...</Text>
        </VStack>
      </Box>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <Heading size="xl" mb={4} color="gray.800">Chat</Heading>
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
          <Heading size="xl" mb={4} color="gray.800">Chat</Heading>
          <Text color="red.500">Error loading messages</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" w="full" flex="1" display="flex" flexDirection="column" px={4} py={8}>
        {/* Header with Video Call Button */}
        <Flex align="center" justify="space-between" mb={4}>
          <Heading size="xl" color="gray.800">
            Chat with {otherUser?.name || 'User'}
          </Heading>
          {otherUser?.video_call_available !== false ? (
            <Button
              onClick={() => setShowVideoCallModal(true)}
              leftIcon={<Video size={20} />}
              colorScheme="teal"
              shadow="md"
              _hover={{ shadow: "lg" }}
            >
              Start Video Call
            </Button>
          ) : (
            <Badge
              display="flex"
              alignItems="center"
              gap={2}
              px={4}
              py={2}
              borderRadius="lg"
              fontSize="sm"
              fontWeight="semibold"
              bg="gray.100"
              color="gray.600"
              title="This user is not accepting video calls at the moment"
            >
              <X size={20} />
              <Text>Video Calls Unavailable</Text>
            </Badge>
          )}
        </Flex>
        
        {/* Message Quota Counter */}
        {quotaData && (
          <Card mb={4} shadow="sm" bg="white">
            <CardBody p={4}>
              <Flex gap={4} align="stretch">
                <VStack flex={1} align="stretch" spacing={1}>
                  <Text fontSize="xs" fontWeight="medium" color="gray.600">
                    First Messages with {otherUser?.name || 'this user'}
                  </Text>
                  <HStack spacing={2}>
                    <Progress 
                      flex={1} 
                      value={(quotaData.quota.firstEncounter.remaining / quotaData.quota.firstEncounter.limit) * 100}
                      colorScheme="teal"
                      borderRadius="full"
                      size="sm"
                    />
                    <Text fontSize="sm" fontWeight="bold" color="gray.800">
                      {quotaData.quota.firstEncounter.remaining}/{quotaData.quota.firstEncounter.limit}
                    </Text>
                  </HStack>
                </VStack>
                <VStack flex={1} align="stretch" spacing={1}>
                  <Text fontSize="xs" fontWeight="medium" color="gray.600">
                    Daily Messages ({quotaData.tier})
                  </Text>
                  <HStack spacing={2}>
                    <Progress 
                      flex={1} 
                      value={(quotaData.quota.dailyTier.remaining / quotaData.quota.dailyTier.limit) * 100}
                      colorScheme="purple"
                      borderRadius="full"
                      size="sm"
                    />
                    <Text fontSize="sm" fontWeight="bold" color="gray.800">
                      {quotaData.quota.dailyTier.remaining}/{quotaData.quota.dailyTier.limit}
                    </Text>
                  </HStack>
                </VStack>
              </Flex>
              {quotaData.quota.credits.remaining > 0 && (
                <Box mt={3} pt={3} borderTop="1px" borderColor="gray.100">
                  <Text fontSize="xs" color="gray.600">
                    💳 Message Credits: <Text as="span" fontWeight="bold" color="gray.800">{quotaData.quota.credits.remaining}</Text>
                  </Text>
                </Box>
              )}
              {quotaData.hasVideoCalledWith && quotaData.tier === 'business' && (
                <HStack mt={2} fontSize="xs" color="teal.500">
                  <Text>✓</Text>
                  <Text fontWeight="medium">Premium features unlocked</Text>
                </HStack>
              )}
            </CardBody>
          </Card>
        )}
        
        {/* Smart Nudge */}
        {otherUser && msgs.length > 0 && (
          <SmartNudge 
            matchId={matchId}
            otherUserName={otherUser.name || 'this person'}
            daysSinceFirstMessage={daysSinceFirstMessage}
          />
        )}
        
        {/* Private Notes Section */}
        {otherUser && (
          <Card mb={4} shadow="sm" bg="white">
            <CardBody p={4}>
              <Flex align="center" justify="space-between" mb={2}>
                <Heading size="sm" color="gray.800">
                  📝 Private Note
                </Heading>
                {!isEditingNote && (
                  <Button
                    onClick={() => setIsEditingNote(true)}
                    size="sm"
                    variant="link"
                    colorScheme="purple"
                  >
                    {noteContent ? "Edit" : "Add Note"}
                  </Button>
                )}
              </Flex>
              
              {isEditingNote ? (
                <VStack spacing={2} align="stretch">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add your thoughts about this person... (e.g., 'Loves hiking', 'Works in tech')"
                    borderColor="gray.200"
                    focusBorderColor="purple.500"
                    rows={3}
                    maxLength={500}
                  />
                  <HStack spacing={2}>
                    <Button
                      onClick={() => {
                        setIsEditingNote(false);
                        setNoteContent(noteData?.note?.note_content || "");
                      }}
                      isDisabled={savingNote}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveNote}
                      isDisabled={savingNote}
                      size="sm"
                      colorScheme="purple"
                    >
                      {savingNote ? "Saving..." : "Save"}
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <Text fontSize="sm" color={noteContent ? "gray.800" : "gray.400"}>
                  {noteContent || "No notes yet. Click 'Add Note' to remember details about this person."}
                </Text>
              )}
            </CardBody>
          </Card>
        )}
        
        <Box flex={1} overflowY="auto" mb={4}>
          {msgs.length === 0 ? (
            <VStack py={8} spacing={6}>
              <VStack textAlign="center" spacing={2}>
                <Heading size="md" color="gray.800">
                  Start the conversation!
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  Pick a conversation starter or write your own message
                </Text>
              </VStack>
              
              <VStack spacing={2} maxW="md" w="full" mx="auto">
                {conversationStarters.map((starter, idx) => (
                  <Button
                    key={idx}
                    onClick={() => setText(starter)}
                    w="full"
                    textAlign="left"
                    justifyContent="flex-start"
                    px={4}
                    py={3}
                    h="auto"
                    whiteSpace="normal"
                    borderWidth={2}
                    borderColor="gray.100"
                    bg="white"
                    color="gray.800"
                    _hover={{ shadow: "md" }}
                    variant="outline"
                  >
                    <Text fontSize="sm">{starter}</Text>
                  </Button>
                ))}
              </VStack>
            </VStack>
          ) : (
            <VStack spacing={2} align="stretch">
              {msgs.map((item) => (
                <Box key={item.id} py={2}>
                  <Text fontSize="sm" color="gray.800">{item.body}</Text>
                  <Text fontSize="xs" color="gray.400" mt={1}>
                    {new Date(item.created_at).toLocaleTimeString()}
                  </Text>
                </Box>
              ))}
            </VStack>
          )}
        </Box>

        <HStack spacing={2}>
          <Input
            type="text"
            placeholder="Type a message (max 50)"
            value={text}
            onChange={(e) => e.target.value.length <= 50 && setText(e.target.value)}
            maxLength={50}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            borderColor="gray.200"
            bg="white"
          />
          <Button
            onClick={send}
            isDisabled={sendMutation.isPending}
            colorScheme="purple"
            isLoading={sendMutation.isPending}
            loadingText="Sending..."
          >
            Send
          </Button>
        </HStack>
      </Container>
      
      <BuyCreditsModal 
        isOpen={showBuyCreditsModal} 
        onClose={() => setShowBuyCreditsModal(false)}
        currentTier={quotaData?.tier || 'free'}
      />
      
      {/* Video Call Confirmation Modal */}
      <Modal 
        isOpen={showVideoCallModal} 
        onClose={() => !creatingVideoCall && setShowVideoCallModal(false)}
        size="md"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent borderRadius="2xl" shadow="2xl" maxH="90vh" overflowY="auto">
          <ModalHeader>
            <HStack spacing={3}>
              <Flex
                p={3}
                borderRadius="full"
                bg="teal.50"
              >
                <Video size={28} color="#00BFA6" />
              </Flex>
              <VStack align="start" spacing={0}>
                <Heading size="lg" color="gray.800">
                  Start Video Call?
                </Heading>
                <Text fontSize="sm" color="gray.500" fontWeight="normal">
                  Connect with {otherUser?.name || 'this user'}
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton isDisabled={creatingVideoCall} />
          
          <ModalBody pb={6}>
            {/* Call Details */}
            <Card mb={6} bg="gray.50">
              <CardBody p={4}>
                <HStack spacing={2} mb={3}>
                  <Clock size={20} color="#7c3aed" />
                  <Heading size="sm" color="gray.800">
                    Your Call Duration
                  </Heading>
                </HStack>
                <Flex justify="space-between" align="center">
                  <VStack align="start" spacing={1}>
                    <Heading size="2xl" color="purple.600">
                      {getCallDuration(user?.membership_tier || 'free')} minutes
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      {getTierDisplay(user?.membership_tier || 'free')} tier
                    </Text>
                  </VStack>
                  <VStack align="end" spacing={0}>
                    <Text fontSize="xs" color="gray.500">Extensions available</Text>
                    <Text fontSize="sm" fontWeight="semibold" color="teal.500">
                      +10 min for $8
                    </Text>
                  </VStack>
                </Flex>
              </CardBody>
            </Card>

            {/* Upgrade Prompt for Free Users */}
            {user?.membership_tier === 'free' && (
              <Card mb={6} borderWidth={2} borderColor="purple.200" bg="purple.50">
                <CardBody p={4}>
                  <HStack align="start" spacing={3}>
                    <Crown size={24} color="#7c3aed" />
                    <VStack align="start" flex={1} spacing={2}>
                      <Heading size="sm" color="purple.600">
                        Get More Time!
                      </Heading>
                      <Text fontSize="sm" color="gray.700">
                        Upgrade to Casual ($9.99/mo) for 15-minute calls, or Dating ($29.99/mo) for 25-minute calls.
                      </Text>
                      <Button
                        onClick={() => {
                          setShowVideoCallModal(false);
                          navigate("/settings/subscription");
                        }}
                        size="sm"
                        variant="link"
                        colorScheme="purple"
                      >
                        View Plans →
                      </Button>
                    </VStack>
                  </HStack>
                </CardBody>
              </Card>
            )}

            {/* Important Notes */}
            <VStack align="start" spacing={2} mb={6}>
              <Text fontSize="sm" color="gray.600">
                ✓ Video call will start immediately
              </Text>
              <Text fontSize="sm" color="gray.600">
                ✓ Both participants will be notified
              </Text>
              <Text fontSize="sm" color="gray.600">
                ✓ You can extend the call with in-call purchases
              </Text>
            </VStack>

            {/* Action Buttons */}
            <HStack spacing={3}>
              <Button
                onClick={() => setShowVideoCallModal(false)}
                isDisabled={creatingVideoCall}
                flex={1}
                size="lg"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={startVideoCall}
                isDisabled={creatingVideoCall}
                isLoading={creatingVideoCall}
                loadingText="Starting..."
                flex={1}
                size="lg"
                colorScheme="teal"
                shadow="md"
                _hover={{ shadow: "lg" }}
              >
                Start Call
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default function Chat() {
  return (
    <ErrorBoundary componentName="Chat">
      <ChatContent />
    </ErrorBoundary>
  );
}
