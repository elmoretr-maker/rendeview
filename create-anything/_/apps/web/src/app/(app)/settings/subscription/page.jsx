import React, { useCallback, useEffect, useState, useMemo } from "react";
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
  Divider,
  Heading,
  HStack,
  Icon,
  List,
  ListIcon,
  ListItem,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import { buildDynamicTiers, buildDynamicExtensions, MESSAGE_CREDIT_PRICING } from "@/utils/membershipTiers";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState(null);
  const [error, setError] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  const [scheduledTier, setScheduledTier] = useState(null);
  const [tierChangeAt, setTierChangeAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [profileRes, pricingRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/admin/settings"),
        ]);
        
        if (!profileRes.ok) throw new Error("Failed to load profile");
        const profileData = await profileRes.json();
        
        if (mounted) {
          setCurrentTier(profileData?.user?.membership_tier || "free");
          setScheduledTier(profileData?.user?.scheduled_tier || null);
          setTierChangeAt(profileData?.user?.tier_change_at || null);
        }

        if (pricingRes.ok) {
          const pricingData = await pricingRes.json();
          if (mounted) {
            setPricing(pricingData?.settings?.pricing || null);
          }
        }

        if (mounted) setLoadingPricing(false);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setError("Failed to load subscription info");
          setLoadingPricing(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tiers = useMemo(() => buildDynamicTiers(pricing), [pricing]);
  const extensions = useMemo(() => buildDynamicExtensions(pricing), [pricing]);

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
        
        const tierTitle = tiers.find(t => t.key === key)?.title || key;
        const confirmed = window.confirm(
          `Are you sure you want to downgrade to the ${tierTitle} plan? The change will take effect at the end of your current billing cycle. You'll keep your current benefits until then.`
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
    [currentTier, tiers],
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
                      {tiers.find(t => t.key === currentTier)?.title || "Free"}
                    </Heading>
                  </Box>
                  <Badge colorScheme="teal" fontSize="md" px={4} py={2} borderRadius="full">
                    <HStack spacing={2}>
                      <Icon as={Check} />
                      <Text>Active</Text>
                    </HStack>
                  </Badge>
                </HStack>
                
                {tiers.find(t => t.key === currentTier) && (
                  <List spacing={2} fontSize="sm">
                    <ListItem>
                      <ListIcon as={Check} color="teal.500" />
                      {tiers.find(t => t.key === currentTier).photos} Profile Photos
                    </ListItem>
                    <ListItem>
                      <ListIcon as={Check} color="teal.500" />
                      {tiers.find(t => t.key === currentTier).videos} Video{tiers.find(t => t.key === currentTier).videos !== 1 ? 's' : ''} ({tiers.find(t => t.key === currentTier).videoDuration}s max each)
                    </ListItem>
                    <ListItem>
                      <ListIcon as={Check} color="teal.500" />
                      {tiers.find(t => t.key === currentTier).chatMinutes} Minutes Video Chat
                    </ListItem>
                    {tiers.find(t => t.key === currentTier).maxMeetings !== undefined && 
                     tiers.find(t => t.key === currentTier).maxMeetings !== Infinity && (
                      <ListItem>
                        <ListIcon as={Check} color="teal.500" />
                        {tiers.find(t => t.key === currentTier).maxMeetings} Meeting Limit
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
                      Current: {tiers.find(t => t.key === currentTier)?.title}
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      Scheduled: {tiers.find(t => t.key === scheduledTier)?.title}
                    </Text>
                  </Box>
                  <Text fontSize="sm" mb={3}>
                    You will retain your current {tiers.find(t => t.key === currentTier)?.title} benefits until {new Date(tierChangeAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
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
            {loadingPricing ? (
              <Box textAlign="center" py={8}>
                <Spinner size="xl" color="purple.500" thickness="4px" />
                <Text mt={4} color="gray.600">Loading pricing...</Text>
              </Box>
            ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {tiers.map((t) => {
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
                        <ListItem>• {t.videos} Profile Video{t.videos !== 1 ? 's' : ''} ({t.videoDuration}s max each)</ListItem>
                        <ListItem>• {t.chatMinutes} Min Video Calls</ListItem>
                        {t.maxMeetings !== undefined && t.maxMeetings !== Infinity ? (
                          <ListItem>• {t.maxMeetings} Video Meetings/Day</ListItem>
                        ) : (
                          <ListItem>• Unlimited Video Meetings</ListItem>
                        )}
                        <ListItem>• {t.dailyMessages || 15} Messages/Day</ListItem>
                        {t.perMatchDailyMessages && (
                          <ListItem>
                            • {t.perMatchDailyMessages}/{t.perMatchDailyMessagesAfterVideo || t.perMatchDailyMessages} Messages/Match/Day{t.perMatchDailyMessagesAfterVideo ? ' (after video)' : ''}
                          </ListItem>
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
            )}
          </Box>

          {/* Additional Services & Fees */}
          {!loadingPricing && (
          <Card>
            <CardBody>
              <Heading size="md" mb={4}>Additional Services & Fees</Heading>
              
              {/* Call Extensions */}
              <Box mb={6}>
                <HStack justify="space-between" mb={2}>
                  <Heading size="sm" color="purple.600">Video Call Extensions</Heading>
                  <Badge colorScheme="green" fontSize="md" px={3} py={1}>{extensions.formattedPrice}</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Running out of time during an important conversation? Extend any video call by {extensions.durationMinutes} minutes for {extensions.formattedPrice}. Purchase extensions directly during a call when your timer shows less than 1 minute remaining.
                </Text>
                <List spacing={1} fontSize="xs" color="gray.500">
                  <ListItem>• Extensions are purchased during active calls</ListItem>
                  <ListItem>• Timer shows "Extend Call" button at 1 minute remaining</ListItem>
                  <ListItem>• Multiple extensions allowed per call</ListItem>
                  <ListItem>• Available on all tiers</ListItem>
                </List>
              </Box>

              <Divider mb={6} />

              {/* Message Credits */}
              <Box>
                <Heading size="sm" color="purple.600" mb={2}>Message Credit Packs</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Need more messages beyond your daily limit? Purchase message credits to keep the conversation going. Credits never expire and can be used anytime.
                </Text>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={4}>
                  <Card borderWidth={1} borderColor="gray.200">
                    <CardBody py={3}>
                      <Text fontSize="xs" color="gray.500" mb={1}>Small Pack</Text>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">{MESSAGE_CREDIT_PRICING.PACK_SMALL.credits} Messages</Text>
                        <Text color="purple.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.PACK_SMALL.price}</Text>
                      </HStack>
                    </CardBody>
                  </Card>
                  <Card borderWidth={1} borderColor="gray.200">
                    <CardBody py={3}>
                      <Text fontSize="xs" color="gray.500" mb={1}>Medium Pack</Text>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">{MESSAGE_CREDIT_PRICING.PACK_MEDIUM.credits} Messages</Text>
                        <Text color="purple.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.PACK_MEDIUM.price}</Text>
                      </HStack>
                    </CardBody>
                  </Card>
                  <Card borderWidth={1} borderColor="purple.200" bg="purple.50">
                    <CardBody py={3}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" color="gray.600">Large Pack</Text>
                        <Badge colorScheme="purple" fontSize="xs">Best Value</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">{MESSAGE_CREDIT_PRICING.PACK_LARGE.credits} Messages</Text>
                        <Text color="purple.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.PACK_LARGE.price}</Text>
                      </HStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
                <List spacing={1} fontSize="xs" color="gray.500">
                  <ListItem>• Credits automatically used when daily limit reached</ListItem>
                  <ListItem>• Purchase from chat screen when out of messages</ListItem>
                  <ListItem>• Credits never expire and roll over indefinitely</ListItem>
                  <ListItem>• Use with any tier - Free, Casual, Dating, or Business</ListItem>
                </List>
              </Box>
            </CardBody>
          </Card>
          )}

          <Card>
            <CardBody>
              <Heading size="md" mb={4}>How Messaging Works</Heading>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontWeight="semibold" mb={2} color="purple.600">Message Deduction Priority:</Text>
                  <List spacing={2} fontSize="sm">
                    <ListItem>
                      <Text fontWeight="medium">1. First Encounter Messages (10 free)</Text>
                      <Text fontSize="xs" color="gray.600">Get to know each new match with 10 complimentary messages</Text>
                    </ListItem>
                    <ListItem>
                      <Text fontWeight="medium">2. Daily Tier Limit</Text>
                      <Text fontSize="xs" color="gray.600">Use your tier's daily message allowance (15-500 messages)</Text>
                    </ListItem>
                    <ListItem>
                      <Text fontWeight="medium">3. Message Credits</Text>
                      <Text fontSize="xs" color="gray.600">Purchased credits used after daily limit exhausted</Text>
                    </ListItem>
                    <ListItem>
                      <Text fontWeight="medium">4. Per-Match Limit (Business Tier Only)</Text>
                      <Text fontSize="xs" color="gray.600">50 messages/match/day (increases to 75 after video call)</Text>
                    </ListItem>
                  </List>
                </Box>
                <Box bg="purple.50" p={4} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>Example Scenario:</Text>
                  <Text fontSize="xs" color="gray.700">
                    Free tier user matches with someone → Gets 10 first encounter messages → Uses those up → 
                    Has 15 daily messages → Uses all 15 → Can purchase credit pack → Continues messaging using credits → 
                    Tomorrow resets to 15 new daily messages
                  </Text>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Upgrade Benefits */}
          <Card bg="gradient-to-r" bgGradient="linear(to-r, purple.500, pink.500)">
            <CardBody>
              <VStack align="start" spacing={3}>
                <Heading size="md" color="white">Why Upgrade?</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>📸 More Photos & Videos</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">Showcase your personality with up to 20 photos</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>⏱️ Longer Video Calls</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">Chat for up to 45 minutes per call</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>🎯 Unlimited Meetings</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">No daily limits on video meetings</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>💬 More Messages</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">Send up to 500 messages daily</Text>
                  </Box>
                </SimpleGrid>
              </VStack>
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
