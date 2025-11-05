import React from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, X, Video, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
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
  Badge,
  Card,
  CardBody,
  SimpleGrid,
  Image,
} from "@chakra-ui/react";

export default function RemoteProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const targetId = Number(userId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["remote-profile", targetId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${targetId}`);
      if (res.status === 401) {
        const err = new Error("AUTH_401");
        err.code = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    retry: (count, err) => {
      if (err?.code === 401 || err?.message === "AUTH_401") return false;
      return count < 2;
    },
  });

  const media = data?.media || [];
  const user = data?.user || {};
  const video = media.find((m) => m.type === "video");
  const typical = user?.typical_availability?.typical || [];
  const timezone = user?.typical_availability?.timezone || user?.timezone;

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/matches/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likedId: targetId }),
      });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      if (resp?.matched) {
        toast.success("It's a match! You can now chat and schedule.");
      } else {
        toast.success("Liked! We'll let you know if they like you back.");
      }
    },
    onError: () => toast.error("Unable to like this profile"),
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: targetId }),
      });
      if (!res.ok) throw new Error("Failed to discard");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      toast.success("Profile hidden");
      
      if (data?.warning) {
        toast.warning(data.warning, { duration: 6000 });
      }
      
      navigate(-1);
    },
    onError: () => toast.error("Could not discard profile"),
  });

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <VStack py={12}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
        </VStack>
      </Box>
    );
  }

  if (error?.message === "AUTH_401") {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <VStack align="start" spacing={4}>
            <Text>Session expired. Please sign in.</Text>
            <Button onClick={() => navigate("/account/signin")} colorScheme="purple">
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
          <Text color="red.600">Error loading profile</Text>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" px={4} py={8}>
        {/* Header with name and membership tier */}
        <VStack align="start" spacing={2} mb={6}>
          <Heading size="2xl" color="gray.800">
            {user?.name || `User ${user?.id}`}
          </Heading>
          {user?.membership_tier && (
            <Badge 
              px={3} 
              py={1} 
              borderRadius="full" 
              fontSize="sm" 
              fontWeight="semibold"
              colorScheme="purple"
            >
              {user.membership_tier.charAt(0).toUpperCase() + user.membership_tier.slice(1)} Member
            </Badge>
          )}
        </VStack>

        {/* Primary photo */}
        {user?.primary_photo_url && (
          <Box mb={6} shadow="lg" borderRadius="2xl" overflow="hidden">
            <Image
              src={getAbsoluteUrl(user.primary_photo_url)}
              alt={user.name}
              w="full"
              h="96"
              objectFit="cover"
              bg="gray.100"
            />
          </Box>
        )}

        {/* About section */}
        {user?.bio && (
          <Card mb={6} shadow="md">
            <CardBody p={6}>
              <Heading size="lg" mb={3} color="gray.800">About</Heading>
              <Text fontSize="base" lineHeight="relaxed" color="gray.800">
                {user.bio}
              </Text>
            </CardBody>
          </Card>
        )}

        {/* Video */}
        {video?.url && (
          <Box mb={6}>
            <Heading size="lg" mb={3} color="gray.800">Video Introduction</Heading>
            <Box borderRadius="2xl" overflow="hidden" bg="black" shadow="lg">
              <Box as="video" src={getAbsoluteUrl(video.url)} controls loop w="full" maxH="400px" />
            </Box>
          </Box>
        )}

        {/* Photo gallery */}
        {media.filter((m) => m.type === "photo").length > 0 && (
          <Box mb={6}>
            <Heading size="lg" mb={3} color="gray.800">
              Photos ({media.filter((m) => m.type === "photo").length})
            </Heading>
            <SimpleGrid columns={3} spacing={3}>
              {media
                .filter((m) => m.type === "photo")
                .map((m, idx) => (
                  <Image
                    key={idx}
                    src={getAbsoluteUrl(m.url)}
                    alt="Profile"
                    w="full"
                    h="32"
                    borderRadius="xl"
                    objectFit="cover"
                    shadow="md"
                    _hover={{ shadow: "lg" }}
                    transition="all 0.2s"
                    cursor="pointer"
                    bg="gray.100"
                  />
                ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Availability */}
        <Card mb={6} shadow="md">
          <CardBody p={6}>
            <Heading size="lg" mb={3} color="gray.800">Availability</Heading>
            {typical.length > 0 ? (
              <VStack align="start" spacing={2}>
                {typical.map((slot, i) => (
                  <HStack key={i} spacing={2}>
                    <Box w={2} h={2} borderRadius="full" bg="teal.500" />
                    <Text color="gray.800">
                      {(slot.days || []).join(", ")} • {slot.start} - {slot.end}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            ) : (
              <Text opacity={0.6} color="gray.800">Availability not shared</Text>
            )}
            {timezone && (
              <Text opacity={0.6} mt={3} fontSize="sm" color="gray.800">
                Timezone: {timezone}
              </Text>
            )}
            {user?.immediate_available && (
              <Badge 
                mt={3} 
                display="inline-flex" 
                alignItems="center" 
                gap={2} 
                px={3} 
                py={2} 
                borderRadius="lg" 
                fontSize="sm" 
                fontWeight="semibold"
                colorScheme="teal"
              >
                <Box w={2} h={2} borderRadius="full" bg="teal.500" animation="pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" />
                Available now
              </Badge>
            )}
          </CardBody>
        </Card>

        {/* Action buttons */}
        <Flex gap={4} mt={8} justify="center" position="sticky" bottom={8} flexWrap="wrap">
          <Button
            onClick={() => navigate("/discovery")}
            leftIcon={<ArrowLeft size={24} />}
            size="lg"
            borderRadius="2xl"
            fontWeight="bold"
            bg="white"
            shadow="lg"
            _hover={{ shadow: "xl" }}
          >
            Back
          </Button>
          <Button
            onClick={() => discardMutation.mutate()}
            isDisabled={discardMutation.isPending}
            leftIcon={<X size={24} color="#E74C3C" />}
            size="lg"
            borderRadius="2xl"
            fontWeight="bold"
            bg="white"
            shadow="lg"
            _hover={{ shadow: "xl" }}
          >
            Pass
          </Button>
          <Button
            onClick={() => likeMutation.mutate()}
            isDisabled={likeMutation.isPending}
            leftIcon={<Heart size={24} color="#7c3aed" />}
            size="lg"
            borderRadius="2xl"
            fontWeight="bold"
            colorScheme="purple"
            variant="outline"
            bg="purple.50"
            shadow="lg"
            _hover={{ shadow: "xl" }}
          >
            Like
          </Button>
          <Button
            onClick={() => navigate(`/schedule/propose/${targetId}`)}
            leftIcon={<Video size={24} />}
            size="lg"
            borderRadius="2xl"
            fontWeight="bold"
            colorScheme="purple"
            shadow="lg"
            _hover={{ shadow: "xl" }}
          >
            Schedule
          </Button>
        </Flex>
      </Container>
    </Box>
  );
}
