import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import useUser from "@/utils/useUser";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { ObjectUploader } from "@/components/ObjectUploader";
import AvailabilityGrid, { availabilityGridToTypical, typicalToAvailabilityGrid } from "@/components/AvailabilityGrid";
import { Trash2, Upload, Crown, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { getTierLimits, getRemainingPhotoSlots, getRemainingVideoSlots, MEMBERSHIP_TIERS } from "@/utils/membershipTiers";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { ProfileSkeleton } from "@/app/components/SkeletonLoader";
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
  Switch,
  Card,
  CardBody,
  Image,
  IconButton,
  Badge,
} from "@chakra-ui/react";

function ProfileContent() {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [availabilityGrid, setAvailabilityGrid] = useState({});
  const [immediate, setImmediate] = useState(false);
  const [override, setOverride] = useState(false);
  const [videoCallAvailable, setVideoCallAvailable] = useState(true);
  const [media, setMedia] = useState([]);
  const [primaryPhoto, setPrimaryPhoto] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [membershipTier, setMembershipTier] = useState(MEMBERSHIP_TIERS.FREE);

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
      const typical = availabilityGridToTypical(availabilityGrid);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          typical,
          immediate_available: immediate,
          availability_override: override,
          video_call_available: videoCallAvailable,
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
  }, [name, timezone, availabilityGrid, immediate, override, videoCallAvailable]);

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
      await fetch("/api/auth/signout", { method: "POST" });
      navigate("/account/signin");
    } catch (e) {
      console.error(e);
      toast.error("Could not sign out");
    }
  }, [navigate]);

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
            <Button
              as={Link}
              to="/onboarding/membership"
              leftIcon={<Crown size={18} />}
              colorScheme="teal"
              shadow="md"
            >
              {membershipTier?.toUpperCase() || 'FREE'} Tier
            </Button>
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

        {error === "AUTH_401" ? (
          <VStack align="start" spacing={4} mb={6}>
            <Text color="gray.800">Session expired. Please sign in.</Text>
            <Button
              onClick={() => navigate("/account/signin")}
              colorScheme="purple"
              shadow="md"
            >
              Sign In
            </Button>
          </VStack>
        ) : null}

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
