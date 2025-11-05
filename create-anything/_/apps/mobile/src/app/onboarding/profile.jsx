import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as RNImagePicker from "expo-image-picker";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { VideoView, useVideoPlayer } from "expo-video";
import useUpload from "@/utils/useUpload";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

const COLORS = {
  primary: "#7c3aed", // Match web purple
  secondary: "#00BFA6",
  text: "#2C3E50",
  lightGray: "#F3F4F6",
  filledBg: "#F7FAFC", // Filled input background
  white: "#FFFFFF",
  error: "#EF4444",
  border: "#E2E8F0",
};

// Enhanced styles to match web Chakra UI aesthetic
const STYLES = {
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  input: {
    backgroundColor: COLORS.filledBg,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "transparent",
    color: COLORS.text,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    color: COLORS.text,
    fontSize: 14,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
};

// Interests configuration
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

// Preference options configuration
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

function limitsForTier(tier) {
  const t = (tier || "free").toLowerCase();
  switch (t) {
    case "business":
      return { maxPhotos: 10, maxVideoSec: 60, maxVideos: 3 };
    case "dating":
      return { maxPhotos: 8, maxVideoSec: 60, maxVideos: 2 };
    case "casual":
      return { maxPhotos: 5, maxVideoSec: 30, maxVideos: 1 };
    case "free":
    default:
      return { maxPhotos: 3, maxVideoSec: 15, maxVideos: 1 };
  }
}

function ConsolidatedProfileOnboardingContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Profile fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  
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
  const [location, setLocation] = useState("");
  const [maxDistance, setMaxDistance] = useState(50);
  const [showPreferenceModal, setShowPreferenceModal] = useState(null);
  
  // Media state
  const [photos, setPhotos] = useState([]);
  const [videoAsset, setVideoAsset] = useState(null);
  const [videoAccepted, setVideoAccepted] = useState(false);
  const [tier, setTier] = useState("free");
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [upload, { loading }] = useUpload();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const totalSteps = 4;
  const stepIndex = 4;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;
  const limits = limitsForTier(tier);

  const videoPlayer = useVideoPlayer(videoAsset?.uri || null, player => {
    if (player && videoAsset) {
      player.loop = true;
      player.play();
    }
  });

  // Pause and disable loop when video is accepted
  useEffect(() => {
    if (videoPlayer && videoAccepted) {
      videoPlayer.loop = false;
      videoPlayer.pause();
    }
  }, [videoPlayer, videoAccepted]);

  // Load existing profile data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          const user = data?.user;
          if (mounted) {
            setTier(user?.membership_tier || "free");
            if (user?.name) setName(user.name);
            if (user?.bio) setBio(user.bio);
            if (user?.interests && Array.isArray(user.interests)) {
              setInterests(user.interests);
            }
            // Load preference fields
            if (user?.gender) setGender(user.gender);
            if (user?.sexual_orientation) setSexualOrientation(user.sexual_orientation);
            if (user?.looking_for) setLookingFor(user.looking_for);
            if (user?.body_type) setBodyType(user.body_type);
            if (user?.height_range) setHeightRange(user.height_range);
            if (user?.education) setEducation(user.education);
            if (user?.relationship_goals) setRelationshipGoals(user.relationship_goals);
            if (user?.drinking) setDrinking(user.drinking);
            if (user?.smoking) setSmoking(user.smoking);
            if (user?.exercise) setExercise(user.exercise);
            if (user?.religion) setReligion(user.religion);
            if (user?.children_preference) setChildrenPreference(user.children_preference);
            if (user?.pets) setPets(user.pets);
            if (user?.location) setLocation(user.location);
            if (user?.max_distance !== undefined && user?.max_distance !== null) {
              setMaxDistance(user.max_distance);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    })();
    return () => (mounted = false);
  }, []);

  const pickImage = useCallback(async () => {
    if (photos.length >= limits.maxPhotos) {
      Alert.alert(
        "Photo Limit",
        `You can only upload ${limits.maxPhotos} photos. Upgrade for more!`
      );
      return;
    }
    const result = await RNImagePicker.launchImageLibraryAsync({
      mediaTypes: RNImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      allowsMultipleSelection: false,
      base64: true, // Enable base64 for upload compatibility
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0]].slice(0, limits.maxPhotos));
    }
  }, [photos.length, limits.maxPhotos]);

  const removePhotoAt = useCallback((index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const ensureVideoPermissions = useCallback(async () => {
    if (!permission?.granted) {
      const cam = await requestPermission();
      if (!cam?.granted) {
        Alert.alert("Camera", "Camera permission is required to record.");
        return false;
      }
    }
    if (!micPermission?.granted) {
      const mic = await requestMicPermission();
      if (!mic?.granted) {
        Alert.alert(
          "Microphone",
          "Microphone permission is required to record video with sound."
        );
        return false;
      }
    }
    return true;
  }, [
    permission?.granted,
    micPermission?.granted,
    requestPermission,
    requestMicPermission,
  ]);

  const toggleRecord = useCallback(async () => {
    const ok = await ensureVideoPermissions();
    if (!ok) return;
    if (!cameraRef.current) return;

    if (recording) {
      try {
        await cameraRef.current.stopRecording();
      } catch (e) {
        console.error(e);
      }
      setRecording(false);
      return;
    }

    try {
      setRecording(true);
      setVideoAccepted(false);
      const cam = cameraRef.current;
      if (typeof cam.recordAsync === "function") {
        const rec = await cam.recordAsync({ maxDuration: limits.maxVideoSec });
        setVideoAsset(rec);
      } else if (typeof cam.startRecording === "function") {
        const rec = await new Promise((resolve, reject) => {
          let timeout;
          try {
            cam.startRecording({
              maxDuration: limits.maxVideoSec,
              onRecordingFinished: (video) => {
                clearTimeout(timeout);
                resolve(video);
              },
              onRecordingError: (err) => {
                clearTimeout(timeout);
                reject(err);
              },
            });
            timeout = setTimeout(
              () => {
                try {
                  cam.stopRecording();
                } catch {}
              },
              (limits.maxVideoSec + 1) * 1000
            );
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
        });
        setVideoAsset(rec);
      } else {
        throw new Error("This device/SDK does not support video recording API");
      }
    } catch (e) {
      console.error(e);
      const maybePerm = !micPermission?.granted || !permission?.granted;
      Alert.alert(
        "Record",
        maybePerm
          ? "Failed to record — please allow Camera and Microphone in Settings and try again."
          : "Failed to record. Please try again."
      );
    } finally {
      setRecording(false);
    }
  }, [
    ensureVideoPermissions,
    limits.maxVideoSec,
    recording,
    micPermission?.granted,
    permission?.granted,
  ]);

  const acceptVideo = useCallback(() => {
    if (!videoAsset) return;
    setVideoAccepted(true);
  }, [videoAsset]);

  const redoVideo = useCallback(() => {
    setVideoAsset(null);
    setVideoAccepted(false);
  }, []);

  const toggleInterest = useCallback((interest) => {
    setInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      } else {
        if (prev.length >= INTERESTS_CONFIG.MAX_ALLOWED) {
          Alert.alert("Limit Reached", `You can select up to ${INTERESTS_CONFIG.MAX_ALLOWED} interests`);
          return prev;
        }
        return [...prev, interest];
      }
    });
  }, []);

  const removeInterest = useCallback((interest) => {
    setInterests((prev) => prev.filter((i) => i !== interest));
  }, []);

  const onSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your display name");
      return;
    }
    if (photos.length < 2) {
      Alert.alert(
        "Photos Required",
        `Please add at least 2 photos (max ${limits.maxPhotos}).`
      );
      return;
    }
    if (interests.length < INTERESTS_CONFIG.MIN_REQUIRED) {
      Alert.alert(
        "Interests Required",
        `Please select at least ${INTERESTS_CONFIG.MIN_REQUIRED} interests to help us find better matches for you.`
      );
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      let media = [];
      const total = photos.length + (videoAsset && videoAccepted ? 1 : 0);
      setProgress({ done: 0, total });

      // Upload photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const { url, error: upErr } = await upload({ reactNativeAsset: photo });
        if (upErr) throw new Error(upErr);
        media.push({ type: "photo", url, sort_order: i });
        setProgress({ done: i + 1, total });
        // Small delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Upload video if accepted
      if (videoAsset && videoAccepted) {
        const { url: vurl, error: vErr } = await upload({
          reactNativeAsset: { uri: videoAsset.uri, mimeType: "video/mp4" },
        });
        if (vErr) throw new Error(vErr);
        media.push({ type: "video", url: vurl, sort_order: media.length });
        setProgress({ done: total, total });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Save profile data with media and preferences
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          interests: interests.length > 0 ? interests : null,
          media,
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
          location: location.trim() || null,
          max_distance: maxDistance,
        }),
      });
      
      if (!res.ok) {
        throw new Error(
          `When saving profile, the response was [${res.status}] ${res.statusText}`
        );
      }
      
      router.replace("/(tabs)/discovery");
    } catch (e) {
      console.error(e);
      setError("Could not save profile");
      Alert.alert("Error", e.message || "Could not save profile");
      // Reset progress on error
      setProgress({ done: 0, total: 0 });
    } finally {
      setSaving(false);
    }
  }, [name, bio, interests, photos, videoAsset, videoAccepted, upload, router, limits.maxPhotos]);

  const resetAll = useCallback(() => {
    Alert.alert(
      "Start Over?",
      "This will clear all your photos, video, and information. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setPhotos([]);
            setVideoAsset(null);
            setVideoAccepted(false);
            setName("");
            setBio("");
            setInterests([]);
            setGender("");
            setSexualOrientation("");
            setLookingFor("");
            setBodyType("");
            setHeightRange("");
            setEducation("");
            setRelationshipGoals("");
            setDrinking("");
            setSmoking("");
            setExercise("");
            setReligion("");
            setChildrenPreference("");
            setPets("");
            setLocation("");
            setMaxDistance(50);
            setProgress({ done: 0, total: 0 });
            setError(null);
          },
        },
      ]
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Progress bar */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{ height: 6, backgroundColor: "#E5E7EB", borderRadius: 999 }}
          >
            <View
              style={{
                height: 6,
                width: progressPct,
                backgroundColor: COLORS.primary,
                borderRadius: 999,
              }}
            />
          </View>
          <Text style={{ marginTop: 6, color: COLORS.text, opacity: 0.7 }}>
            Step {stepIndex} of {totalSteps}
          </Text>
        </View>

        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 8,
            color: COLORS.text,
          }}
        >
          Complete Your Profile
        </Text>
        <Text style={{ color: COLORS.text, opacity: 0.7, marginBottom: 24 }}>
          Tell us about yourself and add photos (minimum 2 photos required)
        </Text>

        {/* Name field */}
        <Text style={STYLES.label}>
          Display Name *
        </Text>
        <TextInput
          style={STYLES.input}
          placeholder="Your name"
          placeholderTextColor="#A0AEC0"
          value={name}
          onChangeText={setName}
        />
        <View style={{ marginBottom: 16 }} />

        {/* Bio field */}
        <Text style={STYLES.label}>
          Bio (Optional)
        </Text>
        <TextInput
          style={[STYLES.input, { minHeight: 100, textAlignVertical: "top" }]}
          placeholder="Tell us about yourself..."
          placeholderTextColor="#A0AEC0"
          value={bio}
          onChangeText={(text) => text.length <= 500 && setBio(text)}
          multiline
          numberOfLines={4}
        />
        <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 16 }}>
          {bio.length}/500 characters
        </Text>

        {/* Interests field */}
        <Text style={STYLES.label}>
          Interests & Hobbies *
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 12 }}>
          Select {INTERESTS_CONFIG.MIN_REQUIRED}-{INTERESTS_CONFIG.MAX_ALLOWED} interests to help us find your perfect match
        </Text>
        
        <TouchableOpacity
          onPress={() => setShowInterestsModal(true)}
          style={[
            STYLES.input,
            interests.length < INTERESTS_CONFIG.MIN_REQUIRED && { 
              borderColor: "#FCA5A5", 
              backgroundColor: "#FEF2F2" 
            },
            { marginBottom: 12, padding: 14 }
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: interests.length > 0 ? COLORS.text : "#A0AEC0", fontSize: 16 }}>
              {interests.length > 0 ? `${interests.length} selected` : "Tap to select interests"}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.text} />
          </View>
        </TouchableOpacity>

        {interests.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
            {interests.map((interest, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: COLORS.lightGray,
                  borderRadius: 20,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: COLORS.text, marginRight: 6 }}>{interest}</Text>
                <TouchableOpacity onPress={() => removeInterest(interest)}>
                  <Ionicons name="close-circle" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 24 }}>
          {interests.length < INTERESTS_CONFIG.MIN_REQUIRED 
            ? `${INTERESTS_CONFIG.MIN_REQUIRED - interests.length} more required` 
            : `${interests.length}/${INTERESTS_CONFIG.MAX_ALLOWED} selected`}
        </Text>

        {/* Preferences Section */}
        <View style={STYLES.card}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8, color: COLORS.text }}>
            About You (Optional)
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 16 }}>
            Help us find better matches by sharing more about yourself
          </Text>

          {/* Preference Fields in Grid */}
          <View style={{ gap: 12 }}>
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
            <View key={idx}>
              <Text style={STYLES.label}>{field.label}</Text>
              <TouchableOpacity
                onPress={() => setShowPreferenceModal(field)}
                style={[STYLES.input, { padding: 14 }]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: field.value ? COLORS.text : "#A0AEC0", fontSize: 16 }}>
                    {field.value || `Select ${field.label.toLowerCase()}`}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.text} />
                </View>
              </TouchableOpacity>
            </View>
          ))}
          
          {/* Location field */}
          <View style={{ marginTop: 12 }}>
            <Text style={STYLES.label}>Location</Text>
            <TextInput
              style={STYLES.input}
              placeholder="City, Country"
              placeholderTextColor="#A0AEC0"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Max Distance slider */}
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={STYLES.label}>Maximum Distance</Text>
              <Text style={{ color: COLORS.primary, fontWeight: "600" }}>{maxDistance} km</Text>
            </View>
            <Slider
              style={{ height: 40 }}
              minimumValue={5}
              maximumValue={100}
              step={5}
              value={maxDistance}
              onValueChange={setMaxDistance}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor={COLORS.primary}
            />
          </View>
          </View>
        </View>

        {/* Photos section */}
        <View style={STYLES.card}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12, color: COLORS.text }}>
            Photos ({photos.length}/{limits.maxPhotos}) *
          </Text>
        {photos.length === 0 ? (
          <View
            style={{
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: "#E5E7EB",
              borderRadius: 12,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FAFAFA",
              marginBottom: 12,
            }}
          >
            <Ionicons name="images-outline" size={48} color={COLORS.text} opacity={0.3} />
            <Text style={{ color: COLORS.text, opacity: 0.7, marginTop: 8 }}>
              Add at least 2 photos
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            {photos.map((photo, idx) => (
              <View key={idx} style={{ position: "relative" }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 12,
                    backgroundColor: COLORS.lightGray,
                  }}
                />
                <TouchableOpacity
                  onPress={() => removePhotoAt(idx)}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    backgroundColor: COLORS.error,
                    borderRadius: 999,
                    padding: 4,
                  }}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          onPress={pickImage}
          disabled={photos.length >= limits.maxPhotos}
          style={[
            STYLES.button,
            { marginBottom: 24 },
            photos.length >= limits.maxPhotos && { 
              backgroundColor: COLORS.lightGray, 
              opacity: 0.5 
            }
          ]}
        >
          <Text style={[STYLES.buttonText, photos.length >= limits.maxPhotos && { color: COLORS.text }]}>
            {photos.length >= limits.maxPhotos ? "Photo Limit Reached" : "Add Photo"}
          </Text>
        </TouchableOpacity>
        </View>

        {/* Video section */}
        <View style={STYLES.card}>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12, color: COLORS.text }}>
            Video Introduction (Optional)
          </Text>
        <Text style={{ fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 12 }}>
          Camera-only recording prevents catfishing • Max {Math.floor(limits.maxVideoSec / 60)}:
          {String(limits.maxVideoSec % 60).padStart(2, "0")}
        </Text>
        <View
          style={{
            height: 220,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#000",
            marginBottom: 12,
          }}
        >
          {!videoAsset ? (
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="front"
              mode="video"
            />
          ) : (
            <VideoView
              style={{ flex: 1 }}
              player={videoPlayer}
              contentFit="cover"
            />
          )}
        </View>

        {/* Video controls */}
        {!videoAsset ? (
          <TouchableOpacity
            onPress={toggleRecord}
            style={{
              backgroundColor: recording ? "#DC2626" : COLORS.secondary,
              paddingVertical: 12,
              borderRadius: 12,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                color: COLORS.white,
                fontWeight: "700",
              }}
            >
              {recording
                ? "Stop Recording"
                : `Record Video (max ${Math.round(limits.maxVideoSec)}s)`}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            {!videoAccepted ? (
              <>
                <TouchableOpacity
                  onPress={acceptVideo}
                  style={{
                    backgroundColor: COLORS.secondary,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: COLORS.white,
                      fontWeight: "700",
                    }}
                  >
                    Accept Video
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={redoVideo}
                  style={{
                    backgroundColor: "#FEE2E2",
                    paddingVertical: 12,
                    borderRadius: 12,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#991B1B",
                      fontWeight: "700",
                    }}
                  >
                    Redo
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View
                  style={{
                    backgroundColor: "#DCFCE7",
                    borderRadius: 12,
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#065F46",
                      fontWeight: "700",
                      paddingVertical: 12,
                    }}
                  >
                    ✓ Video accepted
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={redoVideo}
                  style={{
                    backgroundColor: COLORS.lightGray,
                    paddingVertical: 12,
                    borderRadius: 12,
                    flex: 1,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: COLORS.primary,
                      fontWeight: "700",
                    }}
                  >
                    Change Video
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        </View>

        {/* Upload progress */}
        {progress.total > 0 && (
          <View style={{ backgroundColor: "#EDE9FE", padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ color: "#5B3BAF", fontSize: 14, textAlign: "center", fontWeight: "600" }}>
              {progress.done < progress.total 
                ? `📤 Uploading ${progress.done}/${progress.total}...`
                : `✓ All ${progress.total} item${progress.total > 1 ? 's' : ''} uploaded!`
              }
            </Text>
            {progress.done < progress.total && (
              <View style={{ marginTop: 8, height: 4, backgroundColor: "#fff", borderRadius: 999, overflow: "hidden" }}>
                <View style={{ 
                  height: 4, 
                  width: `${(progress.done / progress.total) * 100}%`, 
                  backgroundColor: "#5B3BAF" 
                }} />
              </View>
            )}
          </View>
        )}

        {/* Photo requirement reminder */}
        {photos.length < 2 && (
          <View style={{ backgroundColor: "#FEF3C7", padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ color: "#92400E", fontSize: 14, textAlign: "center" }}>
              📸 Please add at least 2 photos to continue ({photos.length}/2)
            </Text>
          </View>
        )}

        {/* Complete button */}
        <TouchableOpacity
          onPress={onSave}
          disabled={saving || loading || !name.trim() || photos.length < 2}
          style={[
            STYLES.button,
            { marginBottom: 12 },
            (saving || loading || !name.trim() || photos.length < 2) && { opacity: 0.6 }
          ]}
        >
          <Text style={STYLES.buttonText}>
            {saving || loading ? "Saving..." : "Complete Setup"}
          </Text>
        </TouchableOpacity>

        {/* Reset button */}
        <TouchableOpacity
          onPress={resetAll}
          disabled={saving}
          style={{ 
            paddingVertical: 14, 
            borderRadius: 12, 
            marginBottom: 12,
            opacity: saving ? 0.6 : 1 
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "#E74C3C",
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            🔄 Start Over
          </Text>
        </TouchableOpacity>

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.replace("/onboarding/membership")}
          style={{ paddingVertical: 14, borderRadius: 12 }}
        >
          <Text
            style={{
              textAlign: "center",
              color: COLORS.text,
              opacity: 0.7,
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Back to Membership
          </Text>
        </TouchableOpacity>

        {error && <Text style={{ color: COLORS.error, marginTop: 8, textAlign: "center" }}>{error}</Text>}
        
        <Text style={{ fontSize: 12, textAlign: "center", color: COLORS.text, opacity: 0.6, marginTop: 16 }}>
          * Required fields
        </Text>
      </ScrollView>

      {/* Interests Selection Modal */}
      <Modal
        visible={showInterestsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowInterestsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.white, paddingTop: insets.top }}>
          {/* Modal Header */}
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB"
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>
              Select Interests
            </Text>
            <TouchableOpacity onPress={() => setShowInterestsModal(false)}>
              <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Selection Counter */}
          <View style={{ padding: 16, backgroundColor: "#F9FAFB" }}>
            <Text style={{ fontSize: 14, color: COLORS.text, textAlign: "center" }}>
              {interests.length < INTERESTS_CONFIG.MIN_REQUIRED 
                ? `Select ${INTERESTS_CONFIG.MIN_REQUIRED - interests.length} more (${interests.length}/${INTERESTS_CONFIG.MIN_REQUIRED} minimum)`
                : `${interests.length}/${INTERESTS_CONFIG.MAX_ALLOWED} selected`}
            </Text>
          </View>

          {/* Interests List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {INTERESTS_CONFIG.OPTIONS.map((interest) => {
                const isSelected = interests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: isSelected ? COLORS.primary : "#E5E7EB",
                      backgroundColor: isSelected ? "#EDE9FE" : COLORS.white,
                    }}
                  >
                    <Text style={{ 
                      color: isSelected ? COLORS.primary : COLORS.text,
                      fontWeight: isSelected ? "600" : "400"
                    }}>
                      {isSelected ? "✓ " : ""}{interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Preference Selection Modal */}
      <Modal
        visible={showPreferenceModal !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPreferenceModal(null)}
      >
        {showPreferenceModal && (
          <View style={{ flex: 1, backgroundColor: COLORS.white, paddingTop: insets.top }}>
            {/* Modal Header */}
            <View style={{ 
              flexDirection: "row", 
              justifyContent: "space-between", 
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB"
            }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.text }}>
                Select {showPreferenceModal.label}
              </Text>
              <TouchableOpacity onPress={() => setShowPreferenceModal(null)}>
                <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: "600" }}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              {showPreferenceModal.options.map((option) => {
                const isSelected = showPreferenceModal.value === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      showPreferenceModal.setter(option);
                      setShowPreferenceModal(null);
                    }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.primary : "#E5E7EB",
                      backgroundColor: isSelected ? "#EDE9FE" : COLORS.white,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ 
                        color: isSelected ? COLORS.primary : COLORS.text,
                        fontWeight: isSelected ? "600" : "400",
                        fontSize: 16
                      }}>
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
}

export default function ConsolidatedProfileOnboarding() {
  return (
    <OnboardingGuard>
      <ConsolidatedProfileOnboardingContent />
    </OnboardingGuard>
  );
}
