import { NextRequest, NextResponse } from "next/server";
import { ok, err } from "@/lib/api-types";
import { db } from "@/lib/storage/db";

const BUCKET = "learning-files";

async function ensureBucket() {
  const { data: buckets } = await db().storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await db().storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(err("No file provided"), { status: 400 });
    }

    await ensureBucket();

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}_${safeName}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await db()
      .storage.from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(err(uploadError.message), { status: 500 });
    }

    const { data: urlData } = db().storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json(
      ok({
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type || ext || "file",
      })
    );
  } catch (e) {
    return NextResponse.json(err(String(e)), { status: 500 });
  }
}
