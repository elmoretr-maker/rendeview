import React from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Video, MapPin } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { getAbsoluteUrl } from "@/utils/urlHelpers";
import { typicalToAvailabilityGrid } from "@/components/AvailabilityGrid";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Avatar,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Badge,
  Flex,
  Wrap,
  Grid,
  GridItem,
} from "@chakra-ui/react";

const TIER_DISPLAY_NAMES = {
  free: "Free",
  casual: "Casual",
  dating: "Dating",
  business: "Business",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = [
  { label: "Morning", value: "morning", time: "9am-12pm" },
  { label: "Afternoon", value: "afternoon", time: "12pm-5pm" },
  { label: "Evening", value: "evening", time: "5pm-9pm" },
];

export default function ProfilePreview() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile-preview"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
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
  const photos = media.filter((m) => m.type === "photo");
  const video = media.find((m) => m.type === "video");
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  
  const availabilityGrid = user?.typical_availability?.typical 
    ? typicalToAvailabilityGrid(user.typical_availability.typical)
    : {};
  const hasAvailability = Object.values(availabilityGrid).some(Boolean);

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
          <Text color="red.500">Session expired. Please sign in.</Text>
        </Container>
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <Text color="red.500">Could not load profile</Text>
        </Container>
      </Box>
    );
  }

  const tierDisplay = TIER_DISPLAY_NAMES[user?.membership_tier] || "Free";

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" px={4} py={4}>
        <Button
          onClick={() => navigate("/profile")}
          variant="ghost"
          leftIcon={<ArrowLeft size={20} />}
          colorScheme="purple"
          mb={4}
        >
          Back to Edit Profile
        </Button>

        <Card shadow="md" overflow="hidden">
          <CardHeader bg="purple.50" borderBottomWidth="1px">
            <Heading size="lg" color="purple.700">
              Profile Preview
            </Heading>
            <Text fontSize="sm" mt={1} color="gray.700">
              This is how other users see your profile
            </Text>
          </CardHeader>

          <CardBody p={6}>
            <HStack align="start" spacing={4} mb={6}>
              <Avatar
                size="xl"
                src={user.primary_photo_url ? getAbsoluteUrl(user.primary_photo_url) : undefined}
                name={user.name || "?"}
                bg="gray.200"
              />
              <VStack align="start" flex={1} spacing={1}>
                <HStack spacing={2}>
                  <Heading size="lg" color="gray.800">
                    {user.name || "No name"}
                  </Heading>
                  {user.immediate_available && !user.availability_override && (
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bg="teal.500"
                      title="Online"
                    />
                  )}
                </HStack>
                <Badge colorScheme="purple">
                  {tierDisplay}
                </Badge>
                {user.location && (
                  <HStack spacing={1} mt={2}>
                    <MapPin size={14} color="#7c3aed" />
                    <Text color="gray.600" fontSize="sm">
                      {user.location}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </HStack>

            {user.bio && (
              <Box mb={6}>
                <Heading size="sm" mb={2} color="gray.800">
                  About
                </Heading>
                <Text color="gray.700">{user.bio}</Text>
              </Box>
            )}

            {video && (
              <Box mb={6}>
                <HStack spacing={2} mb={2}>
                  <Video size={20} color="#7c3aed" />
                  <Heading size="sm" color="gray.800">
                    Video Introduction
                  </Heading>
                </HStack>
                <Box
                  as="video"
                  src={getAbsoluteUrl(video.url)}
                  controls
                  w="full"
                  borderRadius="lg"
                  maxH="300px"
                />
              </Box>
            )}

            {photos.length > 0 && (
              <Box mb={6}>
                <Heading size="sm" mb={2} color="gray.800">
                  Photos ({photos.length})
                </Heading>
                <SimpleGrid columns={3} spacing={2}>
                  {photos.map((photo, idx) => (
                    <Box
                      key={idx}
                      as="img"
                      src={getAbsoluteUrl(photo.url)}
                      alt={`Photo ${idx + 1}`}
                      w="full"
                      aspectRatio={1}
                      objectFit="cover"
                      borderRadius="lg"
                    />
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {interests.length > 0 && (
              <Box mb={6}>
                <Heading size="sm" mb={2} color="gray.800">
                  Interests
                </Heading>
                <Wrap spacing={2}>
                  {interests.map((interest, idx) => (
                    <Badge key={idx} colorScheme="purple" fontSize="sm">
                      {interest}
                    </Badge>
                  ))}
                </Wrap>
              </Box>
            )}

            {(user.gender || user.sexual_orientation || user.looking_for || user.relationship_goals || user.height_range || user.body_type || user.education) && (
              <Box mb={6}>
                <Heading size="sm" mb={3} color="gray.800">
                  Personal Details
                </Heading>
                <SimpleGrid columns={2} spacing={3}>
                  {user.gender && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Gender</Text>
                      <Text color="gray.800">{user.gender}</Text>
                    </Box>
                  )}
                  {user.sexual_orientation && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Orientation</Text>
                      <Text color="gray.800">{user.sexual_orientation}</Text>
                    </Box>
                  )}
                  {user.looking_for && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Looking For</Text>
                      <Text color="gray.800">{user.looking_for}</Text>
                    </Box>
                  )}
                  {user.relationship_goals && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Relationship Goals</Text>
                      <Text color="gray.800">{user.relationship_goals}</Text>
                    </Box>
                  )}
                  {user.height_range && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Height</Text>
                      <Text color="gray.800">{user.height_range}</Text>
                    </Box>
                  )}
                  {user.body_type && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Body Type</Text>
                      <Text color="gray.800">{user.body_type}</Text>
                    </Box>
                  )}
                  {user.education && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Education</Text>
                      <Text color="gray.800">{user.education}</Text>
                    </Box>
                  )}
                </SimpleGrid>
              </Box>
            )}

            {(user.drinking || user.smoking || user.exercise || user.religion || user.children_preference || user.pets) && (
              <Box mb={6}>
                <Heading size="sm" mb={3} color="gray.800">
                  Lifestyle
                </Heading>
                <SimpleGrid columns={2} spacing={3}>
                  {user.drinking && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Drinking</Text>
                      <Text color="gray.800">{user.drinking}</Text>
                    </Box>
                  )}
                  {user.smoking && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Smoking</Text>
                      <Text color="gray.800">{user.smoking}</Text>
                    </Box>
                  )}
                  {user.exercise && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Exercise</Text>
                      <Text color="gray.800">{user.exercise}</Text>
                    </Box>
                  )}
                  {user.religion && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Religion</Text>
                      <Text color="gray.800">{user.religion}</Text>
                    </Box>
                  )}
                  {user.children_preference && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Children</Text>
                      <Text color="gray.800">{user.children_preference}</Text>
                    </Box>
                  )}
                  {user.pets && (
                    <Box>
                      <Text fontSize="sm" color="gray.500">Pets</Text>
                      <Text color="gray.800">{user.pets}</Text>
                    </Box>
                  )}
                </SimpleGrid>
              </Box>
            )}

            {hasAvailability && (
              <Box>
                <Heading size="sm" mb={3} color="gray.800">
                  Typical Availability
                </Heading>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Times when they're typically available for video chats
                </Text>
                <Box overflowX="auto">
                  <Grid
                    templateColumns={`120px repeat(${TIME_SLOTS.length}, 1fr)`}
                    gap={2}
                    minW="500px"
                  >
                    <GridItem />
                    {TIME_SLOTS.map((slot) => (
                      <GridItem key={slot.value} textAlign="center">
                        <VStack spacing={0}>
                          <Text fontWeight="semibold" fontSize="xs" color="gray.800">
                            {slot.label}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {slot.time}
                          </Text>
                        </VStack>
                      </GridItem>
                    ))}

                    {DAYS.map((day) => {
                      const hasAnySlot = TIME_SLOTS.some(
                        (slot) => availabilityGrid[`${day}-${slot.value}`] === true
                      );
                      if (!hasAnySlot) return null;
                      
                      return (
                        <React.Fragment key={day}>
                          <GridItem display="flex" alignItems="center">
                            <Text fontWeight="medium" fontSize="sm" color="gray.700">
                              {day}
                            </Text>
                          </GridItem>
                          {TIME_SLOTS.map((slot) => {
                            const isAvailable = availabilityGrid[`${day}-${slot.value}`];
                            return (
                              <GridItem key={`${day}-${slot.value}`}>
                                <Box
                                  w="full"
                                  h="10"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  borderRadius="md"
                                  bg={isAvailable ? "purple.500" : "gray.100"}
                                  color={isAvailable ? "white" : "gray.300"}
                                  fontWeight="bold"
                                  fontSize="lg"
                                >
                                  {isAvailable ? "✓" : ""}
                                </Box>
                              </GridItem>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </Grid>
                </Box>
              </Box>
            )}
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
