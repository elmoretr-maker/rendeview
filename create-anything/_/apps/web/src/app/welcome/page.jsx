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
  Image,
  useColorModeValue
} from "@chakra-ui/react";

export default function Welcome() {
  const navigate = useNavigate();

  const bgGradient = useColorModeValue(
    "linear(to-br, purple.50, blue.50, pink.50)",
    "linear(to-br, purple.900, blue.900, pink.900)"
  );

  return (
    <Box 
      minH="100vh" 
      display="flex" 
      flexDirection="column" 
      bgGradient={bgGradient}
      position="relative"
      overflow="hidden"
    >
      <Box
        position="absolute"
        top="-10%"
        right="-5%"
        width="400px"
        height="400px"
        bg="purple.200"
        opacity={0.2}
        borderRadius="full"
        filter="blur(60px)"
      />
      <Box
        position="absolute"
        bottom="-10%"
        left="-5%"
        width="300px"
        height="300px"
        bg="blue.200"
        opacity={0.2}
        borderRadius="full"
        filter="blur(60px)"
      />

      <Container 
        maxW="md" 
        px={8} 
        py={20} 
        flex={1} 
        display="flex" 
        alignItems="center"
        position="relative"
        zIndex={1}
      >
        <VStack spacing={10} w="full" textAlign="center">
          <VStack spacing={6}>
            <Box
              p={4}
              bg="white"
              borderRadius="2xl"
              shadow="xl"
              transition="all 0.3s"
              _hover={{ transform: "scale(1.05)", shadow: "2xl" }}
            >
              <Image
                src={logoImage}
                alt="Rende-View Logo"
                w="24"
                h="24"
                objectFit="contain"
              />
            </Box>
            <VStack spacing={2}>
              <Heading
                size="2xl"
                fontFamily="'Playfair Display', serif"
                fontWeight="bold"
                color="purple.700"
                letterSpacing="tight"
              >
                Rende-View
              </Heading>
              <Text 
                fontSize="md" 
                fontWeight="medium" 
                color="purple.600"
                letterSpacing="wide"
                textTransform="uppercase"
              >
                Video-First Dating
              </Text>
            </VStack>
          </VStack>

          <VStack spacing={4} w="full" pt={4}>
            <Button
              onClick={() => navigate("/account/signin")}
              w="full"
              size="lg"
              variant="outline"
              colorScheme="purple"
              borderWidth={2}
              borderRadius="full"
              fontSize="md"
              fontWeight="bold"
              py={7}
              shadow="md"
              bg="white"
              _hover={{ 
                transform: "translateY(-2px)", 
                shadow: "lg",
                bg: "purple.50"
              }}
              transition="all 0.2s"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/onboarding/welcome")}
              w="full"
              size="lg"
              colorScheme="purple"
              borderRadius="full"
              fontSize="md"
              fontWeight="bold"
              py={7}
              shadow="lg"
              bgGradient="linear(to-r, purple.500, purple.600)"
              _hover={{ 
                bgGradient: "linear(to-r, purple.600, purple.700)",
                transform: "translateY(-2px)", 
                shadow: "xl"
              }}
              transition="all 0.2s"
            >
              Join Now
            </Button>
          </VStack>

          <Box pt={6}>
            <Text 
              fontSize="xs" 
              textAlign="center" 
              color="gray.600" 
              lineHeight="tall"
              maxW="sm"
            >
              By continuing, you agree to our{" "}
              <Text 
                as="span" 
                color="purple.600" 
                fontWeight="semibold"
                textDecoration="underline" 
                cursor="pointer"
                _hover={{ color: "purple.700" }}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text 
                as="span" 
                color="purple.600" 
                fontWeight="semibold"
                textDecoration="underline" 
                cursor="pointer"
                _hover={{ color: "purple.700" }}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
