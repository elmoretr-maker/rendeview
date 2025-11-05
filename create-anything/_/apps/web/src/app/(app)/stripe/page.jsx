import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Box, VStack, Heading, Text, Button, Spinner, Icon, Flex } from "@chakra-ui/react";

export default function Stripe() {
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutUrl = location.state?.checkoutUrl;
  const returnTo = location.state?.returnTo || "/onboarding/profile";
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (checkoutUrl) {
      const popup = window.open(checkoutUrl, "_blank", "popup,width=800,height=600");
      
      const checkClosed = setInterval(() => {
        try {
          if (popup && (popup.closed || popup.location.href.includes(window.location.origin))) {
            clearInterval(checkClosed);
            popup.close();
            setPaymentComplete(true);
          }
        } catch (e) {
          // Cross-origin error expected
        }
      }, 1000);

      return () => clearInterval(checkClosed);
    }
  }, [checkoutUrl]);

  if (!checkoutUrl) {
    return (
      <Flex minH="100vh" align="center" justify="center" px={6} bg="gray.50">
        <VStack spacing={4} textAlign="center" maxW="md">
          <Heading size="xl" color="gray.800">No Payment Session</Heading>
          <Text color="gray.600" mb={2}>No active payment session found.</Text>
          <Button
            onClick={() => navigate("/onboarding/membership")}
            colorScheme="purple"
            size="lg"
          >
            Back to Membership
          </Button>
        </VStack>
      </Flex>
    );
  }

  if (paymentComplete) {
    const isSubscriptionFlow = returnTo === "/settings/subscription";
    return (
      <Flex minH="100vh" align="center" justify="center" px={6} bg="gray.50">
        <VStack spacing={6} textAlign="center" maxW="md">
          <Box
            w={16}
            h={16}
            bg="green.100"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon viewBox="0 0 24 24" w={8} h={8} color="green.600">
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </Icon>
          </Box>
          <Heading size="xl" color="gray.800">Payment Complete!</Heading>
          <Text color="gray.600" mb={4}>
            {isSubscriptionFlow 
              ? "Your subscription has been upgraded successfully!" 
              : "Your subscription is now active. Let's set up your profile."}
          </Text>

          <Button
            onClick={() => navigate(returnTo)}
            w="full"
            colorScheme="purple"
            size="lg"
            shadow="lg"
            mb={3}
          >
            {isSubscriptionFlow ? "Back to Subscription" : "Continue to Profile Setup"}
          </Button>

          <Button
            onClick={() => navigate(isSubscriptionFlow ? "/settings/subscription" : "/onboarding/membership")}
            variant="ghost"
            leftIcon={<ArrowLeft size={18} />}
            color="gray.600"
            _hover={{ color: "gray.900" }}
          >
            {isSubscriptionFlow ? "View Subscription" : "Back to Membership"}
          </Button>
        </VStack>
      </Flex>
    );
  }

  return (
    <Flex minH="100vh" align="center" justify="center" px={6} bg="gray.50">
      <VStack spacing={4} textAlign="center" maxW="md">
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Heading size="lg" color="gray.800">Processing Payment</Heading>
        <Text color="gray.600" mb={4}>Please complete your purchase in the popup window...</Text>
        
        <Button
          onClick={() => navigate("/onboarding/membership")}
          variant="ghost"
          leftIcon={<ArrowLeft size={18} />}
          color="gray.600"
          _hover={{ color: "gray.900" }}
        >
          Cancel & Go Back
        </Button>
      </VStack>
    </Flex>
  );
}
