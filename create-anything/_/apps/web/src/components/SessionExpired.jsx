import React from "react";
import { useNavigate } from "react-router";
import { Box, Container, Text, Button, VStack, Card, CardBody, Heading, Alert, AlertIcon, AlertDescription } from "@chakra-ui/react";
import { LogIn, RefreshCcw } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export default function SessionExpired() {
  const navigate = useNavigate();
  
  const handleSignIn = () => {
    navigate("/account/signin");
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
                <Text color="red.500" textAlign="center" fontWeight="semibold">
                  Your session has expired for security.
                </Text>
              </VStack>

              <Alert status="info" borderRadius="md">
                <AlertIcon as={RefreshCcw} />
                <AlertDescription fontSize="sm">
                  Refreshing this page won't help. Please click the button below to sign in again.
                </AlertDescription>
              </Alert>

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
