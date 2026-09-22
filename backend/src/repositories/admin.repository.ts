import AdminModel from "../models/admin.model";

export const adminRepository = {
  findActiveByEmailWithPassword(email: string) {
    return AdminModel.findOne({
      email: email.toLowerCase(),
      status: "active",
    }).select("+password");
  },

  findActiveById(id: string) {
    return AdminModel.findOne({ _id: id, status: "active" }).lean();
  },
};