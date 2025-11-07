import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MESSAGE_CREDIT_PRICING } from "@/utils/membershipTiers";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

const COLORS = {
  primary: "#5B3BAF",
  secondary: "#00BFA6",
  text: "#2C3E50",
  bg: "#F9F9F9",
  cardBg: "#F3F4F6",
};

export default function BuyCredits() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [selectedPack, setSelectedPack] = useState("PACK_LARGE");
  const [pricingData, setPricingData] = useState(null);
  const [loaded, errorFont] = useFonts({ Inter_400Regular, Inter_600SemiBold });

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      setLoadingPricing(true);
      const res = await fetch("/api/messages/credits/purchase");
      if (res.ok) {
        const data = await res.json();
        setPricingData(data);
      }
    } catch (err) {
      console.error("Failed to fetch pricing:", err);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);

      Alert.alert(
        "Purchase Confirmation",
        `This will purchase ${selectedPack}. Stripe integration coming soon!`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]
      );

      /* Future Stripe integration:
      const res = await fetch("/api/messages/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packSize: selectedPack,
          stripePaymentIntentId: 'pi_xxx',
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to complete purchase");
      }

      const result = await res.json();
      if (result.success) {
        Alert.alert("Success", `Successfully purchased ${result.creditsAdded} credits!`);
        router.back();
      }
      */
    } catch (err) {
      console.error("Credit purchase error:", err);
      Alert.alert("Error", err.message || "Failed to complete purchase");
    } finally {
      setLoading(false);
    }
  };

  if (!loaded && !errorFont) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const packs = pricingData?.packs || [
    { id: "PACK_SMALL", ...MESSAGE_CREDIT_PRICING.STANDARD.PACK_SMALL },
    { id: "PACK_MEDIUM", ...MESSAGE_CREDIT_PRICING.STANDARD.PACK_MEDIUM },
    { id: "PACK_LARGE", ...MESSAGE_CREDIT_PRICING.STANDARD.PACK_LARGE },
  ];

  const hasActiveReward = pricingData?.hasActiveReward || false;
  const videoCallsThisMonth = pricingData?.videoCallsThisMonth || 0;
  const currentBalance = pricingData?.currentBalance || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Message Credits</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>{currentBalance} credits</Text>
        </View>

        {/* Reward Status Banner */}
        {hasActiveReward ? (
          <View style={styles.rewardActiveCard}>
            <Text style={styles.rewardEmoji}>🎉</Text>
            <View style={styles.rewardTextContainer}>
              <Text style={styles.rewardActiveTitle}>50% Bonus Active!</Text>
              <Text style={styles.rewardActiveSubtitle}>
                You completed {videoCallsThisMonth} video calls this month. Keep it up!
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.rewardInactiveCard}>
            <Text style={styles.rewardEmoji}>📹</Text>
            <View style={styles.rewardTextContainer}>
              <Text style={styles.rewardInactiveTitle}>
                Complete 3 video calls this month for 50% bonus!
              </Text>
              <Text style={styles.rewardInactiveSubtitle}>
                Progress: {videoCallsThisMonth}/3 video calls
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.description}>
          Credits never expire and work across all your chats!
        </Text>

        {/* Loading state */}
        {loadingPricing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            {/* Pack Selection */}
            <View style={styles.packsContainer}>
              {packs.map((pack) => (
                <TouchableOpacity
                  key={pack.id}
                  onPress={() => setSelectedPack(pack.id)}
                  style={[
                    styles.packCard,
                    selectedPack === pack.id && styles.packCardSelected,
                  ]}
                >
                  <View style={styles.packContent}>
                    <View style={styles.packInfo}>
                      <View style={styles.packTitleRow}>
                        <Text style={styles.packTitle}>{pack.credits} Messages</Text>
                        {pack.bonusPercentage && (
                          <View style={styles.bonusBadge}>
                            <Text style={styles.bonusText}>+{pack.bonusPercentage}% Bonus!</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.packPrice}>
                        {pack.price}
                        {pack.label && (
                          <Text style={styles.packLabel}> {pack.label}</Text>
                        )}
                      </Text>
                      <Text style={styles.packCost}>
                        ${pack.perMessageCost.toFixed(2)} per message
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioButton,
                        selectedPack === pack.id && styles.radioButtonSelected,
                      ]}
                    >
                      {selectedPack === pack.id && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buyButton]}
                onPress={handlePurchase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buyButtonText}>Buy Now</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/settings/subscription")}
              style={styles.upgradeLink}
            >
              <Text style={styles.upgradeLinkText}>
                Or{" "}
                <Text style={styles.upgradeLinkBold}>upgrade your tier</Text> for
                more daily messages
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
    marginBottom: 4,
    fontFamily: "Inter_400Regular",
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    fontFamily: "Inter_600SemiBold",
  },
  rewardActiveCard: {
    flexDirection: "row",
    backgroundColor: "#D4EDDA",
    borderWidth: 1,
    borderColor: "#28A745",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rewardInactiveCard: {
    flexDirection: "row",
    backgroundColor: "#FFF3CD",
    borderWidth: 1,
    borderColor: "#FFC107",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rewardEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  rewardTextContainer: {
    flex: 1,
  },
  rewardActiveTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#155724",
    marginBottom: 4,
    fontFamily: "Inter_600SemiBold",
  },
  rewardActiveSubtitle: {
    fontSize: 12,
    color: "#155724",
    opacity: 0.8,
    fontFamily: "Inter_400Regular",
  },
  rewardInactiveTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 4,
    fontFamily: "Inter_600SemiBold",
  },
  rewardInactiveSubtitle: {
    fontSize: 12,
    color: "#856404",
    opacity: 0.8,
    fontFamily: "Inter_400Regular",
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
    marginBottom: 16,
    fontFamily: "Inter_400Regular",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  packsContainer: {
    marginBottom: 24,
  },
  packCard: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F9F5FF",
  },
  packContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packInfo: {
    flex: 1,
  },
  packTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  packTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  bonusBadge: {
    marginLeft: 8,
    backgroundColor: "#28A745",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bonusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "white",
    fontFamily: "Inter_600SemiBold",
  },
  packPrice: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
    marginBottom: 4,
    fontFamily: "Inter_400Regular",
  },
  packLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "bold",
    fontFamily: "Inter_600SemiBold",
  },
  packCost: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.6,
    fontFamily: "Inter_400Regular",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: COLORS.cardBg,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  buyButton: {
    backgroundColor: COLORS.primary,
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    fontFamily: "Inter_600SemiBold",
  },
  upgradeLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  upgradeLinkText: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.6,
    fontFamily: "Inter_400Regular",
  },
  upgradeLinkBold: {
    fontWeight: "bold",
    textDecorationLine: "underline",
    fontFamily: "Inter_600SemiBold",
  },
});
