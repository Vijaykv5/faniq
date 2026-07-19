import type { Metadata } from "next";
import { CreateMemoryExperience } from "@/components/globe/CreateMemoryExperience";

export const metadata: Metadata = {
  title: "Create Memory | FANIQ",
  description: "Create and prepare a FANIQ fan memory for minting.",
};

export default async function CreateMemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;

  return <CreateMemoryExperience initialCountry={country} />;
}
