import mongoose from "mongoose";

const gatewaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },           // ex: WiinPay, PushinPay
    clientId: { type: String, default: "" },
    clientSecret: { type: String, default: "" },
    token: { type: String, default: "" },
    active: { type: Boolean, default: false },
  },
  { _id: true }
);

const apiPixSchema = new mongoose.Schema(
  {
    gateways: [gatewaySchema],
    priority: {
      primary: { type: String, default: "" },   // name do gateway
      secondary: { type: String, default: "" },
      tertiary: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.ApiPix || mongoose.model("ApiPix", apiPixSchema);
