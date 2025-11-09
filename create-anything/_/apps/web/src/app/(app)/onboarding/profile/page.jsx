import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, X, Trash2, Video, PlayCircle, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  Input,
  Select,
  Textarea,
  Text,
  Tag,
  TagLabel,
  TagCloseButton,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  VStack,
  HStack,
  Flex,
  IconButton,
  Badge,
  Divider,
  AspectRatio,
  useDisclosure,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { getTierLimits, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import AvailabilityGrid, { availabilityGridToTypical, typicalToAvailabilityGrid } from "@/components/AvailabilityGrid";
import LocationSettings from "@/components/LocationSettings";
import { containsExternalContact, PHONE_NUMBER_SECURITY_MESSAGE } from "@/utils/safetyFilters";

const COLORS = {
  primary: "#5B3BAF",
  primaryHover: "#4A2E91",
  secondary: "#8B5CF6",
  text: "#1F2937",
  textLight: "#6B7280",
  error: "#EF4444",
  success: "#10B981",
  lightGray: "#F9FAFB",
  white: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
};

const INTERESTS_CONFIG = {
  MIN_REQUIRED: 3,
  MAX_ALLOWED: 10,
  OPTIONS: [
    'Anime', 'Astronomy', 'Astrology', 'BBQ & Grilling', 'Basketball', 'Baking', 
    'Beach', 'Board Games', 'Camping', 'Career Development', 'Cars & Motorcycles',
    'Chess', 'Clubbing', 'Coffee', 'Comics & Manga', 'Concerts', 'Cooking',
    'Craft Beer', 'Crafts', 'Crossword Puzzles', 'Cycling', 'DIY Projects',
    'Dance', 'Drawing', 'Entrepreneurship', 'Fashion', 'Festivals', 'Film & Movies',
    'Fishing', 'Foodie', 'Gardening', 'Gaming', 'Golf', 'Gym', 'Hiking',
    'History', 'Home Brewing', 'Interior Design', 'Investing', 'Karaoke',
    'Kayaking', 'Languages', 'Live Music', 'Magic Tricks', 'Martial Arts',
    'Meditation', 'Minimalism', 'Mountain Climbing', 'Music', 'Nature Walks',
    'Networking', 'Networking Events', 'Painting', 'Pets & Animals', 'Philosophy',
    'Photography', 'Playing Instrument', 'Podcasts', 'Poetry', 'Politics',
    'Psychology', 'Public Speaking', 'Reading', 'Restaurant Hopping', 'Road Trips',
    'Rock Climbing', 'Running', 'Science', 'Sculpting', 'Self-improvement',
    'Singing', 'Skiing', 'Sneakers', 'Snowboarding', 'Soccer', 'Stand-up Comedy',
    'Streaming', 'Surfing', 'Sustainable Living', 'Swimming', 'Tech & Startups',
    'Tennis', 'Theater', 'Thrift Shopping', 'Travel', 'Trivia Nights',
    'Vegan Cooking', 'Video Games', 'Vintage Collecting', 'Volleyball',
    'Volunteering', 'Wine Bars', 'Wine Tasting', 'Writing', 'Yoga'
  ]
};

const PREFERENCE_OPTIONS = {
  GENDER: ['Man', 'Woman', 'Non-binary', 'Genderqueer', 'Genderfluid', 'Agender', 'Prefer not to say'],
  SEXUAL_ORIENTATION: ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Demisexual', 'Queer', 'Questioning', 'Prefer not to say'],
  LOOKING_FOR: ['Men', 'Women', 'Non-binary people', 'Everyone'],
  BODY_TYPE: ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'A few extra pounds', 'Plus size', 'Prefer not to say'],
  HEIGHT_RANGES: ['Under 150cm (4\'11")', '150-160cm (4\'11"-5\'3")', '160-170cm (5\'3"-5\'7")', '170-180cm (5\'7"-5\'11")', '180-190cm (5\'11"-6\'3")', '190-200cm (6\'3"-6\'7")', 'Over 200cm (6\'7")', 'Prefer not to say'],
  EDUCATION: ['High school', 'Some college', 'Associate degree', 'Bachelor\'s degree', 'Master\'s degree', 'Doctorate/PhD', 'Trade school', 'Prefer not to say'],
  RELATIONSHIP_GOALS: ['Casual dating', 'Long-term relationship', 'Marriage', 'Friendship', 'Networking', 'Not sure yet', 'Prefer not to say'],
  DRINKING: ['Never', 'Rarely', 'Socially', 'Regularly', 'Prefer not to say'],
  SMOKING: ['Never', 'Rarely', 'Socially', 'Regularly', 'Trying to quit', 'Prefer not to say'],
  EXERCISE: ['Never', 'Rarely', '1-2 times/week', '3-4 times/week', '5+ times/week', 'Daily', 'Prefer not to say'],
  RELIGION: ['Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Other', 'Prefer not to say'],
  CHILDREN: ['Have children', 'Don\'t have, want someday', 'Don\'t have, don\'t want', 'Don\'t have, open to it', 'Prefer not to say'],
  PETS: ['Dog(s)', 'Cat(s)', 'Both dogs and cats', 'Other pets', 'No pets', 'Want pets', 'Allergic to pets', 'Prefer not to say']
};

function ConsolidatedProfileOnboardingContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [newInterest, setNewInterest] = useState("");
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Preference fields
  const [gender, setGender] = useState("");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [heightRange, setHeightRange] = useState("");
  const [education, setEducation] = useState("");
  const [relationshipGoals, setRelationshipGoals] = useState("");
  const [drinking, setDrinking] = useState("");
  const [smoking, setSmoking] = useState("");
  const [exercise, setExercise] = useState("");
  const [religion, setReligion] = useState("");
  const [childrenPreference, setChildrenPreference] = useState("");
  const [pets, setPets] = useState("");
  const [showPreferenceModal, setShowPreferenceModal] = useState(null);
  
  // Location preferences
  const [maxDistance, setMaxDistance] = useState(100);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  
  // Availability grid
  const [availabilityGrid, setAvailabilityGrid] = useState({});

  const totalSteps = 4;
  const stepIndex = 4;
  const progressPct = (stepIndex / totalSteps) * 100;

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) {
        if (res.status === 401) {
          return { user: {}, media: [] };
        }
        throw new Error("Failed to load profile");
      }
      return res.json();
    },
    retry: false,
  });

  const user = profileData?.user || {};
  const media = profileData?.media || [];
  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");
  const membershipTier = user.membership_tier || MEMBERSHIP_TIERS.FREE;
  const limits = getTierLimits(membershipTier);

  useEffect(() => {
    if (user.name) setName(user.name);
    if (user.bio) setBio(user.bio);
    if (user.interests && Array.isArray(user.interests)) setInterests(user.interests);
    
    if (user.gender) setGender(user.gender);
    if (user.sexual_orientation) setSexualOrientation(user.sexual_orientation);
    if (user.looking_for) setLookingFor(user.looking_for);
    if (user.body_type) setBodyType(user.body_type);
    if (user.height_range) setHeightRange(user.height_range);
    if (user.education) setEducation(user.education);
    if (user.relationship_goals) setRelationshipGoals(user.relationship_goals);
    if (user.drinking) setDrinking(user.drinking);
    if (user.smoking) setSmoking(user.smoking);
    if (user.exercise) setExercise(user.exercise);
    if (user.religion) setReligion(user.religion);
    if (user.children_preference) setChildrenPreference(user.children_preference);
    if (user.pets) setPets(user.pets);
    
    if (typeof user.max_distance === 'number') setMaxDistance(user.max_distance);
    if (user.latitude != null) setLatitude(user.latitude);
    if (user.longitude != null) setLongitude(user.longitude);
    
    if (user.typical_availability) {
      setAvailabilityGrid(typicalToAvailabilityGrid(user.typical_availability));
    }
  }, [user]);

  const handlePhotoUpload = useCallback(async () => {
    if (photos.length >= limits.photos) {
      toast.error(`Photo limit reached (${limits.photos} max). Upgrade to add more!`);
      throw new Error("Photo limit reached");
    }

    try {
      const res = await fetch("/api/objects/upload", { method: "POST" });
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to get upload URL");
        throw new Error("Upload URL request failed");
      }
      const data = await res.json();
      return { method: "PUT", url: data.uploadURL };
    } catch (e) {
      console.error(e);
      if (e.message !== "Photo limit reached") {
        toast.error("Failed to initiate upload");
      }
      throw e;
    }
  }, [photos.length, limits.photos]);

  const handlePhotoStart = useCallback(() => {
    setUploadingPhoto(true);
  }, []);

  const handlePhotoComplete = useCallback(
    async (result) => {
      try {
        if (result.successful && result.successful.length > 0) {
          const uploadURL = result.successful[0].uploadURL;
          const res = await fetch("/api/profile/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaURL: uploadURL, type: "photo" }),
          });
          if (!res.ok) throw new Error("Failed to save photo");
          toast.success("Photo uploaded successfully!");
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to save photo");
      } finally {
        setUploadingPhoto(false);
      }
    },
    [queryClient]
  );

  const handlePhotoError = useCallback((error) => {
    console.error("Upload error:", error);
    toast.error("Failed to upload photo");
    setUploadingPhoto(false);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async ({ mediaUrl }) => {
      const res = await fetch(`/api/profile/media?url=${encodeURIComponent(mediaUrl)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Media deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Failed to delete media"),
  });

  const addInterest = () => {
    if (newInterest.trim() && interests.length < 10) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest("");
    }
  };

  const removeInterest = (index) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const handleContinue = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (photos.length < 2) {
      toast.error("Please upload at least 2 photos");
      return;
    }
    if (interests.length < INTERESTS_CONFIG.MIN_REQUIRED) {
      toast.error(`Please select at least ${INTERESTS_CONFIG.MIN_REQUIRED} interests`);
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(), 
          bio: bio.trim(), 
          interests: interests,
          gender: gender || null,
          sexual_orientation: sexualOrientation || null,
          looking_for: lookingFor || null,
          body_type: bodyType || null,
          height_range: heightRange || null,
          education: education || null,
          relationship_goals: relationshipGoals || null,
          drinking: drinking || null,
          smoking: smoking || null,
          exercise: exercise || null,
          religion: religion || null,
          children_preference: childrenPreference || null,
          pets: pets || null,
          max_distance: maxDistance,
          latitude: latitude,
          longitude: longitude,
          typical_availability: availabilityGridToTypical(availabilityGrid),
        }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      toast.success("Profile saved!");
      navigate("/discovery");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.lg" py={8}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  const meetsRequirements = name.trim() && photos.length >= 2 && interests.length >= INTERESTS_CONFIG.MIN_REQUIRED;

  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="white" borderBottom="1px" borderColor="gray.200" position="sticky" top={0} zIndex={10}>
        <Container maxW="container.lg" py={4}>
          <Flex alignItems="center" gap={4} mb={2}>
            <IconButton
              icon={<ArrowLeft />}
              variant="ghost"
              onClick={() => navigate("/onboarding/membership")}
              aria-label="Back to membership"
            />
            <Box flex={1}>
              <Heading size="md" color="gray.800">Complete Your Profile</Heading>
              <Text fontSize="sm" color="gray.600">Step {stepIndex} of {totalSteps}</Text>
            </Box>
          </Flex>
          <Progress value={progressPct} colorScheme="purple" size="sm" borderRadius="full" />
        </Container>
      </Box>

      <Container maxW="container.lg" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <Heading size="lg" color="gray.800">Basic Information</Heading>
              <Text color="gray.600" mt={2}>Tell us about yourself. The more you share, the more likely you are to find a great match for your profile.</Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={6} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontWeight="semibold" color="gray.700">Name</FormLabel>
                  <Input
                    variant="filled"
                    size="lg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    focusBorderColor="brand.500"
                    _hover={{ bg: "gray.100" }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontWeight="semibold" color="gray.700">Bio</FormLabel>
                  <Textarea
                    variant="filled"
                    size="lg"
                    value={bio}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (containsExternalContact(newValue)) {
                        toast.error(PHONE_NUMBER_SECURITY_MESSAGE);
                        return;
                      }
                      setBio(newValue);
                    }}
                    placeholder="Tell us about yourself. The more you share, the more likely you are to find a great match for your profile."
                    rows={4}
                    maxLength={2000}
                    focusBorderColor="brand.500"
                    _hover={{ bg: "gray.100" }}
                  />
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    {bio.length}/2000 characters
                  </Text>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="semibold" color="gray.700">
                    Interests & Hobbies {interests.length >= INTERESTS_CONFIG.MIN_REQUIRED && <Badge colorScheme="green" ml={2}>✓ {interests.length} selected</Badge>}
                  </FormLabel>
                  <Button
                    onClick={() => setShowInterestsModal(true)}
                    colorScheme="purple"
                    variant="outline"
                    size="lg"
                    width="full"
                    leftIcon={<Plus size={20} />}
                  >
                    Choose from {INTERESTS_CONFIG.OPTIONS.length} interests
                  </Button>

                  {interests.length > 0 && (
                    <Wrap mt={4} spacing={2}>
                      {interests.map((interest, idx) => (
                        <WrapItem key={idx}>
                          <Tag size="lg" colorScheme="gray" borderRadius="full">
                            <TagLabel>{interest}</TagLabel>
                            <TagCloseButton onClick={() => removeInterest(idx)} />
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  )}

                  <Flex justifyContent="space-between" mt={2}>
                    <Text fontSize="sm" color={interests.length >= INTERESTS_CONFIG.MIN_REQUIRED ? "green.500" : "gray.500"}>
                      {interests.length >= INTERESTS_CONFIG.MIN_REQUIRED ? `✓ ${interests.length} interests selected` : `${interests.length}/${INTERESTS_CONFIG.MIN_REQUIRED} required`}
                    </Text>
                    <Text fontSize="sm" color="gray.500">Max {INTERESTS_CONFIG.MAX_ALLOWED}</Text>
                  </Flex>
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* Photos Card */}
          <Card>
            <CardHeader>
              <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                <Box>
                  <Heading size="lg" color="gray.800">
                    Profile Photos <Badge colorScheme="red" ml={2}>Required</Badge>
                  </Heading>
                  <Text color={photos.length >= 2 ? "green.500" : "gray.600"} mt={2} fontWeight="medium">
                    {photos.length >= 2 ? `✓ ${photos.length} photos uploaded` : `${photos.length}/2 required (${2 - photos.length} more needed)`}
                  </Text>
                </Box>
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  allowedFileTypes={["image/*"]}
                  onGetUploadParameters={handlePhotoUpload}
                  onUploadStart={handlePhotoStart}
                  onComplete={handlePhotoComplete}
                  onUploadError={handlePhotoError}
                  buttonClassName="px-6 py-3.5 rounded-xl text-white font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity text-base whitespace-nowrap"
                  buttonStyle={{ backgroundColor: COLORS.primary }}
                  disabled={uploadingPhoto || photos.length >= limits.photos}
                >
                  <Upload size={20} />
                  {uploadingPhoto ? "Uploading..." : "Add Photo"}
                </ObjectUploader>
              </Flex>
            </CardHeader>
            <CardBody>
              {photos.length === 0 ? (
                <Box textAlign="center" py={12} px={4} borderRadius="xl" border="2px dashed" borderColor="gray.300" bg="gray.50">
                  <Upload size={56} color="gray" style={{ margin: "0 auto", opacity: 0.3, marginBottom: "1rem" }} />
                  <Text fontWeight="semibold" fontSize="lg" mb={1} color="gray.700">No photos yet</Text>
                  <Text fontSize="sm" color="gray.500">Click "Add Photo" above to get started</Text>
                </Box>
              ) : (
                <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
                  {photos.map((photo, idx) => (
                    <GridItem key={idx}>
                      <Box position="relative" borderRadius="xl" overflow="hidden" shadow="sm" role="group">
                        <AspectRatio ratio={1}>
                          <img src={photo.url} alt={`Photo ${idx + 1}`} style={{ objectFit: "cover" }} />
                        </AspectRatio>
                        <Box
                          position="absolute"
                          bottom={0}
                          left={0}
                          right={0}
                          bg="linear-gradient(to top, rgba(0,0,0,0.7), transparent)"
                          p={3}
                        >
                          <Text color="white" fontSize="sm" fontWeight="medium">Photo {idx + 1}</Text>
                        </Box>
                        <IconButton
                          icon={<Trash2 size={16} />}
                          colorScheme="red"
                          position="absolute"
                          top={2}
                          right={2}
                          size="sm"
                          borderRadius="full"
                          opacity={0}
                          _groupHover={{ opacity: 1 }}
                          onClick={() => deleteMutation.mutate({ mediaUrl: photo.url })}
                          isLoading={deleteMutation.isPending}
                          aria-label="Delete photo"
                        />
                      </Box>
                    </GridItem>
                  ))}
                  {uploadingPhoto && (
                    <GridItem>
                      <Box borderRadius="xl" bg="gray.100" display="flex" alignItems="center" justifyContent="center" aspectRatio={1}>
                        <VStack>
                          <Box
                            as="span"
                            display="inline-block"
                            w="40px"
                            h="40px"
                            border="3px solid"
                            borderColor="gray.200"
                            borderBottomColor="brand.500"
                            borderRadius="full"
                            animation="spin 1s linear infinite"
                            sx={{
                              '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                              },
                            }}
                          />
                          <Text fontSize="sm" fontWeight="medium" color="gray.600" mt={3}>Uploading...</Text>
                        </VStack>
                      </Box>
                    </GridItem>
                  )}
                </Grid>
              )}
              <Text fontSize="sm" mt={4} color="gray.500">
                {photos.length >= limits.photos 
                  ? `✓ Photo limit reached (${limits.photos}/${limits.photos})` 
                  : `Upload up to ${limits.photos} photos • At least 2 required`}
              </Text>
            </CardBody>
          </Card>

          {/* Videos Card */}
          <Card>
            <CardHeader>
              <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                <Box>
                  <Heading size="lg" color="gray.800">Video Introduction</Heading>
                  <Text color="gray.600" mt={2} fontWeight="medium">
                    {videos.length > 0 ? `✓ ${videos.length} video uploaded` : 'Optional • Stand out with a video'}
                  </Text>
                </Box>
                <Button
                  onClick={() => setShowVideoRecorder(true)}
                  isDisabled={videos.length >= limits.videos}
                  colorScheme="purple"
                  size="lg"
                  leftIcon={<Camera size={20} />}
                >
                  Record Video
                </Button>
              </Flex>
            </CardHeader>
            <CardBody>
              {videos.length === 0 ? (
                <Box textAlign="center" py={12} px={4} borderRadius="xl" border="2px dashed" borderColor="gray.300" bg="gray.50">
                  <Video size={56} color="gray" style={{ margin: "0 auto", opacity: 0.3, marginBottom: "1rem" }} />
                  <Text fontWeight="semibold" fontSize="lg" mb={1} color="gray.700">No video yet</Text>
                  <Text fontSize="sm" color="gray.500">Record a short intro to stand out</Text>
                  <Text fontSize="xs" mt={2} color="gray.400">Camera-only recording prevents catfishing</Text>
                </Box>
              ) : (
                <VStack spacing={4}>
                  {videos.map((video, idx) => (
                    <Box key={idx} position="relative" borderRadius="xl" overflow="hidden" shadow="sm" bg="black" w="full" role="group">
                      <video src={video.url} controls style={{ width: "100%", height: "256px", objectFit: "contain" }} />
                      <IconButton
                        icon={<Trash2 size={18} />}
                        colorScheme="red"
                        position="absolute"
                        top={3}
                        right={3}
                        size="md"
                        borderRadius="full"
                        opacity={0}
                        _groupHover={{ opacity: 1 }}
                        onClick={() => deleteMutation.mutate({ mediaUrl: video.url })}
                        isLoading={deleteMutation.isPending}
                        aria-label="Delete video"
                      />
                    </Box>
                  ))}
                </VStack>
              )}
              <Text fontSize="sm" mt={4} color="gray.500">
                Max duration: {Math.floor(limits.videoMaxDuration / 60)}:{String(limits.videoMaxDuration % 60).padStart(2, "0")} minutes
              </Text>
            </CardBody>
          </Card>

          {/* Preferences Card */}
          <Card>
            <CardHeader>
              <Heading size="lg" color="gray.800">About You & Preferences</Heading>
              <Text color="gray.600" mt={2}>
                Share more details to find better matches <Badge ml={2} colorScheme="gray">optional</Badge>
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={6} align="stretch">
                {/* Location Settings */}
                <Box pb={6} borderBottom="1px" borderColor="gray.200">
                  <LocationSettings
                    initialLatitude={latitude}
                    initialLongitude={longitude}
                    initialMaxDistance={maxDistance}
                    onSave={(newLatitude, newLongitude, newMaxDistance) => {
                      setLatitude(newLatitude);
                      setLongitude(newLongitude);
                      setMaxDistance(newMaxDistance);
                    }}
                  />
                </Box>

                {/* Availability Grid */}
                <Box pb={6} borderBottom="1px" borderColor="gray.200">
                  <FormControl>
                    <FormLabel fontWeight="semibold" color="gray.700">
                      When are you typically available?
                    </FormLabel>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      Help others know the best times to schedule video chats with you
                    </Text>
                    <AvailabilityGrid value={availabilityGrid} onChange={setAvailabilityGrid} />
                  </FormControl>
                </Box>

                {/* Preference Fields Grid */}
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                  {[
                    { label: "Gender", value: gender, setter: setGender, options: PREFERENCE_OPTIONS.GENDER },
                    { label: "Sexual Orientation", value: sexualOrientation, setter: setSexualOrientation, options: PREFERENCE_OPTIONS.SEXUAL_ORIENTATION },
                    { label: "Looking For", value: lookingFor, setter: setLookingFor, options: PREFERENCE_OPTIONS.LOOKING_FOR },
                    { label: "Body Type", value: bodyType, setter: setBodyType, options: PREFERENCE_OPTIONS.BODY_TYPE },
                    { label: "Height", value: heightRange, setter: setHeightRange, options: PREFERENCE_OPTIONS.HEIGHT_RANGES },
                    { label: "Education", value: education, setter: setEducation, options: PREFERENCE_OPTIONS.EDUCATION },
                    { label: "Relationship Goals", value: relationshipGoals, setter: setRelationshipGoals, options: PREFERENCE_OPTIONS.RELATIONSHIP_GOALS },
                    { label: "Drinking", value: drinking, setter: setDrinking, options: PREFERENCE_OPTIONS.DRINKING },
                    { label: "Smoking", value: smoking, setter: setSmoking, options: PREFERENCE_OPTIONS.SMOKING },
                    { label: "Exercise", value: exercise, setter: setExercise, options: PREFERENCE_OPTIONS.EXERCISE },
                    { label: "Religion", value: religion, setter: setReligion, options: PREFERENCE_OPTIONS.RELIGION },
                    { label: "Children", value: childrenPreference, setter: setChildrenPreference, options: PREFERENCE_OPTIONS.CHILDREN },
                    { label: "Pets", value: pets, setter: setPets, options: PREFERENCE_OPTIONS.PETS },
                  ].map((field, idx) => (
                    <FormControl key={idx}>
                      <FormLabel fontWeight="semibold" color="gray.700">{field.label}</FormLabel>
                      <Select
                        variant="filled"
                        size="lg"
                        value={field.value}
                        onChange={(e) => field.setter(e.target.value)}
                        placeholder={`Select ${field.label.toLowerCase()}`}
                        focusBorderColor="brand.500"
                        _hover={{ bg: "gray.100" }}
                        color={field.value ? "gray.800" : "gray.500"}
                      >
                        {field.options.map((option, optIdx) => (
                          <option key={optIdx} value={option}>{option}</option>
                        ))}
                      </Select>
                    </FormControl>
                  ))}
                </Grid>
              </VStack>
            </CardBody>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleContinue}
            isDisabled={!meetsRequirements}
            isLoading={saving}
            loadingText="Saving Your Profile..."
            colorScheme="purple"
            size="lg"
            fontSize="lg"
            fontWeight="bold"
            py={7}
            shadow="lg"
            _hover={{ shadow: "xl" }}
          >
            {saving ? "Saving Your Profile..." : "Complete Profile Setup"}
          </Button>

          <Text fontSize="sm" textAlign="center" color="gray.500">
            <Badge colorScheme="red" mr={1}>*</Badge> Required fields
          </Text>
        </VStack>
      </Container>

      {showVideoRecorder && (
        <VideoRecorderModal
          onClose={() => setShowVideoRecorder(false)}
          maxDuration={limits.videoMaxDuration}
          onComplete={() => {
            setShowVideoRecorder(false);
            queryClient.invalidateQueries({ queryKey: ["profile"] });
          }}
        />
      )}

      {showInterestsModal && (
        <InterestsModal
          selectedInterests={interests}
          onSelect={(newInterests) => {
            setInterests(newInterests);
            setShowInterestsModal(false);
          }}
          onClose={() => setShowInterestsModal(false)}
        />
      )}
    </Box>
  );
}

function InterestsModal({ selectedInterests, onSelect, onClose }) {
  const [tempSelected, setTempSelected] = useState([...selectedInterests]);

  const toggleInterest = (interest) => {
    if (tempSelected.includes(interest)) {
      setTempSelected(tempSelected.filter(i => i !== interest));
    } else {
      if (tempSelected.length < INTERESTS_CONFIG.MAX_ALLOWED) {
        setTempSelected([...tempSelected, interest]);
      } else {
        toast.error(`Maximum ${INTERESTS_CONFIG.MAX_ALLOWED} interests allowed`);
      }
    }
  };

  const meetsMinimum = tempSelected.length >= INTERESTS_CONFIG.MIN_REQUIRED;

  return (
    <Modal isOpen={true} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg" color="gray.800">Choose Your Interests</Heading>
          <Text fontSize="md" color="gray.600" fontWeight="normal" mt={2}>
            Select at least {INTERESTS_CONFIG.MIN_REQUIRED} interests for better matches
          </Text>
          <Flex gap={4} mt={4}>
            <Text fontSize="lg" fontWeight="semibold" color={meetsMinimum ? "green.500" : "gray.500"}>
              {meetsMinimum ? `✓ ${tempSelected.length} selected` : `${tempSelected.length}/${INTERESTS_CONFIG.MIN_REQUIRED} required`}
            </Text>
            <Text fontSize="sm" color="gray.500" alignSelf="center">Max {INTERESTS_CONFIG.MAX_ALLOWED}</Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody bg="gray.50">
          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" }} gap={3}>
            {INTERESTS_CONFIG.OPTIONS.map((interest) => {
              const isSelected = tempSelected.includes(interest);
              return (
                <Button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  colorScheme={isSelected ? "purple" : "gray"}
                  variant={isSelected ? "solid" : "outline"}
                  size="md"
                  fontWeight="semibold"
                  fontSize="sm"
                  _hover={{ transform: "scale(1.05)" }}
                  transition="all 0.2s"
                >
                  {interest}
                </Button>
              );
            })}
          </Grid>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="outline" size="lg" onClick={onClose} flex={1}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            size="lg"
            onClick={() => onSelect(tempSelected)}
            isDisabled={!meetsMinimum}
            flex={1}
          >
            {meetsMinimum ? `Done (${tempSelected.length})` : `Select ${INTERESTS_CONFIG.MIN_REQUIRED - tempSelected.length} more`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function VideoRecorderModal({ onClose, maxDuration, onComplete }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoURL, setRecordedVideoURL] = useState(null);
  const [countdown, setCountdown] = useState(maxDuration);
  const [uploading, setUploading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    let interval;
    if (isRecording && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, countdown]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Camera access denied. Please enable camera and microphone permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startRecording = () => {
    if (!streamRef.current) {
      toast.error("Camera not ready");
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideoURL(url);
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setCountdown(maxDuration);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const redoRecording = () => {
    if (recordedVideoURL) {
      URL.revokeObjectURL(recordedVideoURL);
    }
    setRecordedVideoURL(null);
    setCountdown(maxDuration);
    startCamera();
  };

  const uploadVideo = async () => {
    if (!recordedVideoURL) return;

    try {
      setUploading(true);
      const response = await fetch(recordedVideoURL);
      const blob = await response.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const res = await fetch("/api/upload-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video",
          base64: base64,
          filename: `video-${Date.now()}.webm`,
        }),
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      toast.success("Video uploaded successfully!");
      onComplete();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="2xl">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg" color="gray.800">Record Video Introduction</Heading>
          <Text fontSize="md" color="gray.600" fontWeight="normal" mt={2}>
            Max duration: {formatTime(maxDuration)}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box position="relative" borderRadius="xl" overflow="hidden" bg="black">
            {!recordedVideoURL ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "400px", objectFit: "cover" }}
                />
                {isRecording && (
                  <Box
                    position="absolute"
                    top={4}
                    right={4}
                    bg="red.500"
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontWeight="bold"
                  >
                    ● {formatTime(countdown)}
                  </Box>
                )}
                {!hasPermission && (
                  <Box
                    position="absolute"
                    inset={0}
                    bg="blackAlpha.800"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color="white" fontSize="lg">Requesting camera access...</Text>
                  </Box>
                )}
              </>
            ) : (
              <video src={recordedVideoURL} controls style={{ width: "100%", height: "400px", objectFit: "contain" }} />
            )}
          </Box>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="outline" onClick={onClose} size="lg">
            Cancel
          </Button>
          {!recordedVideoURL ? (
            <>
              {!isRecording ? (
                <Button
                  colorScheme="red"
                  onClick={startRecording}
                  isDisabled={!hasPermission}
                  leftIcon={<Camera size={20} />}
                  size="lg"
                >
                  Start Recording
                </Button>
              ) : (
                <Button colorScheme="red" onClick={stopRecording} size="lg">
                  Stop Recording
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={redoRecording} size="lg">
                Redo
              </Button>
              <Button
                colorScheme="purple"
                onClick={uploadVideo}
                isLoading={uploading}
                loadingText="Uploading..."
                size="lg"
              >
                Upload Video
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default function ConsolidatedProfileOnboarding() {
  return (
    <OnboardingGuard allowUnauthenticated={true}>
      <ConsolidatedProfileOnboardingContent />
    </OnboardingGuard>
  );
}
