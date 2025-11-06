import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import useUser from "@/utils/useUser";
import useAuth from "@/utils/useAuth";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SessionExpired from "@/components/SessionExpired";
import { ObjectUploader } from "@/components/ObjectUploader";
import AvailabilityGrid, { availabilityGridToTypical, typicalToAvailabilityGrid } from "@/components/AvailabilityGrid";
import LocationSettings from "@/components/LocationSettings";
import { Trash2, Upload, Crown, Image as ImageIcon, Video as VideoIcon, Plus, X } from "lucide-react";
import { getTierLimits, getRemainingPhotoSlots, getRemainingVideoSlots, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { ProfileSkeleton } from "@/app/components/SkeletonLoader";
import { containsExternalContact, PHONE_NUMBER_SECURITY_MESSAGE } from "@/utils/safetyFilters";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Switch,
  Card,
  CardBody,
  Image,
  IconButton,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Grid,
  GridItem,
  useDisclosure,
} from "@chakra-ui/react";

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

function ProfileContent() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("");
  const [availabilityGrid, setAvailabilityGrid] = useState({});
  const [immediate, setImmediate] = useState(false);
  const [override, setOverride] = useState(false);
  const [videoCallAvailable, setVideoCallAvailable] = useState(true);
  const [media, setMedia] = useState([]);
  const [primaryPhoto, setPrimaryPhoto] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [membershipTier, setMembershipTier] = useState(MEMBERSHIP_TIERS.FREE);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [maxDistance, setMaxDistance] = useState(100);
  
  const [interests, setInterests] = useState([]);
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
  
  const { isOpen: isInterestsOpen, onOpen: onInterestsOpen, onClose: onInterestsClose } = useDisclosure();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          setError("AUTH_401");
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        const u = data.user || {};
        setName(u.name || "");
        setBio(u.bio || "");
        setImmediate(!!u.immediate_available);
        setOverride(!!u.availability_override);
        setVideoCallAvailable(u.video_call_available !== false);
        setPrimaryPhoto(u.primary_photo_url || null);
        setMembershipTier(u.membership_tier || MEMBERSHIP_TIERS.FREE);
        if (u.typical_availability?.timezone) {
          setTimezone(u.typical_availability.timezone);
        }
        const typical = u.typical_availability?.typical;
        if (typical) {
          setAvailabilityGrid(typicalToAvailabilityGrid(typical));
        }
        const m = Array.isArray(data.media) ? data.media : [];
        setMedia(m);
        const vid = m.find((x) => x.type === "video");
        setVideoUrl(vid?.url || null);
        setLatitude(u.latitude ?? null);
        setLongitude(u.longitude ?? null);
        setMaxDistance(u.max_distance ?? 100);
        
        if (u.interests && Array.isArray(u.interests)) setInterests(u.interests);
        setGender(u.gender || "");
        setSexualOrientation(u.sexual_orientation || "");
        setLookingFor(u.looking_for || "");
        setBodyType(u.body_type || "");
        setHeightRange(u.height_range || "");
        setEducation(u.education || "");
        setRelationshipGoals(u.relationship_goals || "");
        setDrinking(u.drinking || "");
        setSmoking(u.smoking || "");
        setExercise(u.exercise || "");
        setReligion(u.religion || "");
        setChildrenPreference(u.children_preference || "");
        setPets(u.pets || "");
      } catch (e) {
        console.error(e);
        setError("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const save = useCallback(async () => {
    try {
      setError(null);
      
      if (bio && containsExternalContact(bio)) {
        toast.error(PHONE_NUMBER_SECURITY_MESSAGE);
        return;
      }
      
      if (interests.length < INTERESTS_CONFIG.MIN_REQUIRED) {
        toast.error(`Please select at least ${INTERESTS_CONFIG.MIN_REQUIRED} interests`);
        return;
      }
      
      const typical = availabilityGridToTypical(availabilityGrid);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          timezone,
          typical,
          immediate_available: immediate,
          availability_override: override,
          video_call_available: videoCallAvailable,
          interests,
          gender,
          sexual_orientation: sexualOrientation,
          looking_for: lookingFor,
          body_type: bodyType,
          height_range: heightRange,
          education,
          relationship_goals: relationshipGoals,
          drinking,
          smoking,
          exercise,
          religion,
          children_preference: childrenPreference,
          pets,
        }),
      });
      if (res.status === 401) {
        setError("AUTH_401");
        toast.error("Session expired. Please sign in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Profile updated");
    } catch (e) {
      console.error(e);
      setError("Could not save");
      toast.error("Could not save profile");
    }
  }, [name, bio, timezone, availabilityGrid, immediate, override, videoCallAvailable, interests, gender, sexualOrientation, lookingFor, bodyType, heightRange, education, relationshipGoals, drinking, smoking, exercise, religion, childrenPreference, pets]);

  const deleteAccount = useCallback(async () => {
    const firstConfirm = window.confirm(
      "⚠️ WARNING: This will permanently delete your account, profile, matches, and all data. This action CANNOT be undone.\n\nAre you absolutely sure?"
    );
    
    if (!firstConfirm) {
      return;
    }

    const userInput = window.prompt(
      'To confirm account deletion, type "CONFIRM" (all caps) below:'
    );

    if (userInput !== "CONFIRM") {
      toast.error("Account deletion cancelled. You must type CONFIRM exactly.");
      return;
    }

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.status === 401) {
        setError("AUTH_401");
        toast.error("Session expired. Please sign in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to delete account");
      toast.success("Account deleted. You will be signed out.");
      setTimeout(() => navigate("/account/signin"), 2000);
    } catch (e) {
      console.error(e);
      toast.error("Could not delete account");
    }
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut({ callbackUrl: "/welcome", redirect: true });
    } catch (e) {
      console.error(e);
      toast.error("Could not sign out");
    }
  }, [signOut]);

  const handleLocationSave = useCallback(async (locationData) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationData),
      });
      if (res.status === 401) {
        setError("AUTH_401");
        toast.error("Session expired. Please sign in.");
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to save location");
      setLatitude(locationData.latitude);
      setLongitude(locationData.longitude);
      setMaxDistance(locationData.max_distance);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, []);

  const selectPrimary = useCallback(async (url) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary_photo_url: url }),
      });
      if (res.status === 401) {
        setError("AUTH_401");
        toast.error("Session expired. Please sign in.");
        return;
      }
      if (!res.ok) throw new Error("Failed to set primary");
      setPrimaryPhoto(url);
      toast.success("Primary photo set");
    } catch (e) {
      console.error(e);
      toast.error("Could not set primary photo");
    }
  }, []);

  const handlePhotoUpload = useCallback(async () => {
    // Check tier limits before upload
    const photoCount = media.filter(m => m.type === 'photo').length;
    const limits = getTierLimits(membershipTier);
    const remaining = getRemainingPhotoSlots(membershipTier, photoCount);
    
    if (remaining <= 0) {
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
  }, [media, membershipTier]);

  const handlePhotoComplete = useCallback(async (result) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        const res = await fetch("/api/profile/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaURL: uploadURL, type: "photo" }),
        });
        if (!res.ok) throw new Error("Failed to save photo");
        const data = await res.json();
        toast.success("Photo uploaded successfully");
        window.location.reload();
      } catch (e) {
        console.error(e);
        toast.error("Failed to save photo");
      }
    }
  }, []);

  const handleVideoUpload = useCallback(async () => {
    // Check tier limits before upload
    const videoCount = media.filter(m => m.type === 'video').length;
    const limits = getTierLimits(membershipTier);
    const remaining = getRemainingVideoSlots(membershipTier, videoCount);
    
    if (remaining <= 0) {
      toast.error(`Video limit reached (${limits.videos} max). Upgrade to add more!`);
      throw new Error("Video limit reached");
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
      if (e.message !== "Video limit reached") {
        toast.error("Failed to initiate upload");
      }
      throw e;
    }
  }, [media, membershipTier]);

  const handleVideoComplete = useCallback(async (result) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        const res = await fetch("/api/profile/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaURL: uploadURL, type: "video" }),
        });
        if (!res.ok) throw new Error("Failed to save video");
        const data = await res.json();
        toast.success("Video uploaded successfully");
        window.location.reload();
      } catch (e) {
        console.error(e);
        toast.error("Failed to save video");
      }
    }
  }, []);

  const deleteMedia = useCallback(async (mediaUrl) => {
    if (!window.confirm("Are you sure you want to delete this media?")) {
      return;
    }
    try {
      const res = await fetch(`/api/profile/media?url=${encodeURIComponent(mediaUrl)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete media");
      toast.success("Media deleted");
      window.location.reload();
    } catch (e) {
      console.error(e);
      toast.error("Could not delete media");
    }
  }, []);

  const addInterest = useCallback((interest) => {
    if (interests.includes(interest)) {
      toast.error("You've already added this interest");
      return;
    }
    if (interests.length >= INTERESTS_CONFIG.MAX_ALLOWED) {
      toast.error(`Maximum ${INTERESTS_CONFIG.MAX_ALLOWED} interests allowed`);
      return;
    }
    setInterests([...interests, interest]);
  }, [interests]);

  const removeInterest = useCallback((interest) => {
    setInterests(interests.filter(i => i !== interest));
  }, [interests]);

  if (loading || userLoading) {
    return (
      <Box minH="100vh" bg="gray.50">
        <AppHeader />
        <Container maxW="2xl" px={4} py={8}>
          <ProfileSkeleton />
        </Container>
      </Box>
    );
  }

  if (error === "AUTH_401") {
    return <SessionExpired />;
  }

  const tierLimits = getTierLimits(membershipTier);
  const photoCount = media.filter(m => m.type === 'photo').length;
  const videoCount = media.filter(m => m.type === 'video').length;
  const remainingPhotos = getRemainingPhotoSlots(membershipTier, photoCount);
  const remainingVideos = getRemainingVideoSlots(membershipTier, videoCount);

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="2xl" px={4} py={8}>
        <VStack align="stretch" spacing={6} mb={6}>
          <Flex align="center" justify="space-between">
            <Heading size="xl" color="gray.800">Profile</Heading>
            <HStack spacing={3}>
              <Button
                as={Link}
                to="/onboarding/membership"
                leftIcon={<Crown size={18} />}
                colorScheme="teal"
                shadow="md"
              >
                {membershipTier?.toUpperCase() || 'FREE'} Tier
              </Button>
              <Button
                onClick={handleSignOut}
                colorScheme="red"
                variant="outline"
                shadow="md"
              >
                Logout
              </Button>
            </HStack>
          </Flex>
          
          <Card
            as={Link}
            to="/profile/media"
            shadow="md"
            _hover={{ shadow: "lg" }}
            transition="all 0.2s"
            cursor="pointer"
          >
            <CardBody p={4}>
              <HStack spacing={3}>
                <Flex
                  w={12}
                  h={12}
                  borderRadius="full"
                  align="center"
                  justify="center"
                  bg="purple.50"
                >
                  <ImageIcon size={24} color="#7c3aed" />
                </Flex>
                <VStack align="start" flex={1} spacing={0}>
                  <Heading size="md" color="gray.800">Manage Photos & Videos</Heading>
                  <Text fontSize="sm" color="gray.600">Upload, record, and organize your media with camera-only recording</Text>
                </VStack>
                <Text color="gray.400">→</Text>
              </HStack>
            </CardBody>
          </Card>
        </VStack>


        <VStack align="stretch" spacing={6} mb={6}>
          <Box>
            <Flex align="center" justify="space-between" mb={2}>
              <Heading size="lg" fontFamily="Playfair Display" color="gray.800">Profile Video</Heading>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={52428800}
                allowedFileTypes={['video/*']}
                onGetUploadParameters={handleVideoUpload}
                onComplete={handleVideoComplete}
                buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2"
                buttonStyle={{ backgroundColor: remainingVideos > 0 ? '#7c3aed' : '#9CA3AF' }}
              >
                <Upload size={18} />
                {remainingVideos > 0 ? 'Upload Video' : 'Limit Reached'}
              </ObjectUploader>
            </Flex>
            <Text fontSize="sm" color="gray.600" mb={3}>
              {videoCount} of {tierLimits.videos} video{tierLimits.videos !== 1 ? 's' : ''} • Max {tierLimits.videoMaxDuration}s each
            </Text>
            {videoUrl ? (
              <Box position="relative" borderRadius="xl" overflow="hidden" bg="black">
                <Box
                  as="video"
                  src={`/api${videoUrl}`}
                  controls
                  loop
                  w="full"
                  h="220px"
                  objectFit="cover"
                />
                <IconButton
                  onClick={() => deleteMedia(videoUrl)}
                  position="absolute"
                  top={2}
                  right={2}
                  icon={<Trash2 size={16} />}
                  borderRadius="full"
                  colorScheme="red"
                  size="sm"
                  aria-label="Delete video"
                />
              </Box>
            ) : (
              <Box borderRadius="xl" borderWidth={2} borderStyle="dashed" borderColor="gray.200" p={8} textAlign="center">
                <Text color="gray.500">No video uploaded yet. Upload a video to help others get to know you!</Text>
              </Box>
            )}
          </Box>

          <Box>
            <Flex align="center" justify="space-between" mb={2}>
              <Heading size="lg" fontFamily="Playfair Display" color="gray.800">Your Photos</Heading>
              <ObjectUploader
                maxNumberOfFiles={remainingPhotos}
                maxFileSize={10485760}
                allowedFileTypes={['image/*']}
                onGetUploadParameters={handlePhotoUpload}
                onComplete={handlePhotoComplete}
                buttonClassName="px-4 py-2 rounded-lg text-white font-semibold shadow-md flex items-center gap-2"
                buttonStyle={{ backgroundColor: remainingPhotos > 0 ? '#7c3aed' : '#9CA3AF' }}
              >
                <Upload size={18} />
                {remainingPhotos > 0 ? `Upload Photo${remainingPhotos > 1 ? 's' : ''}` : 'Limit Reached'}
              </ObjectUploader>
            </Flex>
            <Text fontSize="sm" color="gray.600" mb={3}>
              {photoCount} of {tierLimits.photos} photos • {remainingPhotos} slot{remainingPhotos !== 1 ? 's' : ''} remaining
            </Text>
            {media.filter((m) => m.type === "photo").length > 0 ? (
              <Flex flexWrap="wrap" gap={3}>
                {media
                  .filter((m) => m.type === "photo")
                  .map((m, idx) => {
                    const isPrimary = m.url === primaryPhoto;
                    return (
                      <Box key={idx} position="relative">
                        <Button
                          onClick={() => selectPrimary(m.url)}
                          variant="unstyled"
                          display="block"
                          p={0}
                        >
                          <Image
                            src={`/api${m.url}`}
                            alt="Profile"
                            w={32}
                            h={32}
                            borderRadius="lg"
                            objectFit="cover"
                            borderWidth={3}
                            borderColor={isPrimary ? "purple.500" : "gray.200"}
                          />
                          <Text
                            fontSize="xs"
                            textAlign="center"
                            mt={1}
                            fontWeight="semibold"
                            color={isPrimary ? "purple.600" : "gray.600"}
                          >
                            {isPrimary ? "★ Primary" : "Set Primary"}
                          </Text>
                        </Button>
                        <IconButton
                          onClick={() => deleteMedia(m.url)}
                          position="absolute"
                          top={1}
                          right={1}
                          icon={<Trash2 size={14} />}
                          size="xs"
                          borderRadius="full"
                          colorScheme="red"
                          aria-label="Delete photo"
                        />
                      </Box>
                    );
                  })}
              </Flex>
            ) : (
              <Box borderRadius="xl" borderWidth={2} borderStyle="dashed" borderColor="gray.200" p={8} textAlign="center">
                <Text color="gray.500">No photos uploaded yet. Add photos to make your profile stand out!</Text>
              </Box>
            )}
          </Box>
        </VStack>

        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel fontWeight="semibold" color="gray.800">Name</FormLabel>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              borderColor="gray.200"
              bg="white"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontWeight="semibold" color="gray.800">Bio</FormLabel>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself... What makes you unique? What are you passionate about?"
              rows={5}
              maxLength={2000}
              borderColor="gray.200"
              bg="white"
            />
            <Text fontSize="xs" color="gray.500" mt={1} textAlign="right">
              {bio.length} / 2000 characters
            </Text>
          </FormControl>

          <Card shadow="md">
            <CardBody p={6}>
              <Flex align="center" justify="space-between" mb={4}>
                <Heading size="md" color="gray.800">Interests</Heading>
                <Button
                  onClick={onInterestsOpen}
                  leftIcon={<Plus size={16} />}
                  colorScheme="purple"
                  size="sm"
                >
                  Add Interests
                </Button>
              </Flex>
              
              {interests.length > 0 ? (
                <Wrap spacing={2}>
                  {interests.map((interest, idx) => (
                    <WrapItem key={idx}>
                      <Tag size="lg" colorScheme="purple" borderRadius="full">
                        <TagLabel>{interest}</TagLabel>
                        <TagCloseButton onClick={() => removeInterest(interest)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              ) : (
                <Text color="gray.500" fontSize="sm">No interests added yet. Click "Add Interests" to get started!</Text>
              )}
              
              <Text fontSize="xs" color="gray.500" mt={2}>
                {interests.length} / {INTERESTS_CONFIG.MAX_ALLOWED} interests • Minimum {INTERESTS_CONFIG.MIN_REQUIRED} required
              </Text>
            </CardBody>
          </Card>

          <Card shadow="md">
            <CardBody p={6}>
              <Heading size="md" mb={4} color="gray.800">About You</Heading>
              
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Gender</FormLabel>
                  <Select value={gender} onChange={(e) => setGender(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.GENDER.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Sexual Orientation</FormLabel>
                  <Select value={sexualOrientation} onChange={(e) => setSexualOrientation(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.SEXUAL_ORIENTATION.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Looking For</FormLabel>
                  <Select value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.LOOKING_FOR.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Body Type</FormLabel>
                  <Select value={bodyType} onChange={(e) => setBodyType(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.BODY_TYPE.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Height Range</FormLabel>
                  <Select value={heightRange} onChange={(e) => setHeightRange(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.HEIGHT_RANGES.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Education</FormLabel>
                  <Select value={education} onChange={(e) => setEducation(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.EDUCATION.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Relationship Goals</FormLabel>
                  <Select value={relationshipGoals} onChange={(e) => setRelationshipGoals(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.RELATIONSHIP_GOALS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Drinking</FormLabel>
                  <Select value={drinking} onChange={(e) => setDrinking(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.DRINKING.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Smoking</FormLabel>
                  <Select value={smoking} onChange={(e) => setSmoking(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.SMOKING.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Exercise</FormLabel>
                  <Select value={exercise} onChange={(e) => setExercise(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.EXERCISE.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Religion</FormLabel>
                  <Select value={religion} onChange={(e) => setReligion(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.RELIGION.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Children</FormLabel>
                  <Select value={childrenPreference} onChange={(e) => setChildrenPreference(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.CHILDREN.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="semibold" color="gray.800">Pets</FormLabel>
                  <Select value={pets} onChange={(e) => setPets(e.target.value)} borderColor="gray.200" bg="white">
                    <option value="">Select...</option>
                    {PREFERENCE_OPTIONS.PETS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </CardBody>
          </Card>

          <FormControl>
            <FormLabel fontWeight="semibold" color="gray.800">Timezone</FormLabel>
            <Input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/New_York"
              borderColor="gray.200"
              bg="white"
            />
          </FormControl>

          <Card shadow="md">
            <CardBody p={6}>
              <Heading size="md" mb={4} color="gray.800">Typical Availability</Heading>
              <AvailabilityGrid
                value={availabilityGrid}
                onChange={setAvailabilityGrid}
              />
            </CardBody>
          </Card>

          <LocationSettings
            initialLatitude={latitude}
            initialLongitude={longitude}
            initialMaxDistance={maxDistance}
            onSave={handleLocationSave}
          />

          <FormControl display="flex" alignItems="center" justifyContent="space-between" py={2}>
            <FormLabel mb={0} color="gray.800">Immediate Availability</FormLabel>
            <Switch
              isChecked={immediate}
              onChange={() => setImmediate(!immediate)}
              colorScheme="purple"
            />
          </FormControl>

          <FormControl display="flex" alignItems="center" justifyContent="space-between" py={2}>
            <FormLabel mb={0} color="gray.800">Appear Offline (Override)</FormLabel>
            <Switch
              isChecked={override}
              onChange={() => setOverride(!override)}
              colorScheme="purple"
            />
          </FormControl>

          <FormControl display="flex" alignItems="center" justifyContent="space-between" py={2}>
            <FormLabel mb={0} color="gray.800">Accept Video Calls</FormLabel>
            <Switch
              isChecked={videoCallAvailable}
              onChange={() => setVideoCallAvailable(!videoCallAvailable)}
              colorScheme="purple"
            />
          </FormControl>

          {error && error !== "AUTH_401" && (
            <Text color="red.500">{error}</Text>
          )}

          <Button onClick={save} colorScheme="purple" size="lg">
            Save
          </Button>

          <Button
            as={Link}
            to="/profile/preview"
            size="lg"
            variant="outline"
            colorScheme="purple"
            bg="purple.50"
          >
            Preview Profile
          </Button>

          <Button onClick={deleteAccount} size="lg" variant="outline">
            Delete Account
          </Button>

          <Button
            onClick={handleSignOut}
            size="lg"
            colorScheme="red"
            variant="outline"
            bg="red.50"
          >
            Sign Out
          </Button>
        </VStack>
      </Container>

      <Modal isOpen={isInterestsOpen} onClose={onInterestsClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Interests</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Select up to {INTERESTS_CONFIG.MAX_ALLOWED} interests that best represent you
            </Text>
            
            <Wrap spacing={2}>
              {INTERESTS_CONFIG.OPTIONS.map((interest) => {
                const isSelected = interests.includes(interest);
                const isDisabled = !isSelected && interests.length >= INTERESTS_CONFIG.MAX_ALLOWED;
                
                return (
                  <WrapItem key={interest}>
                    <Button
                      size="sm"
                      variant={isSelected ? "solid" : "outline"}
                      colorScheme={isSelected ? "purple" : "gray"}
                      onClick={() => isSelected ? removeInterest(interest) : addInterest(interest)}
                      isDisabled={isDisabled}
                    >
                      {interest}
                    </Button>
                  </WrapItem>
                );
              })}
            </Wrap>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="purple" onClick={onInterestsClose}>
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default function Profile() {
  return (
    <ErrorBoundary componentName="Profile">
      <ProfileContent />
    </ErrorBoundary>
  );
}
