import React from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button
} from "@chakra-ui/react";

export default function ConsentRequired() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const returnTo = searchParams.get("returnTo") || "/discovery";

  return (
    <Box minH="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" px={6} bg="white">
      <Container maxW="md">
        <VStack spacing={6} align="start">
          <Heading size="xl" color="gray.800">Consent Required</Heading>
          <Text color="gray.600">
            You must accept data consent to use the app features.
          </Text>
          <Button
            onClick={() => navigate(`/onboarding/consent?returnTo=${encodeURIComponent(returnTo)}`, { replace: true })}
            w="full"
            py={6}
            borderRadius="xl"
            colorScheme="purple"
            fontSize="md"
          >
            Return to Consent
          </Button>
        </VStack>
      </Container>
    </Box>
  );
}
