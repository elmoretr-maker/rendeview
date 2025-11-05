import React, { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Heading,
  IconButton,
  Progress,
  Text,
  VStack,
} from "@chakra-ui/react";
import { OnboardingGuard } from "@/components/onboarding/OnboardingGuard";

function ConsentContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  
  const returnTo = searchParams.get("returnTo");

  const totalSteps = 4;
  const stepIndex = 2;
  const progressPct = `${(stepIndex / totalSteps) * 100}%`;

  const accept = useCallback(async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_accepted: true }),
      });
      if (!res.ok) {
        throw new Error("Failed to save consent");
      }
      // After consent, go to returnTo if specified, otherwise membership selection
      navigate(returnTo || "/onboarding/membership", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Could not save consent");
    } finally {
      setSaving(false);
    }
  }, [navigate, returnTo]);

  const decline = useCallback(() => {
    navigate(`/onboarding/data-consent-required?returnTo=${encodeURIComponent(returnTo || "/onboarding/membership")}`);
  }, [navigate, returnTo]);

  return (
    <Box minH="100vh" bg="gray.50" position="relative">
      {/* Back Button */}
      <Box position="absolute" top={8} left={6}>
        <IconButton
          icon={<ArrowLeft size={20} />}
          aria-label="Back to welcome"
          variant="ghost"
          onClick={() => navigate("/onboarding/welcome")}
        />
      </Box>

      {/* Progress bar */}
      <Container maxW="2xl" pt={20} px={6}>
        <Box mb={8}>
          <Progress 
            value={(stepIndex / totalSteps) * 100} 
            colorScheme="purple" 
            size="sm" 
            borderRadius="full"
            mb={2}
          />
          <Text fontSize="sm" color="gray.600">
            Step {stepIndex} of {totalSteps}
          </Text>
        </Box>
      </Container>

      {/* Main Content */}
      <Container maxW="md" py={16}>
        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading size="lg" mb={3}>Data Consent</Heading>
                <Text color="gray.600">
                  We use your location and interests to ensure perfect matches and reliable scheduling. 
                  By consenting, you unlock all features for a superior dating experience.
                </Text>
              </Box>

              <VStack spacing={3}>
                <Button
                  colorScheme="teal"
                  size="lg"
                  width="full"
                  onClick={accept}
                  isLoading={saving}
                  loadingText="Saving..."
                >
                  Accept & Continue
                </Button>
                
                <Button
                  variant="ghost"
                  size="lg"
                  width="full"
                  onClick={decline}
                >
                  Decline
                </Button>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
}

export default function Consent() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  const accept = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent_accepted: true }),
      });
      if (!res.ok) {
        throw new Error("Failed to save consent");
      }
      navigate("/onboarding/membership", { replace: true });
    } catch (e) {
      console.error(e);
      alert("Could not save consent");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7fafc',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px' }}>
          Data Consent
        </h1>
        <p style={{ color: '#718096', marginBottom: '24px' }}>
          We use your location and interests to ensure perfect matches and reliable scheduling. 
          By consenting, you unlock all features for a superior dating experience.
        </p>
        <button
          onClick={accept}
          disabled={saving}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: saving ? '#999' : '#38b2ac',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            marginBottom: '12px'
          }}
        >
          {saving ? 'Saving...' : 'Accept & Continue'}
        </button>
        <button
          onClick={() => navigate("/onboarding/welcome")}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: 'transparent',
            color: '#718096',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
