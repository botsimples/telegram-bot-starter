import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  deliverable: {
    type: String, // Pode ser link, texto, mensagem ou arquivo
    default: "",
  },
});

export default mongoose.models.Plan || mongoose.model("Plan", planSchema);
