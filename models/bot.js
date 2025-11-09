import mongoose from "mongoose";

const botSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true }, // sem @
    token: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Bot || mongoose.model("Bot", botSchema);
