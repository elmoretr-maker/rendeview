import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Phone, 
  Flag, 
  AlertTriangle,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  X
} from "lucide-react";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import useUser from "@/utils/useUser";
import {
  Box,
  VStack,
  HStack,
  Flex,
  Heading,
  Text,
  Button,
  Spinner,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  IconButton,
  Badge
} from "@chakra-ui/react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

const EXTENSION_COST = 8;
const EXTENSION_MINUTES = 10;
const GRACE_PERIOD_SECONDS = 20;

function PaymentForm({ clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || processing) return;

    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message);
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Payment failed");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <HStack spacing={3} mt={4}>
        <Button
          type="button"
          onClick={onCancel}
          isDisabled={processing}
          flex={1}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isDisabled={!stripe || processing}
          isLoading={processing}
          loadingText="Processing..."
          flex={1}
          colorScheme="purple"
        >
          Pay ${EXTENSION_COST}.00
        </Button>
      </HStack>
    </form>
  );
}

export default function VideoCall() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useUser();
  const matchId = searchParams.get("matchId");
  const roomUrl = searchParams.get("roomUrl");

  const [isMounted, setIsMounted] = useState(false);
  const [currentRoomUrl, setCurrentRoomUrl] = useState(roomUrl);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [error, setError] = useState(null);

  const [sessionData, setSessionData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [localRemainingSeconds, setLocalRemainingSeconds] = useState(null);
  const [graceCountdown, setGraceCountdown] = useState(null);

  const [showExtendInitiateModal, setShowExtendInitiateModal] = useState(false);
  const [showExtendResponseModal, setShowExtendResponseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState(null);
  const [currentExtension, setCurrentExtension] = useState(null);
  const [userTier, setUserTier] = useState(null);
  const [showTimeLimitNudge, setShowTimeLimitNudge] = useState(false);
  const [showTierUpgradeNudge, setShowTierUpgradeNudge] = useState(false);
  const [otherUserTierName, setOtherUserTierName] = useState(null);
  
  // Post-call note modal
  const [showPostCallNoteModal, setShowPostCallNoteModal] = useState(false);
  const [postCallNote, setPostCallNote] = useState("");
  const [otherUserId, setOtherUserId] = useState(null);
  const [savingNote, setSavingNote] = useState(false);

  const pollIntervalRef = useRef(null);
  const localTimerRef = useRef(null);
  const graceTimerRef = useRef(null);
  const timeLimitNudgeShown = useRef(false);
  const tierUpgradeNudgeShown = useRef(false);
  const noteModalShown = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const pollSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      const res = await fetch(`/api/video/sessions/${sessionId}`);
      if (!res.ok) return;

      const data = await res.json();
      setSessionData(data);

      if (data.session.remainingSeconds !== undefined) {
        setLocalRemainingSeconds(data.session.remainingSeconds);
      }

      if (!tierUpgradeNudgeShown.current && data.currentUserTier && data.otherUserTier) {
        const tierOrder = { free: 0, casual: 1, dating: 2, business: 3 };
        const currentTierLevel = tierOrder[data.currentUserTier] || 0;
        const otherTierLevel = tierOrder[data.otherUserTier] || 0;
        
        if (currentTierLevel < otherTierLevel) {
          tierUpgradeNudgeShown.current = true;
          const tierNames = { free: 'Free', casual: 'Casual', dating: 'Dating', business: 'Business' };
          setOtherUserTierName(tierNames[data.otherUserTier] || 'Premium');
          setShowTierUpgradeNudge(true);
        }
      }

      if (data.session.state === "ended" && !noteModalShown.current) {
        if (!showExtendResponseModal && !showPaymentModal) {
          noteModalShown.current = true;
          
          const callerId = data.session.caller_id;
          const calleeId = data.session.callee_id;
          const currentUserId = currentUser?.id;
          const otherUser = currentUserId === callerId ? calleeId : callerId;
          
          setOtherUserId(otherUser);
          setShowPostCallNoteModal(true);
        }
        return;
      }

      if (data.session.isInGracePeriod) {
        const graceExpires = new Date(data.session.graceExpiresAt).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((graceExpires - now) / 1000));
        setGraceCountdown(remaining);
      } else {
        setGraceCountdown(null);
      }

      const pendingExt = data.pendingExtensions?.[0];
      if (pendingExt) {
        setCurrentExtension(pendingExt);
        if (pendingExt.isResponder && pendingExt.status === "pending_acceptance") {
          setShowExtendResponseModal(true);
        }
      } else {
        setCurrentExtension(null);
        setShowExtendResponseModal(false);
        setShowPaymentModal(false);
      }
    } catch (err) {
      console.error("Poll session error:", err);
    }
  }, [sessionId, navigate, currentUser, showExtendResponseModal, showPaymentModal]);

  useEffect(() => {
    const interval = sessionData?.pendingExtensions?.length > 0 || graceCountdown !== null
      ? 500
      : 2000;

    pollIntervalRef.current = setInterval(pollSession, interval);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [pollSession, sessionData, graceCountdown]);

  useEffect(() => {
    localTimerRef.current = setInterval(() => {
      setLocalRemainingSeconds((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (localTimerRef.current) clearInterval(localTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (graceCountdown !== null && graceCountdown > 0) {
      graceTimerRef.current = setInterval(() => {
        setGraceCountdown((prev) => {
          if (prev === null || prev <= 0) {
            if (!noteModalShown.current && sessionData && currentUser && !showExtendResponseModal && !showPaymentModal) {
              noteModalShown.current = true;
              const callerId = sessionData.session.caller_id;
              const calleeId = sessionData.session.callee_id;
              const currentUserId = currentUser?.id;
              const otherUser = currentUserId === callerId ? calleeId : callerId;
              setOtherUserId(otherUser);
              setShowPostCallNoteModal(true);
            } else if (noteModalShown.current) {
              navigate("/profile");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (graceTimerRef.current) {
      clearInterval(graceTimerRef.current);
    }
    return () => {
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    };
  }, [graceCountdown, navigate, sessionData, currentUser, showExtendResponseModal, showPaymentModal]);

  useEffect(() => {
    if (
      userTier === "free" &&
      localRemainingSeconds !== null &&
      localRemainingSeconds <= 60 &&
      localRemainingSeconds > 55 &&
      !timeLimitNudgeShown.current
    ) {
      setShowTimeLimitNudge(true);
      timeLimitNudgeShown.current = true;
    }
  }, [localRemainingSeconds, userTier]);

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/video/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create room");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setCurrentRoomUrl(data.room_url);
      setSessionId(data.video_session_id);
      setUserTier(data.user_tier);
      
      if (data.is_final_free_meeting) {
        toast.info(
          "This is your last free video call for today! Upgrade to Casual ($9.99/mo) for unlimited daily calls and longer chat sessions.",
          { duration: 8000 }
        );
      } else {
        toast.success("Video room created!");
      }
    },
    onError: (error) => {
      setError(error.message || "Failed to create video room");
      toast.error(error.message || "Failed to create video room");
    },
  });

  useEffect(() => {
    if (!roomUrl && matchId) {
      createRoomMutation.mutate();
    } else if (!roomUrl && !matchId) {
      setError("No match ID or room URL provided");
    } else if (roomUrl) {
      const urlParams = new URLSearchParams(window.location.search);
      const sid = urlParams.get("sessionId");
      if (sid) setSessionId(sid);
    }
  }, [matchId, roomUrl]);

  const handleEndCall = async () => {
    if (sessionId) {
      try {
        await fetch(`/api/video/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: "ended" }),
        });
      } catch (e) {
        console.error("Failed to update session state:", e);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
    toast.success("Call ended");
    navigate("/profile");
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for reporting");
      return;
    }

    toast.success("Report submitted. Thank you for keeping our community safe.");
    setShowReportModal(false);
    setReportReason("");
    handleEndCall();
  };

  const handleSaveNote = async () => {
    if (!otherUserId) {
      navigate("/profile");
      return;
    }

    setSavingNote(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: otherUserId,
          noteContent: postCallNote.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to save note" }));
        throw new Error(error.error || "Failed to save note");
      }

      toast.success("Note saved!");
      setShowPostCallNoteModal(false);
      navigate("/profile");
    } catch (err) {
      console.error("Failed to save note:", err);
      toast.error(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleSkipNote = () => {
    setShowPostCallNoteModal(false);
    navigate("/profile");
  };

  const handleInitiateExtension = async () => {
    if (!sessionId) return;
    setShowExtendInitiateModal(false);

    try {
      const res = await fetch(`/api/video/sessions/${sessionId}/extensions`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to request extension");
        return;
      }

      const data = await res.json();
      toast.success("Extension request sent!");
      setCurrentExtension(data.extension);
      pollSession();
    } catch (err) {
      console.error("Extension request error:", err);
      toast.error("Failed to send extension request");
    }
  };

  const handleExtensionResponse = async (action) => {
    if (!currentExtension) return;

    try {
      const res = await fetch(
        `/api/video/sessions/${sessionId}/extensions/${currentExtension.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || `Failed to ${action} extension`);
        return;
      }

      const data = await res.json();

      if (action === "decline") {
        toast.info("Extension declined");
        setShowExtendResponseModal(false);
        setCurrentExtension(null);
        
        setTimeout(() => pollSession(), 100);
      } else if (action === "accept") {
        toast.success("Extension accepted! Waiting for payment...");
        setShowExtendResponseModal(false);

        if (data.extension.paymentIntentClientSecret) {
          setPaymentClientSecret(data.extension.paymentIntentClientSecret);
          if (currentExtension.isInitiator) {
            setShowPaymentModal(true);
          }
        }
      }

      pollSession();
    } catch (err) {
      console.error("Extension response error:", err);
      toast.error(`Failed to ${action} extension`);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId) => {
    if (!currentExtension || !sessionId) return;

    try {
      const res = await fetch(
        `/api/video/sessions/${sessionId}/extensions/${currentExtension.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to confirm payment");
        return;
      }

      toast.success(`${EXTENSION_MINUTES} minutes added to call!`);
      setShowPaymentModal(false);
      setPaymentClientSecret(null);
      setCurrentExtension(null);
      
      setTimeout(() => pollSession(), 100);
    } catch (err) {
      console.error("Payment confirmation error:", err);
      toast.error("Failed to confirm payment");
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const remaining = localRemainingSeconds ?? 0;
  const isNearEnd = remaining <= 60 && remaining > 0;
  const showExtendButton = remaining <= 120 || graceCountdown !== null;

  if (error) {
    return (
      <Flex minH="100vh" align="center" justify="center" px={4} bg="gray.50">
        <VStack spacing={4} textAlign="center" maxW="md">
          <Heading size="xl" color="gray.800">Video Call Error</Heading>
          <Text color="gray.600">{error}</Text>
          <Button
            onClick={() => navigate("/profile")}
            colorScheme="purple"
            shadow="lg"
            mt={4}
          >
            Back to Profile
          </Button>
        </VStack>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" direction="column" bg="black">
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={10}
        p={4}
        bgGradient="linear(to-b, blackAlpha.900, transparent)"
      >
        <HStack justify="space-between">
          <Heading size="lg" color="white">Video Date</Heading>
          <VStack align="end" spacing={1}>
            <Flex
              align="center"
              gap={2}
              px={4}
              py={2}
              borderRadius="lg"
              backdropFilter="blur(10px)"
              bg={isNearEnd || graceCountdown !== null ? "red.600" : "blackAlpha.600"}
            >
              <Clock size={16} color="white" />
              <Text fontWeight="bold" color="white">
                {graceCountdown !== null ? `Grace: ${formatTime(graceCountdown)}` : formatTime(remaining)}
              </Text>
            </Flex>
            {graceCountdown === null && sessionData?.session?.extendedSecondsTotal > 0 && (
              <Badge px={3} py={1} borderRadius="lg" fontSize="xs" bg="whiteAlpha.200" color="white">
                +{Math.floor(sessionData.session.extendedSecondsTotal / 60)}min extended
              </Badge>
            )}
          </VStack>
        </HStack>
      </Box>

      <Box flex={1} position="relative">
        {currentRoomUrl ? (
          <Box
            as="iframe"
            src={currentRoomUrl}
            allow="camera; microphone; fullscreen; display-capture"
            w="full"
            h="full"
            border="none"
            title="Video Call"
          />
        ) : (
          <Flex align="center" justify="center" h="full">
            <VStack>
              <Spinner size="xl" color="white" thickness="4px" />
              <Text color="white" fontSize="lg">
                {createRoomMutation.isPending ? "Creating video room..." : "Loading video call..."}
              </Text>
            </VStack>
          </Flex>
        )}
      </Box>

      <Box bgGradient="linear(to-t, blackAlpha.900, transparent)" p={6}>
        {showTierUpgradeNudge && !showTimeLimitNudge && (
          <Flex
            mb={4}
            p={4}
            borderRadius="xl"
            align="center"
            justify="space-between"
            gap={4}
            position="relative"
            bg="rgba(0, 191, 166, 0.85)"
          >
            <IconButton
              icon={<X size={18} />}
              onClick={() => setShowTierUpgradeNudge(false)}
              position="absolute"
              top={2}
              right={2}
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              aria-label="Dismiss"
            />
            <Text flex={1} pr={6} color="white" fontWeight="semibold" fontSize="sm">
              💎 Your match is on the {otherUserTierName} plan! Upgrade to enjoy longer video dates together.
            </Text>
            <Button
              onClick={() => navigate("/onboarding/membership")}
              size="sm"
              bg="white"
              color="pink.500"
              _hover={{ opacity: 0.9 }}
            >
              Upgrade Now
            </Button>
          </Flex>
        )}

        {showTimeLimitNudge && (
          <Flex
            mb={4}
            p={4}
            borderRadius="xl"
            align="center"
            justify="space-between"
            gap={4}
            position="relative"
            bg="rgba(91, 59, 175, 0.85)"
          >
            <IconButton
              icon={<X size={18} />}
              onClick={() => setShowTimeLimitNudge(false)}
              position="absolute"
              top={2}
              right={2}
              size="sm"
              variant="ghost"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              aria-label="Dismiss"
            />
            <Text flex={1} pr={6} color="white" fontWeight="semibold" fontSize="sm">
              Only 1 minute left on your Free plan! Upgrade to Casual ($9.99/mo) for 15-minute calls and unlimited meetings.
            </Text>
            <Button
              onClick={() => navigate("/onboarding/membership")}
              size="sm"
              colorScheme="pink"
            >
              Upgrade
            </Button>
          </Flex>
        )}

        {graceCountdown !== null && (
          <Box mb={4} p={4} borderRadius="xl" textAlign="center" bg="rgba(243, 156, 18, 0.9)">
            <Text color="white" fontWeight="bold">Time's up! Extend to continue ({formatTime(graceCountdown)} remaining)</Text>
          </Box>
        )}

        {showExtendButton && !currentExtension && (
          <Flex mb={4} justify="center">
            <Button
              onClick={() => setShowExtendInitiateModal(true)}
              px={8}
              py={6}
              borderRadius="full"
              shadow="2xl"
              leftIcon={<DollarSign size={24} />}
              bg="orange.500"
              color="white"
              _hover={{ shadow: "3xl" }}
            >
              Extend Call (+${EXTENSION_COST} for {EXTENSION_MINUTES} min)
            </Button>
          </Flex>
        )}

        {currentExtension && currentExtension.status === "pending_acceptance" && currentExtension.isInitiator && (
          <Box mb={4} p={4} borderRadius="xl" textAlign="center" bg="rgba(91, 59, 175, 0.9)">
            <Text color="white" fontWeight="semibold">Waiting for other party to accept extension...</Text>
          </Box>
        )}

        <Flex justify="center" mb={4}>
          <Button
            onClick={handleEndCall}
            px={8}
            py={6}
            borderRadius="full"
            shadow="2xl"
            leftIcon={<Phone size={24} />}
            colorScheme="red"
          >
            End Call
          </Button>
        </Flex>

        <Flex gap={4} maxW="2xl" mx="auto">
          <Button
            onClick={() => setShowReportModal(true)}
            flex={1}
            leftIcon={<Flag size={20} />}
            bg="whiteAlpha.200"
            color="white"
            _hover={{ bg: "whiteAlpha.300" }}
            size="lg"
          >
            Report
          </Button>
        </Flex>
      </Box>

      <Modal isOpen={showExtendInitiateModal} onClose={() => setShowExtendInitiateModal(false)} isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent>
          <ModalHeader fontSize="2xl" color="gray.800">Extend Call</ModalHeader>
          <ModalBody>
            <Text mb={4} color="gray.800">
              Request {EXTENSION_MINUTES} more minutes for ${EXTENSION_COST}.00?
            </Text>
            <Text fontSize="sm" opacity={0.7} color="gray.800">
              The other party must accept before payment is processed.
            </Text>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3} w="full">
              <Button onClick={() => setShowExtendInitiateModal(false)} flex={1} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleInitiateExtension} flex={1} colorScheme="purple">
                Request Extension
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showExtendResponseModal && !!currentExtension} onClose={() => {}} isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent>
          <ModalHeader fontSize="2xl" color="gray.800">
            <HStack>
              <Clock size={28} />
              <Text>Extension Request</Text>
            </HStack>
          </ModalHeader>
          <ModalBody>
            <Text mb={4} color="gray.800">
              The other party wants to extend the call for {EXTENSION_MINUTES} more minutes (${EXTENSION_COST}.00).
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="orange.500" mb={4}>
              They will be charged after you accept.
            </Text>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3} w="full">
              <Button
                onClick={() => handleExtensionResponse("decline")}
                flex={1}
                colorScheme="red"
                leftIcon={<XCircle size={20} />}
              >
                Decline
              </Button>
              <Button
                onClick={() => handleExtensionResponse("accept")}
                flex={1}
                colorScheme="green"
                leftIcon={<CheckCircle size={20} />}
              >
                Accept
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {isMounted && showPaymentModal && paymentClientSecret && (
        <Modal isOpen onClose={() => {}} isCentered>
          <ModalOverlay bg="blackAlpha.700" />
          <ModalContent>
            <ModalHeader fontSize="2xl" color="gray.800">Complete Payment</ModalHeader>
            <ModalBody>
              <Text mb={4} color="gray.800">
                Pay ${EXTENSION_COST}.00 to add {EXTENSION_MINUTES} minutes to your call.
              </Text>
              <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
                <PaymentForm
                  clientSecret={paymentClientSecret}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => {
                    setShowPaymentModal(false);
                    setPaymentClientSecret(null);
                    setTimeout(() => pollSession(), 100);
                  }}
                />
              </Elements>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent>
          <ModalHeader>
            <HStack spacing={3}>
              <AlertTriangle size={28} color="red" />
              <Text fontSize="2xl" color="gray.800">Report Issue</Text>
            </HStack>
          </ModalHeader>
          <ModalBody>
            <Text opacity={0.7} mb={4} color="gray.800">
              Help us keep the community safe. Please describe the issue you experienced.
            </Text>
            <Textarea
              placeholder="Describe the issue..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              resize="none"
              rows={4}
              borderColor="gray.300"
              focusBorderColor="purple.500"
            />
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3} w="full">
              <Button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason("");
                }}
                flex={1}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                isDisabled={!reportReason.trim()}
                flex={1}
                colorScheme="red"
              >
                Submit Report
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showPostCallNoteModal} onClose={() => {}} isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent>
          <ModalHeader fontSize="2xl" color="gray.800">How was your call?</ModalHeader>
          <ModalBody>
            <Text fontSize="sm" opacity={0.7} mb={4} color="gray.800">
              Leave a private note about your conversation. Only you can see this.
            </Text>
            <Textarea
              placeholder="Add your thoughts... (e.g., 'Great conversation about travel', 'Shared interest in photography')"
              value={postCallNote}
              onChange={(e) => setPostCallNote(e.target.value)}
              resize="none"
              rows={4}
              maxLength={500}
              borderColor="gray.300"
              focusBorderColor="purple.500"
            />
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3} w="full">
              <Button
                onClick={handleSkipNote}
                isDisabled={savingNote}
                flex={1}
                variant="outline"
              >
                Skip
              </Button>
              <Button
                onClick={handleSaveNote}
                isDisabled={savingNote}
                isLoading={savingNote}
                loadingText="Saving..."
                flex={1}
                colorScheme="purple"
              >
                Save Note
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
