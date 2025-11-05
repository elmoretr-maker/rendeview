import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
  Card,
  CardBody,
  CardHeader,
  VStack,
  HStack,
  Input,
  FormControl,
  FormLabel,
  Divider,
} from "@chakra-ui/react";
import useUser from "@/utils/useUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminPage() {
  const { data: user, loading } = useUser();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [clearFlagError, setClearFlagError] = useState(null);

  // Check if user has admin access (email contains 'staff' OR specific email)
  const isAdmin = user?.email?.toLowerCase().includes('staff') || 
                 user?.email?.toLowerCase() === 'trelmore.staff@gmail.com';

  // Fetch admin settings
  const { data: settingsResp, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });
  const settings = settingsResp?.settings || null;

  // Fetch flagged users
  const { data: flaggedUsersResp, isLoading: flaggedLoading, error: flaggedError } = useQuery({
    queryKey: ["admin-flagged-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flagged-users");
      if (!res.ok) throw new Error("Failed to load flagged users");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });
  const flaggedUsers = flaggedUsersResp?.users || [];

  // Fetch revenue stats
  const { data: revenueResp, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ["admin-revenue-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/revenue-stats");
      if (!res.ok) throw new Error("Failed to load revenue stats");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });
  const stats = revenueResp?.stats || null;

  // Mutation to clear flag
  const clearFlagMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch("/api/admin/clear-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to clear flag");
      return res.json();
    },
    onSuccess: () => {
      setClearFlagError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-flagged-users"] });
    },
    onError: (err) => {
      setClearFlagError(err.message || "Failed to clear flag");
    },
  });

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => setError("Failed to save settings"),
  });

  const handleSave = () => {
    setError(null);
    saveMutation.mutate({
      pricing: settings?.pricing ?? {},
      discount_toggles: settings?.discount_toggles ?? {},
    });
  };

  const handleClearFlag = (userId) => {
    if (window.confirm("Are you sure you want to clear the flag for this user?")) {
      clearFlagMutation.mutate(userId);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Box>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/account/signin" replace />;
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/account/signin" replace />;
  }

  const onTierChange = (tier, field, value) => {
    queryClient.setQueryData(["admin-settings"], (prev) => {
      const prevSettings = prev?.settings || {};
      const prevTiers = prevSettings?.pricing?.tiers || {};
      return {
        ...(prev || {}),
        settings: {
          ...prevSettings,
          pricing: {
            ...(prevSettings.pricing || {}),
            tiers: {
              ...prevTiers,
              [tier]: { ...(prevTiers[tier] || {}), [field]: Number(value) },
            },
          },
        },
      };
    });
  };

  const onSecondDateChange = (value) => {
    queryClient.setQueryData(["admin-settings"], (prev) => {
      const prevSettings = prev?.settings || {};
      return {
        ...(prev || {}),
        settings: {
          ...prevSettings,
          pricing: {
            ...(prevSettings.pricing || {}),
            second_date_cents: Number(value),
          },
        },
      };
    });
  };

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="6xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Card>
            <CardBody>
              <Heading size="xl">Admin Dashboard</Heading>
              <Text mt={2} fontSize="sm" color="gray.600">
                Logged in as: <Text as="span" fontWeight="medium">{user.email}</Text>
              </Text>
            </CardBody>
          </Card>

        {/* Safety Management Section */}
        <Card>
          <CardHeader>
            <Heading size="lg">Safety Management</Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              Flagged members with 3 or more blocks requiring review
            </Text>
          </CardHeader>
          <CardBody>
            {clearFlagError && (
              <Alert status="error" mb={4} borderRadius="lg">
                <AlertIcon />
                <AlertDescription><strong>Error:</strong> {clearFlagError}</AlertDescription>
              </Alert>
            )}
            {flaggedLoading ? (
              <Box textAlign="center" py={8}>
                <Spinner color="purple.500" />
              </Box>
            ) : flaggedError ? (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <Box flex="1">
                  <Text fontWeight="medium">Failed to load flagged users</Text>
                  <Text fontSize="sm">{flaggedError.message}</Text>
                </Box>
              </Alert>
            ) : flaggedUsers.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">No flagged users at this time</Text>
              </Box>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Blocks</Th>
                      <Th>Status</Th>
                      <Th>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {flaggedUsers.map((flaggedUser) => (
                      <Tr key={flaggedUser.id} _hover={{ bg: "gray.50" }}>
                        <Td fontWeight="medium">{flaggedUser.name || "N/A"}</Td>
                        <Td>{flaggedUser.email}</Td>
                        <Td>
                          <Badge colorScheme="red">
                            {flaggedUser.block_count || 0} blocks
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              flaggedUser.account_status === 'active' ? 'green' :
                              flaggedUser.account_status === 'under_review' ? 'yellow' :
                              'gray'
                            }
                          >
                            {flaggedUser.account_status || "N/A"}
                          </Badge>
                        </Td>
                        <Td>
                          <Button
                            onClick={() => handleClearFlag(flaggedUser.id)}
                            isLoading={clearFlagMutation.isLoading}
                            colorScheme="blue"
                            size="sm"
                          >
                            Clear Flag
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Revenue Overview Section */}
        <Card>
          <CardHeader>
            <Heading size="lg">Revenue Overview</Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              Key metrics and subscription statistics
            </Text>
          </CardHeader>
          <CardBody>
            {revenueLoading ? (
              <Box textAlign="center" py={8}>
                <Spinner color="purple.500" />
              </Box>
            ) : revenueError ? (
              <Alert status="error" borderRadius="lg">
                <AlertIcon />
                <Box flex="1">
                  <Text fontWeight="medium">Failed to load revenue statistics</Text>
                  <Text fontSize="sm">{revenueError.message}</Text>
                </Box>
              </Alert>
            ) : stats ? (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <Stat bg="blue.50" p={6} borderRadius="lg">
                  <StatLabel color="blue.600" textTransform="uppercase" fontSize="sm">
                    Total Users
                  </StatLabel>
                  <StatNumber fontSize="3xl">{stats.totalUsers?.toLocaleString() || 0}</StatNumber>
                </Stat>
                <Stat bg="green.50" p={6} borderRadius="lg">
                  <StatLabel color="green.600" textTransform="uppercase" fontSize="sm">
                    Casual Subscribers
                  </StatLabel>
                  <StatNumber fontSize="3xl">{stats.paidSubscribers?.casual?.toLocaleString() || 0}</StatNumber>
                  <StatHelpText>$9.99/month</StatHelpText>
                </Stat>
                <Stat bg="purple.50" p={6} borderRadius="lg">
                  <StatLabel color="purple.600" textTransform="uppercase" fontSize="sm">
                    Dating Subscribers
                  </StatLabel>
                  <StatNumber fontSize="3xl">{stats.paidSubscribers?.dating?.toLocaleString() || 0}</StatNumber>
                  <StatHelpText>$29.99/month</StatHelpText>
                </Stat>
                <Stat bg="blue.100" p={6} borderRadius="lg">
                  <StatLabel color="blue.700" textTransform="uppercase" fontSize="sm">
                    Business Subscribers
                  </StatLabel>
                  <StatNumber fontSize="3xl">{stats.paidSubscribers?.business?.toLocaleString() || 0}</StatNumber>
                  <StatHelpText>$49.99/month</StatHelpText>
                </Stat>
                <Stat bg="yellow.50" p={6} borderRadius="lg">
                  <StatLabel color="yellow.600" textTransform="uppercase" fontSize="sm">
                    Total Paid Subscribers
                  </StatLabel>
                  <StatNumber fontSize="3xl">{stats.paidSubscribers?.total?.toLocaleString() || 0}</StatNumber>
                </Stat>
                <Stat bg="red.50" p={6} borderRadius="lg">
                  <StatLabel color="red.600" textTransform="uppercase" fontSize="sm">
                    Scheduled Downgrades
                  </StatLabel>
                  <StatNumber fontSize="3xl">{stats.scheduledDowngrades?.toLocaleString() || 0}</StatNumber>
                  <StatHelpText>Revenue at risk</StatHelpText>
                </Stat>
              </SimpleGrid>
            ) : (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">Failed to load stats</Text>
              </Box>
            )}
          </CardBody>
        </Card>

          {/* Settings Control Section */}
          <Card>
            <CardHeader>
              <Heading size="lg">Pricing Settings</Heading>
              <Text fontSize="sm" color="gray.600" mt={1}>
                Adjust subscription tier pricing and video call durations
              </Text>
            </CardHeader>
            <CardBody>
              {settingsLoading ? (
                <Box textAlign="center" py={8}>
                  <Spinner color="purple.500" />
                </Box>
              ) : !settings ? (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500">{error || "Failed to load settings"}</Text>
                </Box>
              ) : (
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={4}>
                      Subscription Tiers (price in cents)
                    </Heading>
                    <VStack spacing={4}>
                      {Object.keys({ casual: 1, dating: 1, business: 1 }).map((tier) => {
                        const tiers = settings.pricing?.tiers || {};
                        return (
                          <SimpleGrid
                            key={tier}
                            columns={{ base: 1, md: 3 }}
                            spacing={4}
                            p={4}
                            bg="gray.50"
                            borderRadius="lg"
                            borderWidth={1}
                            w="full"
                          >
                            <Text fontWeight="medium" textTransform="capitalize">{tier}</Text>
                            <FormControl>
                              <FormLabel fontSize="sm">Minutes</FormLabel>
                              <Input
                                type="number"
                                value={tiers?.[tier]?.minutes ?? 0}
                                onChange={(e) => onTierChange(tier, "minutes", e.target.value)}
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="sm">Price (cents)</FormLabel>
                              <Input
                                type="number"
                                value={tiers?.[tier]?.price_cents ?? 0}
                                onChange={(e) => onTierChange(tier, "price_cents", e.target.value)}
                              />
                            </FormControl>
                          </SimpleGrid>
                        );
                      })}
                    </VStack>
                  </Box>

                  <Divider />

                  <Box>
                    <Heading size="md" mb={4}>Second Date Fee</Heading>
                    <FormControl maxW="xs">
                      <FormLabel fontSize="sm">Price (cents)</FormLabel>
                      <Input
                        type="number"
                        value={settings.pricing?.second_date_cents ?? 1000}
                        onChange={(e) => onSecondDateChange(e.target.value)}
                      />
                    </FormControl>
                  </Box>

                  <HStack spacing={3} pt={4}>
                    <Button
                      onClick={handleSave}
                      isLoading={saveMutation.isLoading}
                      loadingText="Saving..."
                      colorScheme="blue"
                    >
                      Save Settings
                    </Button>
                    {error && <Text color="red.600" fontSize="sm">{error}</Text>}
                    {saveMutation.isError && !error && (
                      <Text color="red.600" fontSize="sm">Failed to save settings</Text>
                    )}
                    {saveMutation.isSuccess && (
                      <Text color="green.700" fontSize="sm" fontWeight="medium">✓ Saved successfully</Text>
                    )}
                  </HStack>
                </VStack>
              )}
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
}
