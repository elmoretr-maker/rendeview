import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import useAuth from "@/utils/useAuth";
import useUser from "@/utils/useUser";
import logoImage from "@/assets/logo-centered.png";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Image,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
  useColorModeValue,
  Link as ChakraLink
} from "@chakra-ui/react";

export default function SignInPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { signInWithCredentials } = useAuth();
  const { data: user, loading: userLoading } = useUser();
  const navigate = useNavigate();

  const bgGradient = useColorModeValue(
    "linear(to-br, purple.50, blue.50, pink.50)",
    "linear(to-br, purple.900, blue.900, pink.900)"
  );

  if (userLoading) {
    return (
      <Box 
        minH="100vh" 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        bgGradient={bgGradient}
      >
        <Text 
          fontSize="lg" 
          color="gray.600" 
          fontWeight="medium"
          fontFamily="'Inter', sans-serif"
        >
          Loading...
        </Text>
      </Box>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await signInWithCredentials({
        email,
        password,
        callbackUrl: "/",
        redirect: true,
      });
    } catch (err) {
      const errorMessages = {
        OAuthSignin: "Couldn't start sign-in. Please try again or use a different method.",
        OAuthCallback: "Sign-in failed after redirecting. Please try again.",
        OAuthCreateAccount: "Couldn't create an account with this sign-in method. Try another option.",
        EmailCreateAccount: "This email can't be used to create an account. It may already exist.",
        Callback: "Something went wrong during sign-in. Please try again.",
        OAuthAccountNotLinked: "This account is linked to a different sign-in method. Try using that instead.",
        CredentialsSignin: "Incorrect email or password. Try again or reset your password.",
        AccessDenied: "You don't have permission to sign in.",
        Configuration: "Sign-in isn't working right now. Please try again later.",
        Verification: "Your sign-in link has expired. Request a new one.",
      };

      setError(
        errorMessages[err.message] || "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  };

  const isFormValid = email && password;

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
        py={12} 
        flex={1} 
        display="flex" 
        alignItems="center"
        position="relative"
        zIndex={1}
      >
        <Box 
          as="form" 
          onSubmit={onSubmit} 
          w="full" 
          bg="white" 
          borderRadius="2xl" 
          p={8} 
          shadow="2xl"
          position="relative"
        >
          <Button
            leftIcon={<ChevronLeft size={20} />}
            variant="outline"
            size="sm"
            position="absolute"
            top={6}
            left={6}
            colorScheme="purple"
            borderWidth={2}
            borderColor="purple.500"
            color="purple.600"
            fontFamily="'Inter', sans-serif"
            fontWeight="semibold"
            bg="white"
            _hover={{ 
              bg: "purple.50", 
              borderColor: "purple.600",
              color: "purple.700"
            }}
            _active={{
              bg: "purple.100"
            }}
            onClick={() => navigate("/welcome")}
          >
            Back
          </Button>

          <VStack spacing={8} mt={8}>
            <VStack spacing={4} textAlign="center">
              <Box
                p={3}
                bg="white"
                borderRadius="xl"
                shadow="md"
              >
                <Image
                  src={logoImage}
                  alt="Rende-View Logo"
                  w="12"
                  h="12"
                  objectFit="contain"
                />
              </Box>
              <Heading
                size="xl"
                fontFamily="'Playfair Display', serif"
                fontWeight="bold"
                color="gray.800"
              >
                Welcome Back
              </Heading>
            </VStack>

            <VStack spacing={5} w="full">
              <FormControl isRequired>
                <FormLabel 
                  fontSize="sm" 
                  fontWeight="medium" 
                  color="gray.700"
                  fontFamily="'Inter', sans-serif"
                >
                  Email
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your email"
                  size="lg"
                  borderRadius="lg"
                  borderColor="gray.200"
                  borderWidth="2px"
                  fontFamily="'Inter', sans-serif"
                  _hover={{ borderColor: "gray.300" }}
                  _focus={{ 
                    borderColor: "purple.500",
                    borderWidth: "2px",
                    outline: "none"
                  }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel 
                  fontSize="sm" 
                  fontWeight="medium" 
                  color="gray.700"
                  fontFamily="'Inter', sans-serif"
                >
                  Password
                </FormLabel>
                <InputGroup size="lg">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your password"
                    borderRadius="lg"
                    borderColor="gray.200"
                    borderWidth="2px"
                    fontFamily="'Inter', sans-serif"
                    _hover={{ borderColor: "gray.300" }}
                    _focus={{ 
                      borderColor: "purple.500",
                      borderWidth: "2px",
                      outline: "none"
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      icon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      variant="ghost"
                      size="sm"
                      color="gray.500"
                      _hover={{ color: "gray.700" }}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              {error && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  <Text fontSize="sm" fontFamily="'Inter', sans-serif">{error}</Text>
                </Alert>
              )}

              <Button
                type="submit"
                isLoading={loading}
                loadingText="Signing in..."
                isDisabled={!isFormValid}
                w="full"
                size="lg"
                colorScheme="purple"
                borderRadius="full"
                fontSize="md"
                fontWeight="bold"
                fontFamily="'Inter', sans-serif"
                py={7}
                shadow="lg"
                bgGradient="linear(to-r, purple.500, purple.600)"
                _hover={{ 
                  bgGradient: "linear(to-r, purple.600, purple.700)",
                  transform: "translateY(-2px)", 
                  shadow: "xl"
                }}
                _active={{
                  bgGradient: "linear(to-r, purple.700, purple.800)",
                }}
                _disabled={{
                  opacity: 0.5,
                  cursor: "not-allowed",
                  _hover: {
                    transform: "none",
                    shadow: "lg"
                  }
                }}
                transition="all 0.2s"
              >
                Sign In
              </Button>

              <Text 
                fontSize="sm" 
                color="gray.600" 
                textAlign="center"
                fontFamily="'Inter', sans-serif"
              >
                Don't have an account?{" "}
                <ChakraLink
                  color="purple.600"
                  fontWeight="semibold"
                  fontFamily="'Inter', sans-serif"
                  _hover={{ color: "purple.700", textDecoration: "underline" }}
                  onClick={() => navigate("/onboarding/welcome")}
                >
                  Sign up
                </ChakraLink>
              </Text>
            </VStack>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}
