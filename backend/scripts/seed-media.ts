import "dotenv/config";

import mongoose from "mongoose";

import { connectDatabase } from "../src/config/database.config";
import AccountModel from "../src/models/account.model";
import MediaModel from "../src/models/media.model";

const CREATOR_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || "kunnhat24@gmail.com";

const mediaPosts = [
  {
    title: "Team Building 2026 – Cùng nhau mạnh hơn",
    category: "Sự kiện",
    summary: "<p>Chương trình Team Building thường niên 2026 của Á Châu đã diễn ra thành công rực rỡ tại Vũng Tàu với hơn 200 nhân viên tham gia.</p>",
    content: "<p>Chương trình Team Building thường niên 2026 của Á Châu đã diễn ra thành công rực rỡ tại khu resort Vũng Tàu từ ngày 05 đến 07/09/2026. Hơn 200 nhân viên đã tham gia các hoạt động gắn kết đội nhóm, thi đấu thể thao và chia sẻ những khoảnh khắc đáng nhớ cùng nhau. Ban Giám Đốc đã có những phát biểu truyền cảm hứng và trao thưởng cho các cá nhân, tập thể xuất sắc trong năm qua.</p>",
    coverImage: "/assets/images/home-2.png", authorDepartment: "Phòng Nhân Sự", publishDate: new Date(Date.UTC(2026, 8, 10)),
  },
  {
    title: "Á Châu mở rộng dây chuyền sản xuất mới",
    category: "Tin tức",
    summary: "<p>Á Châu vừa khánh thành nhà máy sản xuất mới tại Bình Dương, nâng công suất lên 50 triệu sản phẩm/năm.</p>",
    content: "<p>Ngày 05/09/2026, Asia Food & Beverage chính thức khánh thành dây chuyền sản xuất thứ 3 tại nhà máy Bình Dương. Đây là bước đầu tư chiến lược nhằm đáp ứng nhu cầu thị trường ngày càng tăng, đặc biệt tại các thị trường xuất khẩu Đông Nam Á. Dây chuyền mới được trang bị công nghệ hiện đại, tự động hóa cao, giúp nâng tổng công suất lên 50 triệu sản phẩm/năm.</p>",
    coverImage: "/assets/images/home-3.png", authorDepartment: "Phòng Marketing", publishDate: new Date(Date.UTC(2026, 8, 5)),
  },
  {
    title: "Chào mừng các thành viên mới tháng 9",
    category: "Nhân sự",
    summary: "<p>Á Châu trân trọng chào đón 5 thành viên mới gia nhập đại gia đình trong tháng 9/2026.</p>",
    content: "<p>Tháng 9/2026, Asia Food & Beverage hân hạnh chào đón 5 thành viên mới gia nhập đại gia đình. Đây là những tài năng trẻ được tuyển chọn kỹ lưỡng từ nhiều trường đại học hàng đầu và các doanh nghiệp lớn. Chúng tôi tin tưởng rằng với sự bổ sung này, Á Châu sẽ ngày càng phát triển và đạt được những mục tiêu đề ra.</p>",
    coverImage: "/assets/images/home-4.png", authorDepartment: "Phòng Nhân Sự", publishDate: new Date(Date.UTC(2026, 8, 1)),
  },
  {
    title: "Á Châu đạt chứng nhận ISO 22000:2018",
    category: "Tin tức",
    summary: "<p>Hệ thống quản lý an toàn thực phẩm của Á Châu vừa được tổ chức quốc tế chứng nhận đạt chuẩn ISO 22000:2018.</p>",
    content: "<p>Asia Food & Beverage vừa chính thức nhận chứng nhận ISO 22000:2018 từ tổ chức Bureau Veritas. Đây là chuẩn mực quốc tế về hệ thống quản lý an toàn thực phẩm, khẳng định cam kết của Á Châu trong việc đảm bảo chất lượng và an toàn cho người tiêu dùng.</p>",
    coverImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop", authorDepartment: "Phòng Sản Xuất", publishDate: new Date(Date.UTC(2026, 7, 28)),
  },
  {
    title: "Thông báo: Nghỉ lễ Quốc Khánh 2/9",
    category: "Thông báo",
    summary: "<p>Công ty thông báo lịch nghỉ lễ Quốc Khánh 2/9 và an toàn trong dịp nghỉ lễ.</p>",
    content: "<p>Kính gửi toàn thể cán bộ nhân viên, Nhân dịp Quốc Khánh 2/9, Công ty thông báo lịch nghỉ lễ như sau: Nghỉ từ ngày 01/09/2026 đến hết ngày 02/09/2026 (2 ngày). Ngày 03/09/2026 (Thứ Ba) đi làm bình thường. Chúc toàn thể CBNV và gia đình có kỳ nghỉ lễ vui vẻ, an toàn và sức khỏe!</p>",
    coverImage: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&h=400&fit=crop", authorDepartment: "Phòng Nhân Sự", publishDate: new Date(Date.UTC(2026, 7, 25)),
  },
  {
    title: "Á Châu ra mắt sản phẩm nước dừa cao cấp",
    category: "Tin tức",
    summary: "<p>Dòng sản phẩm Coconut Premium mới của Á Châu chính thức ra mắt thị trường với hương vị tươi mát tự nhiên.</p>",
    content: "<p>Asia Food & Beverage chính thức ra mắt dòng sản phẩm Coconut Premium – nước dừa nguyên chất cao cấp vào ngày 20/08/2026. Sản phẩm được chắt lọc từ những trái dừa tươi ngon nhất, không chất bảo quản, phù hợp cho người tiêu dùng hiện đại quan tâm đến sức khỏe.</p>",
    coverImage: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=600&h=400&fit=crop", authorDepartment: "Phòng Marketing", publishDate: new Date(Date.UTC(2026, 7, 20)),
  },
] as const;

async function seedMedia(): Promise<void> {
  await connectDatabase();
  const creator = await AccountModel.findOne({ email: CREATOR_EMAIL, status: "active" }).lean();
  if (!creator) throw new Error(`Không tìm thấy tài khoản admin đang hoạt động: ${CREATOR_EMAIL}`);

  const createdBy = { accountId: String(creator._id), name: creator.name, email: creator.email };
  const result = await MediaModel.bulkWrite(mediaPosts.map((post) => ({
    updateOne: {
      filter: { title: post.title },
      update: { $set: { ...post, content: post.content, status: "published", isDeleted: false, deletedAt: null, createdBy } },
      upsert: true,
    },
  })));
  console.log(`Đã đồng bộ ${mediaPosts.length} bài viết (${result.upsertedCount} tạo mới, ${result.modifiedCount} cập nhật).`);
}

seedMedia()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Không thể tạo dữ liệu truyền thông");
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
