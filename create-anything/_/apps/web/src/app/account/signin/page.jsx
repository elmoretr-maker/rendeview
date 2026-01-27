import { useState } from "react";
import { redirect, useSearchParams, useNavigate } from "react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import useAuth from "@/utils/useAuth";
import sql from "@/app/api/utils/sql";
import logoImage from "@/assets/logo-centered.png";
import {
  Box,
  VStack,
  HStack,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  InputGroup,
  InputRightElement,
  IconButton,
  Image,
  Alert,
  AlertIcon,
  Link,
} from "@chakra-ui/react";

export function meta() {
  return [
    { title: "Sign In | Rende-View" },
    { name: "description", content: "Sign in to your Rende-View account" },
  ];
}

export async function loader({ request }) {
  const { auth } = await import("@/auth");
  const session = await auth();
  
  if (session?.user?.id) {
    const url = new URL(request.url);
    const callbackUrl = url.searchParams.get('callbackUrl');
    
    if (callbackUrl) {
      if (callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
        return redirect(callbackUrl);
      }
    }
    
    const userId = Number(session.user.id);
    
    const [profileData] = await sql`
      SELECT 
        profile_completed,
        data_consent_given,
        membership_tier
      FROM auth_users 
      WHERE id = ${userId}
    `;
    
    if (!profileData) {
      return null;
    }
    
    if (!profileData.data_consent_given) {
      return redirect("/onboarding/data-consent-required");
    }
    
    if (!profileData.profile_completed) {
      return redirect("/onboarding/profile");
    }
    
    return redirect("/discovery");
  }
  
  return null;
}

const MotionBox = motion.create(Box);

export default function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { signInWithCredentials } = useAuth();
  
  const selectedTier = searchParams.get("tier");

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
      const needsCheckout = sessionStorage.getItem("needs_stripe_checkout") === "true";
      const storedTier = sessionStorage.getItem("selected_tier");
      const tier = selectedTier || storedTier;
      
      let callbackUrl = "/discovery";
      if (needsCheckout && tier && tier !== "free") {
        callbackUrl = `/onboarding/profile?tier=${tier}&checkout=pending`;
      } else if (tier) {
        callbackUrl = `/onboarding/profile?tier=${tier}`;
      }
      
      await signInWithCredentials({
        email,
        password,
        callbackUrl,
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

      setError(errorMessages[err.message] || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bgGradient="linear(135deg, purple.50 0%, white 50%, blue.50 100%)"
      py={8}
      px={4}
    >
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        w="full"
        maxW="420px"
      >
        <Box
          as="form"
          noValidate
          onSubmit={onSubmit}
          bg="white"
          borderRadius="3xl"
          p={10}
          shadow="2xl"
          position="relative"
        >
          <Button
            variant="ghost"
            leftIcon={<ArrowLeft size={18} />}
            color="purple.500"
            position="absolute"
            top={6}
            left={6}
            fontWeight="medium"
            size="sm"
            onClick={() => navigate("/onboarding/membership")}
            _hover={{ bg: "purple.50" }}
          >
            Back
          </Button>

          <VStack spacing={6} mt={8}>
            <VStack spacing={4} textAlign="center">
              <Flex
                w={20}
                h={20}
                bg="gray.900"
                borderRadius="2xl"
                align="center"
                justify="center"
                shadow="lg"
              >
                <Image
                  src={logoImage}
                  alt="Rende-View"
                  w="60px"
                  h="60px"
                  objectFit="contain"
                />
              </Flex>
              
              <Heading
                size="lg"
                color="purple.600"
                fontFamily="'Playfair Display', Georgia, serif"
              >
                Sign In to Rende-View
              </Heading>
              <Text color="gray.500" fontSize="sm">
                Continue your journey to meaningful connections
              </Text>
            </VStack>

            <VStack spacing={5} w="full">
              <FormControl>
                <FormLabel color="gray.700" fontWeight="medium" fontSize="sm">
                  Email
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  size="lg"
                  borderRadius="xl"
                  borderWidth="2px"
                  borderColor="gray.200"
                  _hover={{ borderColor: "gray.300" }}
                  _focus={{ 
                    borderColor: "purple.500", 
                    boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)" 
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.700" fontWeight="medium" fontSize="sm">
                  Password
                </FormLabel>
                <InputGroup size="lg">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    borderRadius="xl"
                    borderWidth="2px"
                    borderColor="gray.200"
                    _hover={{ borderColor: "gray.300" }}
                    _focus={{ 
                      borderColor: "purple.500", 
                      boxShadow: "0 0 0 1px var(--chakra-colors-purple-500)" 
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      variant="ghost"
                      icon={showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      color="gray.500"
                      _hover={{ bg: "transparent", color: "gray.700" }}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              {error && (
                <Alert status="error" borderRadius="xl">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                w="full"
                size="lg"
                colorScheme="purple"
                borderRadius="xl"
                fontWeight="semibold"
                isLoading={loading}
                loadingText="Signing in..."
                shadow="lg"
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'xl',
                }}
                transition="all 0.2s"
              >
                Sign In
              </Button>

              <Text color="gray.500" fontSize="sm" textAlign="center">
                Don't have an account?{" "}
                <Link
                  href={`/account/signup${selectedTier ? `?tier=${selectedTier}` : ''}`}
                  color="purple.500"
                  fontWeight="semibold"
                  _hover={{ textDecoration: "underline" }}
                >
                  Sign up
                </Link>
              </Text>
            </VStack>
          </VStack>
        </Box>

        <Text textAlign="center" fontSize="xs" color="gray.400" mt={6}>
          Step 3 of 3
        </Text>
      </MotionBox>
    </Flex>
  );
}
