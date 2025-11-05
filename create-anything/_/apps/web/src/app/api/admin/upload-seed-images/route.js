import upload from "@/app/api/utils/upload";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(request) {
  try {
    const uploadedImages = {
      females: [],
      males: []
    };

    // Upload female profile images
    const femaleImages = [
      "professional_young_w_8b78e46f.jpg",
      "professional_young_w_13c96c2d.jpg",
      "professional_young_w_05ffd94d.jpg"
    ];

    for (const filename of femaleImages) {
      const filePath = path.join(process.cwd(), "attached_assets/stock_images", filename);
      const buffer = await readFile(filePath);
      const result = await upload({ buffer });
      uploadedImages.females.push(result.url);
    }

    // Upload male profile images
    const maleImages = [
      "professional_young_m_a9e144af.jpg",
      "professional_young_m_85d97fbf.jpg",
      "professional_young_m_ae594282.jpg"
    ];

    for (const filename of maleImages) {
      const filePath = path.join(process.cwd(), "attached_assets/stock_images", filename);
      const buffer = await readFile(filePath);
      const result = await upload({ buffer });
      uploadedImages.males.push(result.url);
    }

    return Response.json({
      ok: true,
      message: "Uploaded all seed profile images",
      images: uploadedImages
    });
  } catch (err) {
    console.error("POST /api/admin/upload-seed-images error", err);
    return Response.json({ 
      error: "Internal Server Error", 
      details: err.message 
    }, { status: 500 });
  }
}
