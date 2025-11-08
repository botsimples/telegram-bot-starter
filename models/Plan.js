import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  deliverable: String, // 🔥 novo campo: link ou mensagem pós-pagamento
});

export default mongoose.models.Plan || mongoose.model("Plan", planSchema);
