import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  deliverable: String, // 🔥 novo campo: link/mensagem de entrega
});

export default mongoose.models.Plan || mongoose.model("Plan", planSchema);
