import { model, models, Schema } from "mongoose";
import type { SiteSettings } from "../interfaces/site-settings.interface";

const schema = new Schema<SiteSettings & { _id: string }>(
  { _id: { type: String, required: true }, internalSystemsEnabled: { type: Boolean, required: true, default: false } },
  { timestamps: true, versionKey: false },
);

const SiteSettingsModel = models.SiteSettings || model<SiteSettings & { _id: string }>("SiteSettings", schema);
export default SiteSettingsModel;
