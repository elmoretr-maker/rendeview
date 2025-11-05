import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload, X, Trash2, Video, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Card,
  SimpleGrid,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";

const MEMBERSHIP_TIERS = {
  FREE: "free",
  CASUAL: "casual",
  DATING: "dating",
  BUSINESS: "business",
};

const getTierLimits = (tier) => {
  switch (tier?.toLowerCase()) {
    case MEMBERSHIP_TIERS.BUSINESS:
      return { photos: 10, videos: 3, videoDuration: 300 };
    case MEMBERSHIP_TIERS.DATING:
      return { photos: 8, videos: 2, videoDuration: 60 };
    case MEMBERSHIP_TIERS.CASUAL:
      return { photos: 5, videos: 1, videoDuration: 30 };
    case MEMBERSHIP_TIERS.FREE:
    default:
      return { photos: 3, videos: 1, videoDuration: 15 };
  }
};

export default function ProfileMediaPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const user = profileData?.user || {};
  const media = profileData?.media || [];
  const photos = media.filter((m) => m.type === "photo");
  const videos = media.filter((m) => m.type === "video");
  const membershipTier = user.membership_tier || MEMBERSHIP_TIERS.FREE;
  const limits = getTierLimits(membershipTier);

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

  const handlePhotoComplete = useCallback(
    async (result) => {
      if (result.successful && result.successful.length > 0) {
        const uploadURL = result.successful[0].uploadURL;
        try {
          const res = await fetch("/api/profile/media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaURL: uploadURL, type: "photo" }),
          });
          if (!res.ok) throw new Error("Failed to save photo");
          toast.success("Photo uploaded successfully");
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        } catch (e) {
          console.error(e);
          toast.error("Failed to save photo");
        }
      }
    },
    [queryClient]
  );

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

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="4xl" px={4} py={8}>
        <VStack align="start" mb={6} spacing={2}>
          <Heading size="2xl" color="gray.800">
            Photos & Videos
          </Heading>
          <Text color="gray.600">
            Manage your profile media. {membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)} members can upload up to {limits.photos} photos and {limits.videos} video{limits.videos > 1 ? "s" : ""}.
          </Text>
        </VStack>

        <Card mb={8} p={6} shadow="md">
          <HStack justify="space-between" mb={4}>
            <Heading size="lg" color="gray.800">
              Photos ({photos.length}/{limits.photos})
            </Heading>
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              allowedFileTypes={["image/*"]}
              onGetUploadParameters={handlePhotoUpload}
              onComplete={handlePhotoComplete}
              buttonClassName="chakra-button css-1dyz4v9"
              buttonStyle={{ backgroundColor: "#ec4899", color: "white" }}
            >
              <Upload size={18} />
              Add Photo
            </ObjectUploader>
          </HStack>

          {photos.length === 0 ? (
            <VStack py={8} color="gray.500">
              <Upload size={48} opacity={0.4} />
              <Text>No photos yet. Add your first photo!</Text>
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={4}>
              {photos.map((photo, idx) => (
                <Box key={idx} position="relative" role="group" borderRadius="xl" overflow="hidden" shadow="md">
                  <Box
                    as="img"
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    w="full"
                    h="48"
                    objectFit="cover"
                  />
                  <IconButton
                    icon={<Trash2 size={16} />}
                    onClick={() => deleteMutation.mutate({ mediaUrl: photo.url })}
                    isDisabled={deleteMutation.isPending}
                    position="absolute"
                    top={2}
                    right={2}
                    size="sm"
                    borderRadius="full"
                    bg="blackAlpha.500"
                    _hover={{ bg: "blackAlpha.700" }}
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                    aria-label="Delete photo"
                    color="white"
                  />
                  {photo.is_primary && (
                    <Box
                      position="absolute"
                      bottom={2}
                      left={2}
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="xs"
                      fontWeight="semibold"
                      bg="whiteAlpha.900"
                    >
                      Primary
                    </Box>
                  )}
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Card>

        <Card p={6} shadow="md">
          <HStack justify="space-between" mb={4}>
            <Heading size="lg" color="gray.800">
              Videos ({videos.length}/{limits.videos})
            </Heading>
            <Button
              onClick={() => setShowVideoRecorder(true)}
              isDisabled={videos.length >= limits.videos}
              colorScheme="purple"
              leftIcon={<Camera size={18} />}
            >
              Record Video
            </Button>
          </HStack>

          {videos.length === 0 ? (
            <VStack py={8} color="gray.500">
              <Video size={48} opacity={0.4} />
              <Text>No videos yet. Record your first video introduction!</Text>
              <Text fontSize="sm" mt={2}>Camera-only recording prevents catfishing</Text>
            </VStack>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {videos.map((video, idx) => (
                <Box key={idx} position="relative" role="group" borderRadius="xl" overflow="hidden" shadow="md" bg="black">
                  <Box
                    as="video"
                    src={video.url}
                    controls
                    w="full"
                    h="64"
                    objectFit="contain"
                  />
                  <IconButton
                    icon={<Trash2 size={16} />}
                    onClick={() => deleteMutation.mutate({ mediaUrl: video.url })}
                    isDisabled={deleteMutation.isPending}
                    position="absolute"
                    top={2}
                    right={2}
                    size="sm"
                    borderRadius="full"
                    bg="blackAlpha.500"
                    _hover={{ bg: "blackAlpha.700" }}
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                    aria-label="Delete video"
                    color="white"
                  />
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Card>

        {showVideoRecorder && (
          <VideoRecorderModal
            onClose={() => setShowVideoRecorder(false)}
            maxDuration={limits.videoDuration}
            onComplete={() => {
              setShowVideoRecorder(false);
              queryClient.invalidateQueries({ queryKey: ["profile"] });
            }}
          />
        )}
      </Container>
    </Box>
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

    setUploading(true);
    try {
      const res = await fetch("/api/objects/upload", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL } = await res.json();

      const blob = await fetch(recordedVideoURL).then((r) => r.blob());

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": "video/webm",
        },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload video");

      const saveRes = await fetch("/api/profile/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaURL: uploadURL, type: "video" }),
      });

      if (!saveRes.ok) throw new Error("Failed to save video");

      toast.success("Video uploaded successfully!");
      URL.revokeObjectURL(recordedVideoURL);
      onComplete();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="2xl" isCentered>
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent>
        <ModalHeader fontSize="2xl" color="gray.800">
          {recordedVideoURL ? "Review Your Video" : "Record Video Introduction"}
        </ModalHeader>
        <ModalCloseButton isDisabled={uploading} />
        
        <ModalBody pb={6}>
          <Box mb={4} borderRadius="xl" overflow="hidden" bg="black">
            {recordedVideoURL ? (
              <Box as="video" src={recordedVideoURL} controls w="full" maxH="400px" />
            ) : (
              <Box position="relative">
                <Box
                  as="video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  w="full"
                  maxH="400px"
                  transform="scaleX(-1)"
                />
                {isRecording && (
                  <Flex
                    position="absolute"
                    top={4}
                    right={4}
                    bg="red.600"
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontWeight="bold"
                    align="center"
                    gap={2}
                  >
                    <Box w={3} h={3} bg="white" borderRadius="full" animation="pulse 2s infinite" />
                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                  </Flex>
                )}
              </Box>
            )}
          </Box>

          {!hasPermission && !recordedVideoURL && (
            <VStack py={8} textAlign="center">
              <Camera size={48} opacity={0.4} />
              <Text color="gray.600" mb={4}>Waiting for camera permission...</Text>
              <Text fontSize="sm" color="gray.500">Please allow camera and microphone access to continue</Text>
            </VStack>
          )}

          <HStack spacing={3}>
            {recordedVideoURL ? (
              <>
                <Button
                  onClick={redoRecording}
                  isDisabled={uploading}
                  flex={1}
                  variant="outline"
                  colorScheme="pink"
                  size="lg"
                >
                  Redo
                </Button>
                <Button
                  onClick={uploadVideo}
                  isDisabled={uploading}
                  isLoading={uploading}
                  loadingText="Uploading..."
                  flex={1}
                  colorScheme="pink"
                  size="lg"
                >
                  Upload Video
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={onClose}
                  isDisabled={isRecording}
                  flex={1}
                  variant="outline"
                  size="lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  isDisabled={!hasPermission}
                  flex={1}
                  colorScheme={isRecording ? "red" : "pink"}
                  leftIcon={isRecording ? <Box w={4} h={4} bg="white" borderRadius="sm" /> : <PlayCircle size={20} />}
                  size="lg"
                >
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>
              </>
            )}
          </HStack>

          <Text fontSize="sm" color="gray.500" textAlign="center" mt={4}>
            Maximum duration: {Math.floor(maxDuration / 60)}:{String(maxDuration % 60).padStart(2, "0")}
          </Text>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
