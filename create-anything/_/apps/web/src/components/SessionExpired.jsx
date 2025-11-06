import React from "react";
import { Box, Container, Text, Button, VStack, Card, CardBody, Heading } from "@chakra-ui/react";
import { LogIn } from "lucide-react";
import { signIn } from "@auth/create/react";
import AppHeader from "@/components/AppHeader";

export default function SessionExpired() {
  const handleSignIn = () => {
    signIn("credentials-signin", { callbackUrl: "/discovery" });
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <AppHeader />
      <Container maxW="md" px={4} py={12}>
        <Card shadow="lg">
          <CardBody p={8}>
            <VStack spacing={6} align="stretch">
              <VStack spacing={2} align="center">
                <LogIn size={48} color="#7c3aed" />
                <Heading size="lg" color="gray.800" textAlign="center">
                  Session Expired
                </Heading>
                <Text color="red.500" textAlign="center">
                  Session expired. Please sign in.
                </Text>
              </VStack>

              <Button
                onClick={handleSignIn}
                colorScheme="purple"
                size="lg"
                w="full"
                leftIcon={<LogIn size={20} />}
              >
                Sign In
              </Button>

              <Text fontSize="sm" color="gray.600" textAlign="center">
                After signing in, you'll be redirected to your Discovery page
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}
