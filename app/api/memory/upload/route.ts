import { NextRequest, NextResponse } from "next/server";
import { createGenericFile, keypairIdentity } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { clusterApiUrl } from "@solana/web3.js";
import { resolveAtlasCountrySearch } from "@/lib/atlas-globe-data";

export const runtime = "nodejs";

const DEVNET_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL ?? clusterApiUrl("devnet");
const FANIQ_PASSPORT_PROGRAM_ID = process.env.NEXT_PUBLIC_FANIQ_PASSPORT_PROGRAM_ID ?? "FANXexs6P2Fst4NiiCdH9jx39sxPCGRRVpC2nevL5C6U";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseServerSecretKey() {
  const raw = process.env.IRYS_SERVER_SOLANA_SECRET_KEY ?? process.env.SOLANA_SERVER_SECRET_KEY;
  if (!raw) {
    throw new Error("Server-side Irys is not configured. Add IRYS_SERVER_SOLANA_SECRET_KEY to .env with a funded devnet Solana secret-key array.");
  }

  const trimmed = raw.trim();
  const values = trimmed.startsWith("[")
    ? JSON.parse(trimmed)
    : trimmed.split(",").map((item) => Number(item.trim()));

  if (!Array.isArray(values) || values.length < 64 || values.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) {
    throw new Error("IRYS_SERVER_SOLANA_SECRET_KEY must be a Solana secret-key byte array, like the output of solana-keygen.");
  }

  return new Uint8Array(values);
}

function extensionForType(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "png";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = cleanText(formData.get("title"), 80);
    const name = cleanText(formData.get("name"), 80) || "FANIQ Fan";
    const country = resolveAtlasCountrySearch(cleanText(formData.get("country"), 80));
    const note = cleanText(formData.get("note"), 180);
    const passportPublicKey = cleanText(formData.get("passportPublicKey"), 80);
    const image = formData.get("image");

    if (!title || !country || !(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "Add a title, country, and celebration image." }, { status: 400 });
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Upload an image file for this memory." }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "Keep the image under 8 MB so it can upload cleanly." }, { status: 400 });
    }

    const umi = createUmi(DEVNET_RPC_URL);
    const keypair = umi.eddsa.createKeypairFromSecretKey(parseServerSecretKey());
    umi.use(keypairIdentity(keypair)).use(
      irysUploader({
        address: "https://devnet.irys.xyz",
        providerUrl: DEVNET_RPC_URL,
      }),
    );

    const imageBytes = new Uint8Array(await image.arrayBuffer());
    const imageFile = createGenericFile(imageBytes, `faniq-memory-${Date.now()}.${extensionForType(image.type)}`, {
      displayName: image.name || "faniq-memory",
      contentType: image.type || "image/png",
    });

    const [imageUri] = await umi.uploader.upload([imageFile]);
    const metadataUri = await umi.uploader.uploadJson({
      name: title,
      description: note || `${name} minted a ${country} fan memory on FANIQ.`,
      image: imageUri,
      attributes: [
        { trait_type: "Country", value: country },
        { trait_type: "Creator Name", value: name },
        { trait_type: "Memory Type", value: "Celebration" },
        { trait_type: "Network", value: "Solana Devnet" },
        { trait_type: "Fan Passport", value: passportPublicKey || "FANIQ Passport" },
        { trait_type: "Passport Program", value: FANIQ_PASSPORT_PROGRAM_ID },
      ],
      properties: {
        category: "image",
        files: [{ uri: imageUri, type: image.type || "image/png" }],
      },
    });

    return NextResponse.json({ imageUri, metadataUri });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload memory metadata.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
