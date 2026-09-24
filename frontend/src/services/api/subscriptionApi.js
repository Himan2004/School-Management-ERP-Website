import api from "../api";

export const fetchMySubscription = async () => {
  try {
    const response = await api.get("/organization/my-subscription");
    return response;
  } catch (error) {
    console.error("API Error [fetchMySubscription]:", error);
    throw error;
  }
};

// --- NEW TOGGLE API CALL ---
export const toggleAutoRenewal = async () => {
  try {
    const response = await api.patch(
      "/organization/my-subscription/auto-renew",
    );
    return response;
  } catch (error) {
    console.error("API Error [toggleAutoRenewal]:", error);
    throw error;
  }
};
// Add inside services/api/subscriptionApi.js
export const createUpgradeOrder = async (planId) => {
  return await api.post("/organization/my-subscription/upgrade-order", {
    planId,
  });
};

export const verifyUpgrade = async (paymentData) => {
  return await api.post(
    "/organization/my-subscription/verify-upgrade",
    paymentData,
  );
};
