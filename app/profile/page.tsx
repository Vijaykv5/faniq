import type { Metadata } from "next";
import { FanPassportProfile } from "@/components/profile/FanPassportProfile";

export const metadata: Metadata = {
  title: "Fan Passport | FANIQ",
  description: "Your FANIQ fan passport with minted World Cup memory NFTs.",
};

export default function ProfilePage() {
  return <FanPassportProfile />;
}
