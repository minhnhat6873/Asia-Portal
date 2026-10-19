import { model, models, Schema } from "mongoose";

interface AccountAdministrationLock { _id: string; revision: number; }
const schema = new Schema<AccountAdministrationLock>({
  _id: { type: String, required: true },
  revision: { type: Number, default: 0 },
}, { versionKey: false });

export default models.AccountAdministrationLock || model<AccountAdministrationLock>("AccountAdministrationLock", schema);
