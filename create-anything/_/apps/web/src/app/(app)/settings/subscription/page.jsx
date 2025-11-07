import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Crown, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
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
import { 
  buildDynamicTiers, 
  buildDynamicExtensions, 
  MESSAGE_CREDIT_PRICING,
  VIDEO_MESSAGE_PRICING,
  SMART_PROMPT_CONFIG,
  getTierLimits 
} from "@/utils/membershipTiers";

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
      <AppHeader />
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

          {/* Why Upgrade - Featured Section */}
          <Card bg="gradient-to-r" bgGradient="linear(to-r, purple.500, pink.500)">
            <CardBody>
              <VStack align="start" spacing={3}>
                <Heading size="md" color="white">Why Upgrade?</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>📸 More Photos & Videos</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">Showcase your personality with up to 20 photos and longer videos</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>⏱️ Longer Video Calls</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">Chat for up to 45 minutes per call</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>🎯 Unlimited Video Meetings</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">No daily limits - meet as many people as you want</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" color="white" fontSize="sm" mb={1}>💬 More Messages</Text>
                    <Text fontSize="xs" color="whiteAlpha.900">Send up to 500 messages daily</Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>

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
                        {t.key === 'business' && (
                          <>
                            <ListItem color="purple.600" fontWeight="semibold" mt={2}>Premium Features:</ListItem>
                            <ListItem fontSize="xs">• Priority Placement in Discovery</ListItem>
                            <ListItem fontSize="xs">• Video Verified Badge</ListItem>
                            <ListItem fontSize="xs">• Advanced Filters</ListItem>
                            <ListItem fontSize="xs">• Read Receipts</ListItem>
                            <ListItem fontSize="xs">• Weekly Profile Boost</ListItem>
                            <ListItem fontSize="xs">• 10 Daily Curated Picks</ListItem>
                            <ListItem fontSize="xs">• Incognito Mode</ListItem>
                          </>
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

              {/* Video Messages */}
              <Box mb={6}>
                <HStack justify="space-between" mb={2}>
                  <Heading size="sm" color="purple.600">Video Messages in Chat</Heading>
                  <Badge colorScheme="purple" fontSize="md" px={3} py={1}>NEW!</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Send short video clips directly in conversations! Video messages unlock after completing your first video call with someone, creating a more personal messaging experience.
                </Text>

                <Box bg="purple.50" p={4} borderRadius="md" mb={3}>
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color="purple.700">
                    Free Daily Video Messages (Flat Total Across All Chats):
                  </Text>
                  <Text fontSize="xs" color="purple.600" mb={3}>
                    You decide how to distribute your daily allowance across all your conversations!
                  </Text>
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                    <Box>
                      <Text fontSize="xs" color="gray.600">Free</Text>
                      <Text fontWeight="bold">{VIDEO_MESSAGE_PRICING.FREE_VIDEOS_PER_DAY.free} total/day</Text>
                      <Text fontSize="xs" color="gray.500">(10s clips)</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.600">Casual</Text>
                      <Text fontWeight="bold">{VIDEO_MESSAGE_PRICING.FREE_VIDEOS_PER_DAY.casual} total/day</Text>
                      <Text fontSize="xs" color="gray.500">(15s clips)</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.600">Dating</Text>
                      <Text fontWeight="bold">{VIDEO_MESSAGE_PRICING.FREE_VIDEOS_PER_DAY.dating} total/day</Text>
                      <Text fontSize="xs" color="gray.500">(30s clips)</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.600">Business</Text>
                      <Text fontWeight="bold">{VIDEO_MESSAGE_PRICING.FREE_VIDEOS_PER_DAY.business} total/day</Text>
                      <Text fontSize="xs" color="gray.500">(60s clips)</Text>
                    </Box>
                  </SimpleGrid>
                </Box>

                <Text fontSize="sm" fontWeight="semibold" mb={2}>Beyond Daily Limit:</Text>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                  <Card borderWidth={1} borderColor="gray.200">
                    <CardBody py={3}>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">{VIDEO_MESSAGE_PRICING.BUNDLES.SMALL.videos} Videos</Text>
                        <Text color="purple.600" fontWeight="semibold">{VIDEO_MESSAGE_PRICING.BUNDLES.SMALL.price}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">$0.30/video</Text>
                    </CardBody>
                  </Card>
                  <Card borderWidth={1} borderColor="purple.200" bg="purple.50">
                    <CardBody py={3}>
                      <HStack justify="space-between" mb={1}>
                        <Badge colorScheme="purple" fontSize="xs">{VIDEO_MESSAGE_PRICING.BUNDLES.MEDIUM.label}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">{VIDEO_MESSAGE_PRICING.BUNDLES.MEDIUM.videos} Videos</Text>
                        <Text color="purple.600" fontWeight="semibold">{VIDEO_MESSAGE_PRICING.BUNDLES.MEDIUM.price}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">$0.23/video</Text>
                    </CardBody>
                  </Card>
                  <Card borderWidth={1} borderColor="purple.300" bg="purple.100">
                    <CardBody py={3}>
                      <HStack justify="space-between" mb={1}>
                        <Badge colorScheme="purple" fontSize="xs">{VIDEO_MESSAGE_PRICING.BUNDLES.LARGE.label}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">{VIDEO_MESSAGE_PRICING.BUNDLES.LARGE.videos} Videos</Text>
                        <Text color="purple.600" fontWeight="semibold">{VIDEO_MESSAGE_PRICING.BUNDLES.LARGE.price}</Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">$0.15/video</Text>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                <List spacing={1} fontSize="xs" color="gray.500" mt={3}>
                  <ListItem>• Record directly in the chat interface</ListItem>
                  <ListItem>• Duration based on your tier (10s-60s)</ListItem>
                  <ListItem>• Credits never expire</ListItem>
                  <ListItem>• Available after completing first video call with person</ListItem>
                </List>
              </Box>

              <Divider mb={6} />

              {/* Message Credits */}
              <Box>
                <Heading size="sm" color="purple.600" mb={2}>Message Credit Packs</Heading>
                <Text fontSize="sm" color="gray.600" mb={4}>
                  Need more messages beyond your daily limit? Purchase message credits to keep the conversation going. Credits never expire and can be used anytime.
                </Text>

                {/* Rolling Reward System Badge */}
                <Box bg="gradient-to-r" bgGradient="linear(to-r, green.500, teal.500)" p={4} borderRadius="lg" mb={4}>
                  <HStack spacing={2} mb={2}>
                    <Badge colorScheme="yellow" fontSize="sm" px={3} py={1}>🎁 ROLLING MONTHLY REWARDS</Badge>
                  </HStack>
                  <Text color="white" fontWeight="bold" fontSize="md" mb={1}>
                    Complete 3 Video Dates Monthly = 50% Bonus Messages!
                  </Text>
                  <Text color="whiteAlpha.900" fontSize="sm" mb={3}>
                    Unlock: Complete 3 video calls with 3 different people to get reward pricing.
                    Maintain: Complete 3 NEW video calls each calendar month to keep your discount active.
                  </Text>
                  <Box bg="whiteAlpha.200" p={3} borderRadius="md">
                    <Text color="white" fontSize="xs" fontWeight="semibold" mb={1}>How It Works:</Text>
                    <List spacing={1} fontSize="xs" color="whiteAlpha.900">
                      <ListItem>✓ Month 1: Complete 3 video calls → Unlock 50% bonus credits</ListItem>
                      <ListItem>✓ Month 2+: Complete 3 NEW calls/month → Keep your discount</ListItem>
                      <ListItem>✓ Miss a month? Discount expires, complete 3 calls to reactivate</ListItem>
                      <ListItem>✓ Get 7-day warning before month ends if you need more calls</ListItem>
                    </List>
                  </Box>
                </Box>

                {/* Standard Pricing */}
                <Box mb={4}>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.600" mb={2}>
                    Standard Pricing (Default):
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                    <Card borderWidth={1} borderColor="gray.200">
                      <CardBody py={3}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold">{MESSAGE_CREDIT_PRICING.STANDARD.PACK_SMALL.credits} Messages</Text>
                          <Text color="purple.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.STANDARD.PACK_SMALL.price}</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">~${MESSAGE_CREDIT_PRICING.STANDARD.PACK_SMALL.perMessageCost.toFixed(2)}/message</Text>
                      </CardBody>
                    </Card>
                    <Card borderWidth={1} borderColor="gray.200">
                      <CardBody py={3}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold">{MESSAGE_CREDIT_PRICING.STANDARD.PACK_MEDIUM.credits} Messages</Text>
                          <Text color="purple.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.STANDARD.PACK_MEDIUM.price}</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">~${MESSAGE_CREDIT_PRICING.STANDARD.PACK_MEDIUM.perMessageCost.toFixed(2)}/message</Text>
                      </CardBody>
                    </Card>
                    <Card borderWidth={1} borderColor="purple.200">
                      <CardBody py={3}>
                        <HStack justify="space-between" mb={1}>
                          <Badge colorScheme="purple" fontSize="xs">{MESSAGE_CREDIT_PRICING.STANDARD.PACK_LARGE.label}</Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontWeight="bold">{MESSAGE_CREDIT_PRICING.STANDARD.PACK_LARGE.credits} Messages</Text>
                          <Text color="purple.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.STANDARD.PACK_LARGE.price}</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">~${MESSAGE_CREDIT_PRICING.STANDARD.PACK_LARGE.perMessageCost.toFixed(2)}/message</Text>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </Box>

                {/* Reward Pricing */}
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="green.600" mb={2}>
                    Reward Pricing (Active Video Daters - 3 Calls/Month): 
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={4}>
                    <Card borderWidth={2} borderColor="green.300" bg="green.50">
                      <CardBody py={3}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" color="green.700">{MESSAGE_CREDIT_PRICING.REWARD.PACK_SMALL.credits} Messages</Text>
                          <Text color="green.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.REWARD.PACK_SMALL.price}</Text>
                        </HStack>
                        <Text fontSize="xs" color="green.600">~${MESSAGE_CREDIT_PRICING.REWARD.PACK_SMALL.perMessageCost.toFixed(2)}/msg ({MESSAGE_CREDIT_PRICING.REWARD.PACK_SMALL.bonusPercentage}% bonus!)</Text>
                      </CardBody>
                    </Card>
                    <Card borderWidth={2} borderColor="green.300" bg="green.50">
                      <CardBody py={3}>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" color="green.700">{MESSAGE_CREDIT_PRICING.REWARD.PACK_MEDIUM.credits} Messages</Text>
                          <Text color="green.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.REWARD.PACK_MEDIUM.price}</Text>
                        </HStack>
                        <Text fontSize="xs" color="green.600">~${MESSAGE_CREDIT_PRICING.REWARD.PACK_MEDIUM.perMessageCost.toFixed(2)}/msg ({MESSAGE_CREDIT_PRICING.REWARD.PACK_MEDIUM.bonusPercentage}% bonus!)</Text>
                      </CardBody>
                    </Card>
                    <Card borderWidth={2} borderColor="green.400" bg="green.100">
                      <CardBody py={3}>
                        <HStack justify="space-between" mb={1}>
                          <Badge colorScheme="green" fontSize="xs">{MESSAGE_CREDIT_PRICING.REWARD.PACK_LARGE.label}</Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontWeight="bold" color="green.700">{MESSAGE_CREDIT_PRICING.REWARD.PACK_LARGE.credits} Messages</Text>
                          <Text color="green.600" fontWeight="semibold">{MESSAGE_CREDIT_PRICING.REWARD.PACK_LARGE.price}</Text>
                        </HStack>
                        <Text fontSize="xs" color="green.600">~${MESSAGE_CREDIT_PRICING.REWARD.PACK_LARGE.perMessageCost.toFixed(2)}/msg ({MESSAGE_CREDIT_PRICING.REWARD.PACK_LARGE.bonusPercentage}% bonus!)</Text>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </Box>

                <List spacing={1} fontSize="xs" color="gray.500">
                  <ListItem>• Credits automatically used when daily limit reached</ListItem>
                  <ListItem>• Purchase from chat screen when out of messages</ListItem>
                  <ListItem>• Credits never expire and roll over indefinitely</ListItem>
                  <ListItem>• Reward pricing requires 3 video calls each calendar month to maintain</ListItem>
                  <ListItem>• Use with any tier - Free, Casual, Dating, or Business</ListItem>
                </List>
              </Box>
            </CardBody>
          </Card>
          )}

          <Card>
            <CardBody>
              <Heading size="md" mb={4}>📱 Video-First Messaging System</Heading>
              <Text fontSize="sm" color="gray.600" mb={4}>
                We're a video dating app. Text messaging is designed to facilitate video dates, not replace them.
              </Text>
              
              <VStack align="stretch" spacing={4}>
                <Box bg="purple.50" p={4} borderRadius="md" borderWidth={2} borderColor="purple.200">
                  <Text fontWeight="bold" mb={3} color="purple.700">Progressive Video Unlock</Text>
                  
                  <VStack align="stretch" spacing={3}>
                    <Box>
                      <HStack mb={1}>
                        <Badge colorScheme="blue">Phase 1</Badge>
                        <Text fontSize="sm" fontWeight="semibold">Before First Video Call</Text>
                      </HStack>
                      <List spacing={1} fontSize="sm" ml={4}>
                        <ListItem>• 10 messages per person, per day</ListItem>
                        <ListItem>• Use to schedule video dates</ListItem>
                        <ListItem>• At message 8: Gentle reminder to schedule video</ListItem>
                        <ListItem>• At message 10: Encouraged to video chat or buy credits</ListItem>
                      </List>
                    </Box>

                    <Box>
                      <HStack mb={1}>
                        <Badge colorScheme="green">Phase 2</Badge>
                        <Text fontSize="sm" fontWeight="semibold">After Completing Video Call</Text>
                      </HStack>
                      <List spacing={1} fontSize="sm" ml={4}>
                        <ListItem>• Unlock bonus daily messages (tier-based)</ListItem>
                        <ListItem>• Free tier: No bonus</ListItem>
                        <ListItem>• Casual: +25 daily messages</ListItem>
                        <ListItem>• Dating: +50 daily messages</ListItem>
                        <ListItem>• Business: +100 daily messages</ListItem>
                        <ListItem>• Send short video messages (3-50 free/day)</ListItem>
                      </List>
                    </Box>

                    <Box>
                      <HStack mb={1}>
                        <Badge colorScheme="orange">Phase 3</Badge>
                        <Text fontSize="sm" fontWeight="semibold">No Video After 3 Days</Text>
                      </HStack>
                      <List spacing={1} fontSize="sm" ml={4}>
                        <ListItem>• Messages decay to 2 per day</ListItem>
                        <ListItem>• Prompt: "Still interested? Schedule your first video date"</ListItem>
                        <ListItem>• Option to buy credits OR schedule video to restore messaging</ListItem>
                      </List>
                    </Box>
                  </VStack>
                </Box>

                <Box>
                  <Text fontWeight="semibold" mb={2} color="purple.600">Smart Prompts:</Text>
                  <List spacing={2} fontSize="sm">
                    <ListItem>
                      <Text fontWeight="medium">Long Message Detector</Text>
                      <Text fontSize="xs" color="gray.600">
                        After 280 characters: "Looks like you have a lot to say! Why not continue this on video?" 
                        [Keep Typing (costs 1 message credit)]
                      </Text>
                    </ListItem>
                    <ListItem>
                      <Text fontWeight="medium">Video Scheduling Nudges</Text>
                      <Text fontSize="xs" color="gray.600">
                        Prompts appear at key conversation milestones to encourage video dates
                      </Text>
                    </ListItem>
                  </List>
                </Box>

                <Box bg="blue.50" p={4} borderRadius="md">
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color="blue.700">Example Scenario:</Text>
                  <Text fontSize="xs" color="gray.700">
                    You message someone → Exchange 10 messages → Hit daily limit → Schedule video call → 
                    Complete call → Unlock +{getTierLimits('casual').bonusMessagesAfterVideo || 25} daily messages → 
                    Can now send video messages → Continue getting to know each other with enhanced communication
                  </Text>
                </Box>
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
