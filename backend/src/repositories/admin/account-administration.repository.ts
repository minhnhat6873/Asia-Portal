import mongoose, { type ClientSession } from "mongoose";
import AccountAdministrationLockModel from "../../models/account-administration-lock.model";

const LOCK_ID = "account-administration";

export const accountAdministrationRepository = {
  async runExclusive<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    await AccountAdministrationLockModel.init();
    try {
      await AccountAdministrationLockModel.updateOne({ _id: LOCK_ID }, { $setOnInsert: { revision: 0 } }, { upsert: true });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    // A shared write prevents snapshot write-skew when two Admins try to
    // demote/lock/delete each other. The transaction retries write conflicts.
    return mongoose.connection.transaction(async (session) => {
      await AccountAdministrationLockModel.updateOne({ _id: LOCK_ID }, { $inc: { revision: 1 } }, { session });
      return work(session);
    }, { readPreference: "primary" });
  },
};
