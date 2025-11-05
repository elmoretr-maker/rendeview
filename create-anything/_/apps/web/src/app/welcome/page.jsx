import React from "react";
import { useNavigate } from "react-router";
import logoImage from "@/assets/logo-centered.png";
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Image
} from "@chakra-ui/react";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="white">
      <Container maxW="md" px={8} py={16} flex={1} display="flex" alignItems="center">
        <VStack spacing={8} w="full" textAlign="center">
          <VStack spacing={4}>
            <Image
              src={logoImage}
              alt="Rende-View Logo"
              w="20"
              h="20"
              objectFit="contain"
            />
            <Heading
              size="xl"
              fontFamily="'Playfair Display', serif"
              fontWeight="bold"
              color="gray.800"
            >
              Rende-View
            </Heading>
          </VStack>

          <VStack spacing={3} w="full" pt={4}>
            <Button
              onClick={() => navigate("/account/signin")}
              w="full"
              size="lg"
              variant="outline"
              colorScheme="purple"
              borderWidth={2}
              fontSize="md"
              fontWeight="semibold"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/onboarding/welcome")}
              w="full"
              size="lg"
              colorScheme="purple"
              fontSize="md"
              fontWeight="semibold"
            >
              Join Now
            </Button>
          </VStack>

          <Text fontSize="xs" textAlign="center" opacity={0.6} color="gray.600" pt={8}>
            By continuing, you agree to our{" "}
            <Text as="span" color="purple.600" textDecoration="underline" cursor="pointer">
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text as="span" color="purple.600" textDecoration="underline" cursor="pointer">
              Privacy Policy
            </Text>
            .
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
