import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  deliverable: { type: String }, // 🔥 novo campo: link de entrega ou mensagem personalizada
});

export default mongoose.models.Plan || mongoose.model("Plan", planSchema);
