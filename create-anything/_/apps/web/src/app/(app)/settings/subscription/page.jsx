import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Crown, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Heading,
  HStack,
  Icon,
  List,
  ListIcon,
  ListItem,
  SimpleGrid,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { TIER_LIMITS, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";

const TIERS = [
  {
    key: MEMBERSHIP_TIERS.FREE,
    title: "Free",
    price: TIER_LIMITS.free.price,
    photos: TIER_LIMITS.free.photos,
    videos: TIER_LIMITS.free.videos,
    videoDuration: TIER_LIMITS.free.videoMaxDuration,
    chatMinutes: TIER_LIMITS.free.chatMinutes,
    maxMeetings: TIER_LIMITS.free.maxMeetings,
    desc: "Get started with basic features",
  },
  {
    key: MEMBERSHIP_TIERS.CASUAL,
    title: "Casual",
    price: TIER_LIMITS.casual.price,
    photos: TIER_LIMITS.casual.photos,
    videos: TIER_LIMITS.casual.videos,
    videoDuration: TIER_LIMITS.casual.videoMaxDuration,
    chatMinutes: TIER_LIMITS.casual.chatMinutes,
    desc: "Expand your profile & chat time",
  },
  {
    key: MEMBERSHIP_TIERS.DATING,
    title: "Dating",
    price: TIER_LIMITS.dating.price,
    photos: TIER_LIMITS.dating.photos,
    videos: TIER_LIMITS.dating.videos,
    videoDuration: TIER_LIMITS.dating.videoMaxDuration,
    chatMinutes: TIER_LIMITS.dating.chatMinutes,
    desc: "Priority matching & longer chats",
  },
  {
    key: MEMBERSHIP_TIERS.BUSINESS,
    title: "Business",
    price: TIER_LIMITS.business.price,
    photos: TIER_LIMITS.business.photos,
    videos: TIER_LIMITS.business.videos,
    videoDuration: TIER_LIMITS.business.videoMaxDuration,
    chatMinutes: TIER_LIMITS.business.chatMinutes,
    desc: "Maximum exposure & unlimited features",
  },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState(null);
  const [error, setError] = useState(null);

  const [scheduledTier, setScheduledTier] = useState(null);
  const [tierChangeAt, setTierChangeAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        if (mounted) {
          setCurrentTier(data?.user?.membership_tier || "free");
          setScheduledTier(data?.user?.scheduled_tier || null);
          setTierChangeAt(data?.user?.tier_change_at || null);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setError("Failed to load subscription info");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const upgradeTier = useCallback(
    async (key) => {
      try {
        setLoading(true);
        setError(null);
        
        if (key === "free") {
          toast.info("You're already on the Free plan");
          return;
        }
        
        const redirectURL = `${window.location.origin}/settings/subscription`;
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "subscription",
            tier: key,
            redirectURL,
          }),
        });
        
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t?.error || "Could not start checkout");
        }
        
        const { url } = await res.json();
        if (url) {
          navigate("/stripe", { state: { checkoutUrl: url, returnTo: "/settings/subscription" } });
        } else {
          throw new Error("Missing checkout url");
        }
      } catch (e) {
        console.error(e);
        setError(e.message);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const cancelScheduledDowngrade = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const confirmed = window.confirm(
        "Cancel your scheduled downgrade? You will continue on your current plan and will be charged at renewal."
      );

      if (!confirmed) {
        setLoading(false);
        return;
      }

      const res = await fetch("/api/payments/cancel-downgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Could not cancel downgrade");
      }

      const data = await res.json();
      toast.success(data.message || "Scheduled downgrade cancelled successfully");
      setScheduledTier(null);
      setTierChangeAt(null);
      window.location.reload();
    } catch (e) {
      console.error(e);
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const downgradeTier = useCallback(
    async (key) => {
      if (key === currentTier) {
        toast.info("You're already on this plan");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const confirmed = window.confirm(
          `Are you sure you want to downgrade to the ${TIERS.find(t => t.key === key)?.title} plan? The change will take effect at the end of your current billing cycle. You'll keep your current benefits until then.`
        );
        
        if (!confirmed) {
          setLoading(false);
          return;
        }
        
        const res = await fetch("/api/payments/downgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: key }),
        });
        
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t?.error || "Could not downgrade");
        }
        
        const data = await res.json();
        toast.success(data.message || "Downgrade scheduled successfully");
        setScheduledTier(data.scheduledTier);
        setTierChangeAt(data.tierChangeAt);
        window.location.reload();
      } catch (e) {
        console.error(e);
        setError(e.message);
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [currentTier],
  );

  const getTierRank = (tierKey) => {
    const ranks = { free: 0, casual: 1, dating: 2, business: 3 };
    return ranks[tierKey] || 0;
  };

  const currentTierRank = getTierRank(currentTier);

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="4xl" py={8}>
        {/* Header */}
        <VStack spacing={8} align="stretch">
          <Box>
            <HStack spacing={3} mb={4}>
              <Icon as={Crown} boxSize={8} color="purple.500" />
              <Heading size="xl">Subscription Management</Heading>
            </HStack>
            <Text fontSize="lg" color="gray.600">
              Manage your membership plan and billing
            </Text>
          </Box>

          {/* Current Plan */}
          {currentTier && (
            <Card borderWidth={2} borderColor="purple.500">
              <CardBody>
                <HStack justify="space-between" mb={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="medium" color="gray.600">
                      Current Plan
                    </Text>
                    <Heading size="lg" color="purple.500">
                      {TIERS.find(t => t.key === currentTier)?.title || "Free"}
                    </Heading>
                  </Box>
                  <Badge colorScheme="teal" fontSize="md" px={4} py={2} borderRadius="full">
                    <HStack spacing={2}>
                      <Icon as={Check} />
                      <Text>Active</Text>
                    </HStack>
                  </Badge>
                </HStack>
                
                {TIERS.find(t => t.key === currentTier) && (
                  <List spacing={2} fontSize="sm">
                    <ListItem>
                      <ListIcon as={Check} color="teal.500" />
                      {TIERS.find(t => t.key === currentTier).photos} Profile Photos
                    </ListItem>
                    <ListItem>
                      <ListIcon as={Check} color="teal.500" />
                      {TIERS.find(t => t.key === currentTier).videos} Video{TIERS.find(t => t.key === currentTier).videos !== 1 ? 's' : ''} ({TIERS.find(t => t.key === currentTier).videoDuration}s max each)
                    </ListItem>
                    <ListItem>
                      <ListIcon as={Check} color="teal.500" />
                      {TIERS.find(t => t.key === currentTier).chatMinutes} Minutes Video Chat
                    </ListItem>
                    {TIERS.find(t => t.key === currentTier).maxMeetings !== undefined && 
                     TIERS.find(t => t.key === currentTier).maxMeetings !== Infinity && (
                      <ListItem>
                        <ListIcon as={Check} color="teal.500" />
                        {TIERS.find(t => t.key === currentTier).maxMeetings} Meeting Limit
                      </ListItem>
                    )}
                  </List>
                )}
              </CardBody>
            </Card>
          )}

          {/* Scheduled Downgrade Alert */}
          {scheduledTier && tierChangeAt && (
            <Alert status="warning" variant="subtle" borderRadius="lg" borderWidth={2} borderColor="orange.400">
              <AlertIcon />
              <Box flex="1">
                <AlertTitle fontSize="lg">Scheduled Downgrade</AlertTitle>
                <AlertDescription display="block">
                  <Text mb={2}>
                    Your plan will change on {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Box bg="orange.100" p={4} borderRadius="md" mb={3}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Current: {TIERS.find(t => t.key === currentTier)?.title}
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      Scheduled: {TIERS.find(t => t.key === scheduledTier)?.title}
                    </Text>
                  </Box>
                  <Text fontSize="sm" mb={3}>
                    You will retain your current {TIERS.find(t => t.key === currentTier)?.title} benefits until {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
                  </Text>
                  <Button
                    onClick={cancelScheduledDowngrade}
                    isLoading={loading}
                    loadingText="Cancelling..."
                    colorScheme="orange"
                    variant="outline"
                    width="full"
                  >
                    Cancel Scheduled Downgrade
                  </Button>
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Billing Management */}
          {currentTier && currentTier !== "free" && (
            <Card>
              <CardBody>
                <Heading size="md" mb={2}>Billing Management</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  View billing history, update payment method, or cancel subscription
                </Text>
                <Button
                  onClick={() => navigate("/account/billing")}
                  colorScheme="purple"
                  rightIcon={<ArrowRight size={20} />}
                >
                  Manage Billing
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Available Plans */}
          <Box>
            <Heading size="lg" mb={4}>
              {currentTier === "free" ? "Upgrade Your Plan" : "Available Plans"}
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {TIERS.map((t) => {
                const isCurrent = t.key === currentTier;
                const isDowngrade = getTierRank(t.key) < currentTierRank;
                const isUpgrade = getTierRank(t.key) > currentTierRank;

                return (
                  <Card
                    key={t.key}
                    borderWidth={2}
                    borderColor={isCurrent ? "purple.500" : "gray.200"}
                    bg={isCurrent ? "purple.50" : "white"}
                  >
                    <CardBody>
                      <HStack justify="space-between" mb={2}>
                        <Heading size="md">{t.title}</Heading>
                        <Text fontWeight="bold" color="purple.500">
                          {t.price}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600" mb={4}>
                        {t.desc}
                      </Text>
                      
                      <List spacing={1} fontSize="sm" mb={4}>
                        <ListItem>• {t.photos} Profile Photos</ListItem>
                        <ListItem>• {t.videos} Video{t.videos !== 1 ? 's' : ''} ({t.videoDuration}s max each)</ListItem>
                        <ListItem>• {t.chatMinutes} Minutes Video Chat</ListItem>
                        {t.maxMeetings !== undefined && t.maxMeetings !== Infinity && (
                          <ListItem>• {t.maxMeetings} Meeting Limit</ListItem>
                        )}
                      </List>
                      
                      {isCurrent ? (
                        <Box
                          w="full"
                          py={2}
                          textAlign="center"
                          fontWeight="semibold"
                          borderRadius="lg"
                          bg="gray.100"
                        >
                          Current Plan
                        </Box>
                      ) : (
                        <Button
                          onClick={() => isDowngrade ? downgradeTier(t.key) : upgradeTier(t.key)}
                          isLoading={loading}
                          loadingText="Please wait..."
                          colorScheme="purple"
                          width="full"
                        >
                          {isDowngrade
                            ? `Downgrade to ${t.title}`
                            : isUpgrade
                              ? `Upgrade to ${t.title}`
                              : `Switch to ${t.title}`}
                        </Button>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Box>

          {/* Call Extensions */}
          <Card>
            <CardBody>
              <Heading size="md" mb={2}>Call Extensions</Heading>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Extend any video call beyond your tier's limit
              </Text>
              <Text fontWeight="semibold" color="teal.500">
                • $8.00 for 10 minutes
              </Text>
            </CardBody>
          </Card>

          {error && (
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
