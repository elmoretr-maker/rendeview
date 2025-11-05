import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  Spinner,
  Container,
  Link
} from "@chakra-ui/react";

function currencyFromCents(cents, currency = "usd") {
  if (typeof cents !== "number") return "-";
  const value = (cents / 100).toFixed(2);
  return `${currency.toUpperCase()} $${value}`;
}

export default function BillingPage() {
  const { data: user, loading } = useUser();
  const [authError, setAuthError] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  // Load pricing/admin settings
  const {
    data: settingsData,
    isLoading: settingsLoading,
    error: settingsError,
  } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        throw new Error(
          `When fetching /api/admin/settings, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: 1,
  });

  // Load receipts (Stripe charges) for current user
  const {
    data: receipts,
    isLoading: receiptsLoading,
    error: receiptsError,
  } = useQuery({
    queryKey: ["payments", "receipts"],
    queryFn: async () => {
      const res = await fetch("/api/payments/receipts");
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) {
        throw new Error(
          `When fetching /api/payments/receipts, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401) return false;
      return count < 1;
    },
  });

  useEffect(() => {
    if (receiptsError?.code === 401) {
      setAuthError("Please sign in to view billing.");
    }
  }, [receiptsError]);

  const pricing = settingsData?.settings?.pricing || {};
  const tiers = pricing?.tiers || {};
  const tierEntries = useMemo(() => Object.entries(tiers), [tiers]);
  const firstTierKey = tierEntries[0]?.[0];

  const onCheckout = useCallback(async (payload) => {
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          redirectURL:
            typeof window !== "undefined"
              ? window.location.origin + "/account/billing"
              : undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Could not start checkout");
      }
      const j = await res.json();
      if (j?.url) {
        if (typeof window !== "undefined") {
          window.location.href = j.url;
        }
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Checkout failed");
    }
  }, []);

  const startSubscription = useCallback(
    (tier) => {
      onCheckout({ kind: "subscription", tier });
    },
    [onCheckout],
  );

  const paySecondDate = useCallback(() => {
    onCheckout({ kind: "second-date" });
  }, [onCheckout]);

  const openPortal = useCallback(async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/payments/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirectURL:
            typeof window !== "undefined"
              ? window.location.origin + "/account/billing"
              : undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.error || "Could not open portal");
      }
      const j = await res.json();
      if (j?.url && typeof window !== "undefined") {
        window.location.href = j.url;
      }
    } catch (e) {
      console.error(e);
      setPortalError(e.message || "Could not open portal");
    } finally {
      setPortalLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <Container maxW="4xl" py={12}>
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxW="4xl" p={6}>
        <Heading size="xl" mb={4}>Billing</Heading>
        <VStack align="start" spacing={4}>
          <Text>You need to be signed in to view billing.</Text>
          <Button as={Link} href="/account/signin" colorScheme="purple">
            Sign in
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="5xl" p={6}>
      <Heading size="xl" mb={2}>Billing</Heading>
      <Text opacity={0.8} mb={4}>
        Manage your plan and view receipts. Status:{" "}
        <Text as="span" fontWeight="semibold">
          {user?.subscription_status || "none"}
        </Text>
        {user?.membership_tier ? ` • Plan: ${user.membership_tier}` : ""}
      </Text>

      <HStack mb={6} spacing={3}>
        <Button
          onClick={openPortal}
          isLoading={portalLoading}
          loadingText="Opening portal…"
          colorScheme="purple"
        >
          Manage subscription
        </Button>
        {portalError && (
          <Text fontSize="sm" color="red.500">
            {portalError}
          </Text>
        )}
      </HStack>

      {settingsLoading ? (
        <Box p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" mb={4}>
          Loading plans…
        </Box>
      ) : settingsError ? (
        <Box p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" color="red.500" mb={4}>
          {settingsError?.message || "Failed to load plans"}
        </Box>
      ) : null}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
        {tierEntries.length === 0 && !settingsLoading && !settingsError && (
          <Box gridColumn="1 / -1" p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200">
            <Text>No plans configured yet.</Text>
          </Box>
        )}
        {tierEntries.map(([key, val]) => {
          const isCurrent =
            (user?.membership_tier || "").toLowerCase() === key.toLowerCase();
          return (
            <VStack
              key={key}
              p={4}
              bg="white"
              borderRadius="md"
              borderWidth="1px"
              borderColor="gray.200"
              align="stretch"
              spacing={3}
            >
              <Box flex={1}>
                <Heading size="md" mb={1} color="gray.800">
                  {key[0].toUpperCase() + key.slice(1)}
                </Heading>
                <Text fontSize="sm" opacity={0.8} mb={2}>
                  Minutes: {val?.minutes ?? 0}
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="purple.600">
                  {currencyFromCents(val?.price_cents ?? 0)}
                </Text>
              </Box>
              {isCurrent ? (
                <Button isDisabled colorScheme="gray" variant="solid">
                  Current plan
                </Button>
              ) : (
                <Button onClick={() => startSubscription(key)} colorScheme="purple">
                  Choose plan
                </Button>
              )}
            </VStack>
          );
        })}
      </SimpleGrid>

      <Box p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" mb={8}>
        <Heading size="md" mb={1}>Second Date</Heading>
        <Text opacity={0.8} mb={3}>
          Pay the $10 second date fee to unlock scheduling a follow-up.
        </Text>
        <Button onClick={paySecondDate} colorScheme="pink">
          Pay {currencyFromCents(pricing?.second_date_cents ?? 1000)}
        </Button>
      </Box>

      <Box>
        <Heading size="md" mb={2}>Recent payments</Heading>
        {authError ? (
          <Box p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200">
            <Text mb={3}>{authError}</Text>
            <Button as={Link} href="/account/signin" colorScheme="purple">
              Sign in
            </Button>
          </Box>
        ) : receiptsLoading ? (
          <Box p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200">
            Loading…
          </Box>
        ) : receiptsError ? (
          <Box p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" color="red.500">
            {receiptsError?.message || "Failed to load receipts"}
          </Box>
        ) : (
          <VStack spacing={2} align="stretch">
            {(receipts?.charges || []).length === 0 ? (
              <HStack p={4} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="semibold">No payments yet</Text>
                  <Text fontSize="sm" opacity={0.8}>
                    Pick a plan to get started.
                  </Text>
                </VStack>
                {firstTierKey && (
                  <Button onClick={() => startSubscription(firstTierKey)} colorScheme="purple" size="sm">
                    Choose a plan
                  </Button>
                )}
              </HStack>
            ) : (
              (receipts?.charges || []).map((c) => {
                const date = new Date((c.created || 0) * 1000);
                return (
                  <HStack
                    key={c.id}
                    p={4}
                    bg="white"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="gray.200"
                    justify="space-between"
                  >
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold">
                        {c.description || "Payment"}
                      </Text>
                      <Text fontSize="sm" opacity={0.8}>
                        {date.toLocaleString()}
                      </Text>
                    </VStack>
                    <HStack spacing={3}>
                      <Text fontWeight="semibold" color="gray.800">
                        {currencyFromCents(c.amount_cents, c.currency)}
                      </Text>
                      {c.receipt_url && (
                        <Button
                          as={Link}
                          href={c.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          colorScheme="purple"
                          size="sm"
                        >
                          Receipt
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                );
              })
            )}
          </VStack>
        )}
      </Box>
    </Container>
  );
}
