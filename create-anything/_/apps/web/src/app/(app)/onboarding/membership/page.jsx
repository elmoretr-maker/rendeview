import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { buildDynamicTiers, buildDynamicExtensions } from "@/utils/membershipTiers";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Progress,
  Card,
  CardBody,
  Spinner
} from "@chakra-ui/react";

function MembershipScreenContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [error, setError] = useState(null);

  const totalSteps = 4;
  const stepIndex = 3;
  const progressPct = (stepIndex / totalSteps) * 100;

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
        setError(null);
        if (key === "free") {
          const res = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ membership_tier: "free" }),
          });
          if (!res.ok) throw new Error("Failed to set tier");
          navigate("/onboarding/profile");
          return;
        }
        const redirectURL = window.location.origin;
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
          navigate("/stripe", { state: { checkoutUrl: url } });
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

  return (
    <Box minH="100vh" bg="white">
      <Container maxW="2xl" px={6} py={8}>
        <Button
          onClick={() => navigate("/onboarding/consent")}
          variant="ghost"
          leftIcon={<ArrowLeft size={20} />}
          mb={4}
          color="gray.600"
          _hover={{ color: "gray.900" }}
        >
          Back
        </Button>

        <Box mb={6}>
          <Progress
            value={progressPct}
            size="sm"
            borderRadius="full"
            colorScheme="purple"
            mb={2}
          />
          <Text fontSize="sm" opacity={0.7} color="gray.700">
            Step {stepIndex} of {totalSteps}
          </Text>
        </Box>

        <Heading size="2xl" mb={2} color="gray.700">
          Choose your plan
        </Heading>
        <Text opacity={0.7} mb={6} color="gray.700">
          Unlock video chat with a membership. You can upgrade anytime.
        </Text>

        {loadingPricing ? (
          <Box textAlign="center" py={8}>
            <Spinner size="xl" color="purple.500" thickness="4px" />
            <Text mt={4} color="gray.600">Loading pricing...</Text>
          </Box>
        ) : (
          <>
        <VStack spacing={3} mb={4}>
          {tiers.map((t) => (
            <Card
              key={t.key}
              w="full"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="xl"
              bg={t.highlight ? "purple.50" : "white"}
              shadow={t.highlight ? "md" : "sm"}
            >
              <CardBody>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="lg" fontWeight="bold" color="gray.700">
                    {t.title}
                  </Text>
                  <Text fontSize="md" fontWeight="bold" color="purple.600">
                    {t.price}
                  </Text>
                </HStack>
                <Text opacity={0.8} mb={2} color="gray.700">
                  {t.desc}
                </Text>
                
                <VStack align="start" spacing={1} fontSize="sm" mb={3} color="gray.700">
                  <Text>• {t.photos} Profile Photos</Text>
                  <Text>• {t.videos} Video{t.videos !== 1 ? 's' : ''} ({t.videoDuration}s max each)</Text>
                  <Text>• {t.chatMinutes} Minutes Video Chat</Text>
                  {t.maxMeetings !== undefined && t.maxMeetings !== Infinity && (
                    <Text fontWeight="semibold" color="green.500">
                      • {t.maxMeetings} Meeting Limit
                    </Text>
                  )}
                </VStack>
                
                <Button
                  onClick={() => chooseTier(t.key)}
                  isDisabled={loading}
                  isLoading={loading}
                  w="full"
                  colorScheme="purple"
                  size="lg"
                >
                  {t.key === "free"
                    ? "Continue with Free"
                    : `Choose ${t.title}`}
                </Button>
              </CardBody>
            </Card>
          ))}
        </VStack>

        <Box p={4} borderRadius="xl" bg="gray.100" mt={4}>
          <Heading size="md" mb={2} color="gray.700">
            Call Extensions
          </Heading>
          <Text fontWeight="semibold" color="green.500">
            • {extensions.formattedPrice} for {extensions.durationMinutes} minutes
          </Text>
          <Text fontSize="sm" mt={1} opacity={0.8} color="gray.700">
            Extend any video call beyond your tier's limit
          </Text>
        </Box>

        {pricing?.second_date_cents != null && (
          <Text fontWeight="bold" color="green.500" mt={3}>
            Second Date Fee: ${(pricing.second_date_cents / 100).toFixed(2)} USD
          </Text>
        )}
        </>
        )}

        {error && <Text mt={2} color="red.500">{error}</Text>}
      </Container>
    </Box>
  );
}

export default function MembershipScreen() {
  return (
    <OnboardingGuard>
      <MembershipScreenContent />
    </OnboardingGuard>
  );
}
