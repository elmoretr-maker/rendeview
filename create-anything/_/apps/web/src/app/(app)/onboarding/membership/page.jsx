import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, Star, Video, Camera, MessageCircle, Clock, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildDynamicTiers, buildDynamicExtensions } from "@/utils/membershipTiers";
import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/logo-centered.png";
import {
  Box,
  VStack,
  HStack,
  Flex,
  Heading,
  Text,
  Button,
  Image,
  Spinner,
  Badge,
  Grid,
  GridItem,
  Icon,
  IconButton,
} from "@chakra-ui/react";

export function meta() {
  return [
    { title: "Choose Your Plan | Rende-View" },
    { name: "description", content: "Select your membership tier for the best video-first dating experience." },
  ];
}

const MotionBox = motion.create(Box);

function TierCard({ tier, isSelected, isLoading, onChoose, tierColor, TierIcon }) {
  const isHighlighted = tier.highlight;
  
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Box
        bg={isHighlighted ? "purple.50" : "white"}
        borderRadius="3xl"
        p={6}
        borderWidth={isHighlighted ? "2px" : "1px"}
        borderColor={isHighlighted ? "purple.500" : "gray.200"}
        shadow={isHighlighted ? "2xl" : "lg"}
        position="relative"
        transition="all 0.2s"
        _hover={{
          shadow: "2xl",
          borderColor: "purple.400",
        }}
      >
        {isHighlighted && (
          <Badge
            position="absolute"
            top={-3}
            left="50%"
            transform="translateX(-50%)"
            bg="purple.500"
            color="white"
            px={4}
            py={1}
            borderRadius="full"
            fontSize="xs"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            gap={1}
          >
            <Star size={12} fill="currentColor" />
            MOST POPULAR
          </Badge>
        )}
        
        <Flex justify="space-between" align="flex-start" mb={4}>
          <HStack spacing={3}>
            <Flex
              w={12}
              h={12}
              bg={`${tierColor}15`}
              borderRadius="xl"
              align="center"
              justify="center"
            >
              <Icon as={TierIcon} boxSize={6} color={tierColor} />
            </Flex>
            <VStack align="start" spacing={0}>
              <Heading size="md" color="gray.800" fontWeight="bold">
                {tier.title}
              </Heading>
              <Text fontSize="sm" color="gray.500">{tier.desc}</Text>
            </VStack>
          </HStack>
          <Text fontSize="2xl" fontWeight="bold" color={tierColor}>
            {tier.price}
          </Text>
        </Flex>
        
        <Grid templateColumns="repeat(2, 1fr)" gap={2} mb={4}>
          <GridItem>
            <HStack spacing={2}>
              <Icon as={Camera} boxSize={4} color="purple.500" />
              <Text fontSize="sm" color="gray.600">{tier.photos} Photos</Text>
            </HStack>
          </GridItem>
          <GridItem>
            <HStack spacing={2}>
              <Icon as={Video} boxSize={4} color="purple.500" />
              <Text fontSize="sm" color="gray.600">
                {tier.videos} Video ({tier.videoDuration}s)
              </Text>
            </HStack>
          </GridItem>
          <GridItem>
            <HStack spacing={2}>
              <Icon as={Clock} boxSize={4} color="purple.500" />
              <Text fontSize="sm" color="gray.600">{tier.chatMinutes} min Video Chat</Text>
            </HStack>
          </GridItem>
          <GridItem>
            <HStack spacing={2}>
              <Icon as={MessageCircle} boxSize={4} color="purple.500" />
              <Text fontSize="sm" color="gray.600">{tier.dailyMessages} Daily Messages</Text>
            </HStack>
          </GridItem>
          {tier.maxMeetings !== undefined && tier.maxMeetings !== Infinity && (
            <GridItem colSpan={2}>
              <HStack spacing={2}>
                <Icon as={Check} boxSize={4} color="green.500" />
                <Text fontSize="sm" color="green.600" fontWeight="medium">
                  {tier.maxMeetings} Meeting Limit
                </Text>
              </HStack>
            </GridItem>
          )}
          {tier.key === 'free' && tier.videoTrialDays && (
            <GridItem colSpan={2}>
              <HStack spacing={2}>
                <Icon as={Check} boxSize={4} color="green.500" />
                <Text fontSize="sm" color="green.600" fontWeight="medium">
                  {tier.videoTrialDays}-day Video Trial
                </Text>
              </HStack>
            </GridItem>
          )}
        </Grid>
        
        <Button
          w="full"
          size="lg"
          variant={tier.key === 'free' ? 'outline' : 'solid'}
          colorScheme="purple"
          borderRadius="xl"
          fontWeight="semibold"
          isLoading={isLoading && isSelected}
          loadingText="Processing..."
          onClick={() => onChoose(tier.key)}
          shadow={tier.key === 'free' ? 'none' : 'lg'}
          _hover={{
            transform: 'translateY(-2px)',
            shadow: 'xl',
          }}
          transition="all 0.2s"
        >
          {tier.key === "free" ? "Start Free" : `Choose ${tier.title}`}
        </Button>
      </Box>
    </MotionBox>
  );
}

function MembershipContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  const totalSteps = 3;
  const stepIndex = 2;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (!res.ok) throw new Error("Failed to load pricing");
        const data = await res.json();
        if (mounted) {
          setPricing(data?.settings?.pricing || null);
          setLoadingPricing(false);
        }
      } catch (e) {
        console.error("Failed to load pricing:", e);
        if (mounted) {
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

  const chooseTier = useCallback(
    async (key) => {
      try {
        setLoading(true);
        setSelectedTier(key);
        
        sessionStorage.setItem("selected_tier", key);
        
        const profileRes = await fetch("/api/profile");
        const isAuthenticated = profileRes.ok;
        
        if (isAuthenticated) {
          if (key === "free") {
            await fetch("/api/profile", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ membership_tier: "free", consent_accepted: true }),
            });
            navigate("/onboarding/profile?tier=free");
          } else {
            const redirectURL = window.location.origin + `/onboarding/profile?tier=${key}`;
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
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.error || "Could not start checkout");
            }
            
            const { url } = await res.json();
            if (url) {
              navigate("/stripe", { 
                state: { 
                  checkoutUrl: url,
                  returnTo: `/onboarding/profile?tier=${key}`,
                } 
              });
            } else {
              throw new Error("Missing checkout URL");
            }
          }
        } else {
          sessionStorage.setItem("needs_stripe_checkout", key !== "free" ? "true" : "false");
          navigate(`/account/signup?tier=${key}`);
        }
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const getTierIcon = (key) => {
    switch (key) {
      case 'free': return Users;
      case 'casual': return MessageCircle;
      case 'dating': return Video;
      case 'business': return Sparkles;
      default: return Users;
    }
  };

  const getTierColor = (key) => {
    switch (key) {
      case 'free': return 'gray.500';
      case 'casual': return 'purple.500';
      case 'dating': return 'pink.500';
      case 'business': return 'orange.500';
      default: return 'purple.500';
    }
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(135deg, purple.50 0%, white 50%, blue.50 100%)"
      py={6}
      px={4}
    >
      <Box maxW="800px" mx="auto">
        <VStack spacing={6} align="stretch">
          <Box>
            <Box
              h={2}
              bg="gray.200"
              borderRadius="full"
              overflow="hidden"
              mb={2}
            >
              <MotionBox
                h="full"
                bg="purple.500"
                borderRadius="full"
                initial={{ width: 0 }}
                animate={{ width: `${(stepIndex / totalSteps) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </Box>
            <Text fontSize="sm" color="gray.500">Step {stepIndex} of {totalSteps}</Text>
          </Box>

          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={18} />}
            color="purple.500"
            alignSelf="flex-start"
            fontWeight="medium"
            onClick={() => navigate("/onboarding/consent")}
            _hover={{ bg: "purple.50" }}
          >
            Back
          </Button>

          <VStack spacing={4} textAlign="center">
            <Flex
              w={20}
              h={20}
              bg="gray.900"
              borderRadius="2xl"
              align="center"
              justify="center"
              shadow="lg"
            >
              <Image
                src={logoImage}
                alt="Rende-View"
                w="60px"
                h="60px"
                objectFit="contain"
              />
            </Flex>
            
            <Heading
              size="xl"
              color="purple.600"
              fontFamily="'Playfair Display', Georgia, serif"
            >
              Choose Your Plan
            </Heading>
            <Text color="gray.500">
              Unlock video chat with a membership. Upgrade anytime.
            </Text>
          </VStack>

          {loadingPricing ? (
            <VStack py={12} spacing={4}>
              <Spinner size="xl" color="purple.500" thickness="4px" />
              <Text color="gray.500">Loading plans...</Text>
            </VStack>
          ) : (
            <VStack spacing={4}>
              <AnimatePresence>
                {tiers.map((tier, index) => (
                  <TierCard
                    key={tier.key}
                    tier={tier}
                    isSelected={selectedTier === tier.key}
                    isLoading={loading}
                    onChoose={chooseTier}
                    tierColor={getTierColor(tier.key)}
                    TierIcon={getTierIcon(tier.key)}
                  />
                ))}
              </AnimatePresence>
            </VStack>
          )}

          {!loadingPricing && (
            <Box
              bg="white"
              borderRadius="2xl"
              p={5}
              borderWidth="1px"
              borderColor="gray.200"
              shadow="md"
            >
              <Text fontWeight="semibold" color="gray.800" mb={1}>
                Need More Time?
              </Text>
              <Text fontSize="sm" color="gray.500" mb={1}>
                Extend any video call with our pay-as-you-go option:
              </Text>
              <Text fontWeight="semibold" color="green.500">
                {extensions.formattedPrice} for {extensions.durationMinutes} extra minutes
              </Text>
            </Box>
          )}

          <Text textAlign="center" fontSize="xs" color="gray.400">
            All plans include our safety features and verified profiles.
            Cancel anytime from your account settings.
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}

export default function MembershipScreen() {
  return <MembershipContent />;
}
