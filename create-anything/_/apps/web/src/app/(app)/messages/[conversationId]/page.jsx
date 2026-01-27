import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { BuyCreditsModal } from "@/components/BuyCreditsModal";
import { SmartNudge } from "@/components/SmartNudge";
import { 
  LongMessagePrompt,
  VideoSchedulingNudge,
  DecayModePrompt,
  PreVideoLimitReached
} from "@/components/SmartPrompts";
import { Video, X, Clock, Crown, ArrowLeft } from "lucide-react";
import { containsExternalContact, PHONE_NUMBER_SECURITY_MESSAGE } from "@/utils/safetyFilters";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
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
  Avatar,
} from "@chakra-ui/react";

function ChatContent() {
  const { conversationId } = useParams();
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
  
  // Cooldown timer state for free tier limit
  const [videoCooldown, setVideoCooldown] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  
  // Incoming call state
  const [incomingCall, setIncomingCall] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [respondingToCall, setRespondingToCall] = useState(false);
  
  // Outgoing invitation state
  const [outgoingInvitation, setOutgoingInvitation] = useState(null);
  const [outgoingInvitationPolled, setOutgoingInvitationPolled] = useState(false);
  
  // Smart prompts state
  const [showLongMessagePrompt, setShowLongMessagePrompt] = useState(false);
  const [showVideoNudge, setShowVideoNudge] = useState(false);
  const [showDecayPrompt, setShowDecayPrompt] = useState(false);
  const [showLimitPrompt, setShowLimitPrompt] = useState(false);
  
  // Track if prompts have been dismissed (persist dismissal)
  const longMessageDismissed = useRef(false);
  const videoNudgeDismissed = useRef(false);
  const decayModeDismissed = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (res.status === 403) {
        const err = new Error("BLOCKED");
        err.code = 403;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    refetchInterval: (data, query) => {
      // Don't refetch if there's a 403 error (blocked conversation)
      if (query?.state?.error?.code === 403) return false;
      return 5000;
    },
    retry: (count, err) => {
      // Don't retry on 401 or 403 errors
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      if (err?.code === 403 || err?.message === "BLOCKED") return false;
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

  // Fetch message quota (using new Progressive Video Unlock API)
  const { data: quotaData, refetch: refetchQuota } = useQuery({
    queryKey: ["conversationQuota", conversationId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/conversation-quota?conversationId=${conversationId}`);
      if (res.status === 403) {
        // Conversation blocked, return null
        return null;
      }
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!conversationId,
    refetchInterval: 10000,
    retry: false, // Don't retry quota fetches
  });
  
  // Poll for incoming video call invitations
  const { data: invitationData } = useQuery({
    queryKey: ["callInvitations", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/video/invitations/poll");
      if (!res.ok) return { incomingInvitation: null, outgoingInvitation: null };
      return res.json();
    },
    refetchInterval: 3000,
    enabled: !!conversationId && !!user?.id,
    retry: false,
  });

  // Handle incoming call invitation
  useEffect(() => {
    if (invitationData?.incomingInvitation && !incomingCall) {
      setIncomingCall(invitationData.incomingInvitation);
    }
    // Clear stale incoming call if poll no longer returns it (caller canceled)
    if (!invitationData?.incomingInvitation && incomingCall) {
      setIncomingCall(null);
    }
  }, [invitationData, incomingCall]);

  // Handle outgoing invitation responses (caller-side)
  useEffect(() => {
    const outgoing = invitationData?.outgoingInvitation;
    
    // Track if poll has confirmed our invitation
    if (outgoing && outgoing.id === outgoingInvitation?.id) {
      setOutgoingInvitationPolled(true);
    }
    
    // Hydrate outgoing invitation from poll if it exists (handles page refresh)
    if (outgoing && !outgoingInvitation) {
      setOutgoingInvitation(outgoing);
      setOutgoingInvitationPolled(true);
      setShowVideoCallModal(true); // Reopen modal to show waiting state
    }
    
    // Clear outgoing invitation ONLY if poll previously confirmed it and now it's gone
    // This prevents clearing immediately after creation before poll catches up
    if (!outgoing && outgoingInvitation && outgoingInvitationPolled) {
      setOutgoingInvitation(null);
      setOutgoingInvitationPolled(false);
      setShowVideoCallModal(false);
    }
    
    // Process outgoing invitation status changes
    if (outgoing) {
      // Update local state if poll returns updated status
      if (outgoing.id === outgoingInvitation?.id && outgoing.status !== outgoingInvitation?.status) {
        setOutgoingInvitation(outgoing);
      }
      
      if (outgoing.status === 'accepted') {
        // Callee accepted! Navigate to call
        setOutgoingInvitation(null);
        setOutgoingInvitationPolled(false);
        setShowVideoCallModal(false);
        const actualMatchId = data?.matchId || conversationId;
        navigate(`/video/call?matchId=${actualMatchId}&minutes=${getCallDuration(user?.membership_tier || 'free')}`);
      } else if (outgoing.status === 'declined') {
        // Callee declined
        toast.error(`Call declined: ${outgoing.decline_reason || "Not available right now"}`);
        setOutgoingInvitation(null);
        setOutgoingInvitationPolled(false);
        setShowVideoCallModal(false);
      } else if (outgoing.status === 'expired') {
        // Invitation expired
        toast.error("Call invitation expired");
        setOutgoingInvitation(null);
        setOutgoingInvitationPolled(false);
        setShowVideoCallModal(false);
      }
    }
  }, [invitationData, outgoingInvitation, outgoingInvitationPolled, data, conversationId, user, navigate]);
  
  // Monitor text length for long message prompt (280+ characters)
  useEffect(() => {
    if (text.length >= 280 && !showLongMessagePrompt && !longMessageDismissed.current) {
      setShowLongMessagePrompt(true);
    }
    // Reset dismissal when text goes below threshold (user deleted text)
    if (text.length < 280) {
      longMessageDismissed.current = false;
    }
  }, [text, showLongMessagePrompt]);
  
  // Monitor message count for video scheduling nudge (at message 8)
  useEffect(() => {
    if (quotaData?.messagesSentToday === 8 && quotaData?.messagesRemaining === 2 && !quotaData?.hasCompletedVideo && !videoNudgeDismissed.current) {
      setShowVideoNudge(true);
    }
    // Reset dismissal when message count changes (user sent another message)
    if (quotaData?.messagesSentToday !== 8) {
      videoNudgeDismissed.current = false;
    }
  }, [quotaData]);
  
  // Monitor decay mode
  useEffect(() => {
    if (quotaData?.isDecayMode && quotaData?.messagesRemaining <= 1 && !showDecayPrompt && !decayModeDismissed.current) {
      setShowDecayPrompt(true);
    }
    // Reset dismissal when decay mode ends (video call completed)
    if (!quotaData?.isDecayMode) {
      decayModeDismissed.current = false;
    }
  }, [quotaData, showDecayPrompt]);

  // Update note content when noteData changes
  React.useEffect(() => {
    if (noteData?.note) {
      setNoteContent(noteData.note.note_content || "");
    }
  }, [noteData]);
  
  // Countdown timer effect for video cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      setVideoCooldown(null);
      return;
    }
    
    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          setVideoCooldown(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const sendMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
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
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });
      
      const previousMessages = queryClient.getQueryData(["messages", conversationId]);
      
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: user?.id,
        body,
        created_at: new Date().toISOString(),
        is_optimistic: true,
      };
      
      queryClient.setQueryData(["messages", conversationId], (old) => ({
        ...old,
        messages: [...(old?.messages || []), optimisticMessage],
      }));
      
      return { previousMessages };
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      refetchQuota();
    },
    onError: async (e, body, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", conversationId], context.previousMessages);
      }
      
      if (e?.code === 401 || e?.message === "AUTH_401") {
        toast.error("Sign in required. Please sign in to continue.");
        navigate("/account/signin");
        return;
      }
      
      // Progressive Video Unlock - Show appropriate prompt based on reason
      if (e?.data?.quotaExceeded) {
        const reason = e?.data?.reason;
        
        if (reason === 'pre_video_limit') {
          setShowLimitPrompt(true); // PreVideoLimitReached prompt
        } else if (reason === 'decay_limit') {
          setShowDecayPrompt(true); // DecayModePrompt
        } else {
          // Generic limit reached - show buy credits modal
          setShowBuyCreditsModal(true);
        }
        return;
      }
      
      toast.error(e?.message || "Message failed to send");
    },
  });

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Message cannot be empty");
      return;
    }
    if (text.length > 280) {
      toast.error("Message exceeds 280 characters. Please keep messages brief and focused on scheduling your video chat!");
      return;
    }
    if (containsExternalContact(trimmed)) {
      toast.error(PHONE_NUMBER_SECURITY_MESSAGE);
      return;
    }
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  const startVideoCall = async () => {
    if (!data?.otherUser?.id) {
      toast.error("Unable to start video call");
      return;
    }
    
    // Use matchId from API response (legacy_match_id), fallback to conversationId
    const matchId = data?.matchId || conversationId;
    
    setCreatingVideoCall(true);
    try {
      const res = await fetch("/api/video/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: Number(matchId) }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        
        if (error.isLimitExceeded && error.secondsUntilAvailable !== undefined) {
          setVideoCooldown({
            nextAvailableAt: error.nextAvailableAt,
            currentMeetings: error.currentMeetings,
            maxMeetings: error.maxMeetings
          });
          setCooldownSeconds(error.secondsUntilAvailable);
          setShowVideoCallModal(false);
          toast.error(error.error);
          return;
        }
        
        if (error.requiresSchedule) {
          toast.error(error.error || "Please schedule your first video call");
          setShowVideoCallModal(false);
          // Optionally navigate to schedule page
          setTimeout(() => {
            navigate(`/schedule/propose/${data.otherUser.id}`);
          }, 1500);
          return;
        }
        
        if (error.upgradeRequired) {
          toast.error(error.error || "Please upgrade to start video calls");
          setShowVideoCallModal(false);
          navigate("/settings/subscription");
          return;
        }
        throw new Error(error.error || "Failed to create video call");
      }
      
      const invitationResponse = await res.json();
      
      // Store the invitation and wait for callee's response
      setOutgoingInvitation(invitationResponse.invitation);
      toast.success("Call invitation sent! Waiting for response...");
      
      // Modal stays open showing "Waiting for response" UI
      // Navigation happens in useEffect when invitation is accepted
    } catch (error) {
      console.error("Video call error:", error);
      toast.error(error.message || "Could not start video call");
      setShowVideoCallModal(false);
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
  
  const formatCooldownTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    
    setRespondingToCall(true);
    try {
      const res = await fetch(`/api/video/invitations/${incomingCall.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to accept call");
      }

      const { matchId: callMatchId } = await res.json();
      setIncomingCall(null);
      navigate(`/video/call?matchId=${callMatchId}&minutes=${getCallDuration(user?.membership_tier || 'free')}`);
    } catch (error) {
      console.error("Accept call error:", error);
      toast.error(error.message || "Failed to accept call");
    } finally {
      setRespondingToCall(false);
    }
  };

  const declineIncomingCall = async () => {
    if (!incomingCall) return;
    
    setRespondingToCall(true);
    try {
      const res = await fetch(`/api/video/invitations/${incomingCall.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "decline",
          declineReason: declineReason.trim() || "Not available right now"
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to decline call");
      }

      toast.success("Call declined");
      setIncomingCall(null);
      setDeclineReason("");
    } catch (error) {
      console.error("Decline call error:", error);
      toast.error(error.message || "Failed to decline call");
    } finally {
      setRespondingToCall(false);
    }
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

  // Anti-catfishing nudge state
  const [dismissedCatfishNudge, setDismissedCatfishNudge] = React.useState(false);
  const showCatfishNudge = msgs.length >= 5 && !dismissedCatfishNudge;

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
    return <SessionExpired />;
  }

  if (error?.code === 403 || error?.message === "BLOCKED") {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <VStack spacing={6} py={12}>
            <Box fontSize="6xl">🚫</Box>
            <Heading size="lg" color="gray.800" textAlign="center">
              Conversation Unavailable
            </Heading>
            <Text color="gray.600" textAlign="center" maxW="md">
              This conversation is no longer accessible. This may happen if you or the other person has blocked each other.
            </Text>
            <Button
              onClick={() => navigate('/messages')}
              colorScheme="purple"
              size="lg"
              mt={4}
            >
              Back to Messages
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
        {/* Header with Back Button, Profile Picture, and Name */}
        <HStack spacing={4} mb={4} align="center">
          <IconButton
            icon={<ArrowLeft size={20} />}
            onClick={() => navigate('/messages')}
            variant="ghost"
            colorScheme="gray"
            aria-label="Back to Messages"
            size="md"
            _hover={{ bg: "gray.100" }}
          />
          <Box
            onClick={() => otherUser?.id && navigate(`/profile/${otherUser.id}`)}
            cursor="pointer"
            _hover={{ opacity: 0.8 }}
          >
            {otherUser?.photo ? (
              <Avatar
                src={getAbsoluteUrl(otherUser.photo)}
                name={otherUser.name || 'User'}
                size="md"
              />
            ) : (
              <Avatar
                name={otherUser?.name || 'User'}
                size="md"
                bg="purple.100"
                color="purple.600"
              />
            )}
          </Box>
          <VStack align="start" spacing={0} flex={1}>
            <HStack align="center" spacing={2}>
              <Heading size="lg" color="gray.800">
                {otherUser?.name || 'User'}
              </Heading>
              {/* Online/Offline Status Dot - clickable for instant call ONLY if users have video history */}
              {otherUser?.immediate_available && !otherUser?.availability_override && otherUser?.video_call_available !== false && otherUser?.hasVideoHistory ? (
                <Box
                  as="button"
                  onClick={() => {
                    if (videoCooldown) {
                      toast.error(`On Cooldown - Next call available in ${formatCooldownTime(cooldownSeconds)}`);
                    } else {
                      setShowVideoCallModal(true);
                    }
                  }}
                  w="12px"
                  h="12px"
                  borderRadius="full"
                  bg="green.500"
                  cursor="pointer"
                  _hover={{ transform: "scale(1.2)", bg: "green.600" }}
                  transition="all 0.2s"
                  aria-label="Online - tap to call"
                />
              ) : (
                <Box
                  w="12px"
                  h="12px"
                  borderRadius="full"
                  bg="gray.400"
                  aria-label="Offline"
                />
              )}
            </HStack>
            <Text fontSize="sm" color="gray.500">
              {otherUser?.immediate_available && !otherUser?.availability_override && otherUser?.hasVideoHistory
                ? "Tap dot to call • Click photo for profile" 
                : otherUser?.immediate_available && !otherUser?.availability_override && !otherUser?.hasVideoHistory
                ? "Online • Schedule first call • Click photo for profile"
                : "Offline • Click photo to view profile"}
            </Text>
          </VStack>
          {videoCooldown ? (
            <VStack align="end" spacing={0}>
              <Badge
                display="flex"
                alignItems="center"
                gap={2}
                px={4}
                py={2}
                borderRadius="lg"
                fontSize="sm"
                fontWeight="semibold"
                bg="orange.50"
                color="orange.700"
                borderWidth="1px"
                borderColor="orange.200"
              >
                <Clock size={18} />
                <Text>Next call in: {formatCooldownTime(cooldownSeconds)}</Text>
              </Badge>
              <Text fontSize="xs" color="gray.500" mt={1}>
                {videoCooldown.currentMeetings}/{videoCooldown.maxMeetings} daily video calls used
              </Text>
            </VStack>
          ) : otherUser?.video_call_available !== false ? (
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
        </HStack>
        
        {/* Chat Purpose Reminder */}
        <Card mb={4} shadow="sm" bg="purple.50" borderColor="purple.200" borderWidth="1px">
          <CardBody p={3}>
            <HStack spacing={3} align="start">
              <Box fontSize="2xl">📹</Box>
              <VStack align="start" spacing={1} flex={1}>
                <Text fontSize="sm" fontWeight="bold" color="purple.900">
                  💬 Chat Smart, Meet Real
                </Text>
                <Text fontSize="xs" color="purple.800" lineHeight="1.5">
                  Keep messages brief and focused on scheduling your video date! Chat has a 280-character limit to encourage authentic video connections and prevent endless texting. Real chemistry happens face-to-face! 🎥
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>

        {/* Anti-Catfishing Nudge */}
        {showCatfishNudge && (
          <Card mb={4} shadow="md" bg="gradient-to-r from-orange.50 to-red.50" borderColor="orange.300" borderWidth="2px">
            <CardBody p={4}>
              <Flex align="start" gap={3}>
                <Box fontSize="3xl" flexShrink={0}>🚨</Box>
                <VStack align="start" spacing={2} flex={1}>
                  <Heading size="sm" color="red.800">
                    Don't Wanna Be Catfished?
                  </Heading>
                  <Text fontSize="sm" color="red.900" fontWeight="medium" lineHeight="1.6">
                    You've exchanged {msgs.length} messages but haven't video chatted yet. Real people show their faces! 
                    Start a Video Chat now and verify who you're really talking to. It's the PRIMARY feature of this app! 🎥
                  </Text>
                  <HStack spacing={2} mt={1}>
                    <Button
                      onClick={() => setShowVideoCallModal(true)}
                      leftIcon={<Video size={18} />}
                      colorScheme="red"
                      size="sm"
                      shadow="md"
                      fontWeight="bold"
                    >
                      Start Video Chat Now
                    </Button>
                    <Button
                      onClick={() => setDismissedCatfishNudge(true)}
                      variant="ghost"
                      size="sm"
                      color="red.700"
                    >
                      Dismiss
                    </Button>
                  </HStack>
                </VStack>
              </Flex>
            </CardBody>
          </Card>
        )}
        
        {/* Message Quota Counter */}
        {quotaData && (
          <Card mb={4} shadow="sm" bg="white">
            <CardBody p={4}>
              <Flex gap={4} align="stretch">
                <VStack flex={1} align="stretch" spacing={1}>
                  <Text fontSize="xs" fontWeight="medium" color="gray.600">
                    Messages with {otherUser?.name || 'this user'}
                  </Text>
                  <HStack spacing={2}>
                    <Progress 
                      flex={1} 
                      value={(quotaData.messagesRemaining / quotaData.messagesAllowedToday) * 100}
                      colorScheme={quotaData.messagesRemaining > 5 ? "teal" : quotaData.messagesRemaining > 0 ? "orange" : "red"}
                      borderRadius="full"
                      size="sm"
                    />
                    <Text fontSize="sm" fontWeight="bold" color="gray.800">
                      {quotaData.messagesRemaining}/{quotaData.messagesAllowedToday}
                    </Text>
                  </HStack>
                  {quotaData.isDecayMode && (
                    <Text fontSize="xs" color="orange.600" fontWeight="medium">
                      ⏱️ Decay mode - Complete a video call to restore full quota
                    </Text>
                  )}
                  {quotaData.hasCompletedVideo && quotaData.bonusMessages > 0 && (
                    <Text fontSize="xs" color="teal.600" fontWeight="medium">
                      ✅ +{quotaData.bonusMessages} bonus messages (video completed)
                    </Text>
                  )}
                </VStack>
              </Flex>
              {quotaData.creditsAvailable > 0 && (
                <Box mt={3} pt={3} borderTop="1px" borderColor="gray.100">
                  <Text fontSize="xs" color="gray.600">
                    💳 Message Credits: <Text as="span" fontWeight="bold" color="gray.800">{quotaData.creditsAvailable}</Text>
                  </Text>
                </Box>
              )}
            </CardBody>
          </Card>
        )}
        
        {/* Smart Nudge */}
        {otherUser && msgs.length > 0 && (
          <SmartNudge 
            conversationId={conversationId}
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
                    bg="purple.500"
                    color="white"
                    _hover={{ bg: "purple.600" }}
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

        <VStack spacing={1} align="stretch">
          <HStack spacing={2}>
            <Input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={280}
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
          <HStack justify="space-between" align="center">
            <Text fontSize="xs" color="purple.600" fontWeight="medium">
              💡 Tip: Keep it brief, then schedule a video date!
            </Text>
            <Text 
              fontSize="xs" 
              color={text.length > 240 ? "orange.500" : text.length > 280 ? "red.500" : "gray.500"} 
              fontWeight={text.length > 240 ? "bold" : "normal"}
            >
              {text.length}/280
            </Text>
          </HStack>
        </VStack>
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
                bg={outgoingInvitation ? "purple.50" : "teal.50"}
              >
                <Video size={28} color={outgoingInvitation ? "#7c3aed" : "#00BFA6"} />
              </Flex>
              <VStack align="start" spacing={0}>
                <Heading size="lg" color="gray.800">
                  {outgoingInvitation ? "Waiting for Response..." : "Start Video Call?"}
                </Heading>
                <Text fontSize="sm" color="gray.500" fontWeight="normal">
                  {outgoingInvitation ? `Calling ${otherUser?.name || 'this user'}...` : `Connect with ${otherUser?.name || 'this user'}`}
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton isDisabled={creatingVideoCall || outgoingInvitation} />
          
          <ModalBody pb={6}>
            {outgoingInvitation ? (
              // Waiting State
              <VStack spacing={4} py={6}>
                <Spinner size="xl" color="purple.500" thickness="4px" />
                <VStack spacing={2} textAlign="center">
                  <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                    Invitation Sent
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {otherUser?.name || 'The other user'} will receive a notification. Please wait...
                  </Text>
                </VStack>
                <Button
                  onClick={async () => {
                    try {
                      await fetch(`/api/video/invitations/${outgoingInvitation.id}/cancel`, {
                        method: "POST",
                      });
                      setOutgoingInvitation(null);
                      setShowVideoCallModal(false);
                      toast.info("Call invitation canceled");
                    } catch (error) {
                      console.error("Failed to cancel invitation", error);
                    }
                  }}
                  size="sm"
                  variant="outline"
                  colorScheme="gray"
                >
                  Cancel Invitation
                </Button>
              </VStack>
            ) : (
              // Confirmation State
              <>
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
            </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
      
      {/* Incoming Call Modal */}
      {incomingCall && (
        <Modal 
          isOpen={!!incomingCall} 
          onClose={() => !respondingToCall && setIncomingCall(null)}
          size="md"
          isCentered
        >
          <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" />
          <ModalContent borderRadius="2xl" shadow="2xl">
            <ModalHeader>
              <VStack spacing={3} align="center" pt={4}>
                <Flex
                  p={4}
                  borderRadius="full"
                  bg="green.50"
                  animation="pulse 2s infinite"
                >
                  <Video size={36} color="#00BFA6" />
                </Flex>
                <VStack spacing={1}>
                  <Heading size="lg" color="gray.800">
                    Incoming Video Call
                  </Heading>
                  <Text fontSize="md" color="gray.600">
                    {incomingCall.caller_name || 'Someone'} is calling you
                  </Text>
                </VStack>
              </VStack>
            </ModalHeader>
            
            <ModalBody pb={6}>
              <VStack spacing={4}>
                {/* Avatar Section */}
                <Box>
                  <Avatar 
                    src={incomingCall.caller_photo ? getAbsoluteUrl(incomingCall.caller_photo) : undefined}
                    name={incomingCall.caller_name || 'User'}
                    size="xl"
                  />
                </Box>
                
                {/* Action Buttons */}
                <HStack spacing={3} w="full">
                  <Button
                    onClick={declineIncomingCall}
                    isDisabled={respondingToCall}
                    flex={1}
                    size="lg"
                    colorScheme="red"
                    variant="outline"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={acceptIncomingCall}
                    isDisabled={respondingToCall}
                    isLoading={respondingToCall}
                    loadingText="Joining..."
                    flex={1}
                    size="lg"
                    colorScheme="green"
                    shadow="md"
                    _hover={{ shadow: "lg" }}
                  >
                    Accept
                  </Button>
                </HStack>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}
      
      {/* Smart Prompts for Progressive Video Unlock */}
      {showLongMessagePrompt && (
        <LongMessagePrompt
          onKeepTyping={() => {
            longMessageDismissed.current = true;
            setShowLongMessagePrompt(false);
            // Text continues as-is, user can send (will cost 1 credit if over limit)
          }}
          onScheduleVideo={() => {
            longMessageDismissed.current = true;
            setShowLongMessagePrompt(false);
            navigate(`/schedule/propose/${data?.otherUser?.id}`);
          }}
          onDismiss={() => {
            longMessageDismissed.current = true;
            setShowLongMessagePrompt(false);
            setText(""); // Clear the text
          }}
        />
      )}
      
      {showVideoNudge && (
        <VideoSchedulingNudge
          onScheduleVideo={() => {
            videoNudgeDismissed.current = true;
            setShowVideoNudge(false);
            navigate(`/schedule/propose/${data?.otherUser?.id}`);
          }}
          onDismiss={() => {
            videoNudgeDismissed.current = true;
            setShowVideoNudge(false);
          }}
          messagesRemaining={quotaData?.messagesRemaining || 0}
        />
      )}
      
      {showDecayPrompt && (
        <DecayModePrompt
          onScheduleVideo={() => {
            decayModeDismissed.current = true;
            setShowDecayPrompt(false);
            navigate(`/schedule/propose/${data?.otherUser?.id}`);
          }}
          onDismiss={() => {
            decayModeDismissed.current = true;
            setShowDecayPrompt(false);
          }}
        />
      )}
      
      {showLimitPrompt && (
        <PreVideoLimitReached
          onScheduleVideo={() => {
            setShowLimitPrompt(false);
            navigate(`/schedule/propose/${data?.otherUser?.id}`);
          }}
          onBuyCredits={() => {
            setShowLimitPrompt(false);
            setShowBuyCreditsModal(true);
          }}
          onDismiss={() => setShowLimitPrompt(false)}
        />
      )}
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
