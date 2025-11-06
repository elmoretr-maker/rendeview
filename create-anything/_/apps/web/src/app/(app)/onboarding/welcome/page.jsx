import React from "react";
import { useNavigate } from "react-router";
import { CheckCircle, Shield, Heart, Users } from "lucide-react";
import logoImage from "@/assets/logo-centered.png";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Image
} from "@chakra-ui/react";

function WelcomeContent() {
  const navigate = useNavigate();

  const valueProps = [
    {
      icon: CheckCircle,
      title: "Video-First Dating",
      description:
        "The only dating app where you see who you're really meeting. Built for authentic introductions and real-time conversations.",
    },
    {
      icon: Shield,
      title: "Safety First",
      description:
        "Advanced verification and safety features to protect your time and ensure a secure experience.",
    },
    {
      icon: Heart,
      title: "Meaningful Connections",
      description:
        "Quality matches based on compatibility and genuine connections.",
    },
    {
      icon: Users,
      title: "Inclusive Community",
      description:
        "A welcoming space for everyone to find authentic relationships.",
    },
  ];

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="gray.50">
      <Container maxW="4xl" px={8} py={12} flex={1}>
        <VStack spacing={12} mb={12}>
          <VStack textAlign="center" spacing={3}>
            <Image
              src={logoImage}
              alt="Rende-View Logo"
              w="12"
              h="12"
              objectFit="contain"
            />
            <Heading
              size="2xl"
              fontFamily="'Playfair Display', serif"
              fontWeight="bold"
              color="purple.600"
            >
              Date Smarter, Not Harder
            </Heading>
            <Text fontSize="lg" opacity={0.8} color="gray.700">
              No Catfishing. Know who they are before you meet. Your time is valuable—only pay for connections that matter.
            </Text>
          </VStack>

          <VStack spacing={6} w="full" mb={12}>
            {valueProps.map((prop, index) => (
              <HStack key={index} align="start" spacing={4} w="full">
                <Box as={prop.icon} w={7} h={7} flexShrink={0} color="purple.600" />
                <VStack align="start" spacing={1} flex={1}>
                  <Heading size="md" fontWeight="semibold" color="gray.700">
                    {prop.title}
                  </Heading>
                  <Text fontSize="sm" opacity={0.7} color="gray.700">
                    {prop.description}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </VStack>

          <VStack spacing={4} textAlign="center" mb={6}>
            <Button
              onClick={() => navigate("/account/signup")}
              px={10}
              py={6}
              borderRadius="full"
              colorScheme="purple"
              fontSize="lg"
              shadow="lg"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate("/account/signin")}
              variant="link"
              fontSize="sm"
              fontWeight="semibold"
              color="purple.600"
            >
              I Already Have an Account
            </Button>
          </VStack>

          <Text fontSize="xs" textAlign="center" opacity={0.6} color="gray.700">
            By continuing, you agree to our{" "}
            <Text as="span" color="purple.600" textDecoration="underline" cursor="pointer">Terms of Service</Text> and{" "}
            <Text as="span" color="purple.600" textDecoration="underline" cursor="pointer">Privacy Policy</Text>.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}

export default function Welcome() {
  return (
    <OnboardingGuard allowUnauthenticated={true}>
      <WelcomeContent />
    </OnboardingGuard>
  );
}
