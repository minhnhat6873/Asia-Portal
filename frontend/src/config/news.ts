export interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: "Sự kiện" | "Tin tức" | "Nhân sự" | "Thông báo";
  date: string;
  author: string;
  image: string;
  featured?: boolean;
}

export const newsCategories = ["Tất cả", "Sự kiện", "Tin tức", "Nhân sự", "Thông báo"];

export const news: NewsItem[] = [
  {
    id: 1,
    title: "Team Building 2026 – Cùng nhau mạnh hơn",
    excerpt: "Chương trình Team Building thường niên 2026 của Á Châu đã diễn ra thành công rực rỡ tại Vũng Tàu với hơn 200 nhân viên tham gia.",
    content: "Chương trình Team Building thường niên 2026 của Á Châu đã diễn ra thành công rực rỡ tại khu resort Vũng Tàu từ ngày 05 đến 07/09/2026. Hơn 200 nhân viên đã tham gia các hoạt động gắn kết đội nhóm, thi đấu thể thao và chia sẻ những khoảnh khắc đáng nhớ cùng nhau. Ban Giám Đốc đã có những phát biểu truyền cảm hứng và trao thưởng cho các cá nhân, tập thể xuất sắc trong năm qua.",
    category: "Sự kiện",
    date: "10/09/2026",
    author: "Phòng Nhân Sự",
    image: "/assets/images/home-2.png",
    featured: true,
  },
  {
    id: 2,
    title: "Á Châu mở rộng dây chuyền sản xuất mới",
    excerpt: "Á Châu vừa khánh thành nhà máy sản xuất mới tại Bình Dương, nâng công suất lên 50 triệu sản phẩm/năm.",
    content: "Ngày 05/09/2026, Asia Food & Beverage chính thức khánh thành dây chuyền sản xuất thứ 3 tại nhà máy Bình Dương. Đây là bước đầu tư chiến lược nhằm đáp ứng nhu cầu thị trường ngày càng tăng, đặc biệt tại các thị trường xuất khẩu Đông Nam Á. Dây chuyền mới được trang bị công nghệ hiện đại, tự động hóa cao, giúp nâng tổng công suất lên 50 triệu sản phẩm/năm.",
    category: "Tin tức",
    date: "05/09/2026",
    author: "Phòng Marketing",
    image: "/assets/images/home-3.png",
    featured: true,
  },
  {
    id: 3,
    title: "Chào mừng các thành viên mới tháng 9",
    excerpt: "Á Châu trân trọng chào đón 5 thành viên mới gia nhập đại gia đình trong tháng 9/2026.",
    content: "Tháng 9/2026, Asia Food & Beverage hân hạnh chào đón 5 thành viên mới gia nhập đại gia đình. Đây là những tài năng trẻ được tuyển chọn kỹ lưỡng từ nhiều trường đại học hàng đầu và các doanh nghiệp lớn. Chúng tôi tin tưởng rằng với sự bổ sung này, Á Châu sẽ ngày càng phát triển và đạt được những mục tiêu đề ra.",
    category: "Nhân sự",
    date: "01/09/2026",
    author: "Phòng Nhân Sự",
    image: "/assets/images/home-4.png",
    featured: true,
  },
  {
    id: 4,
    title: "Á Châu đạt chứng nhận ISO 22000:2018",
    excerpt: "Hệ thống quản lý an toàn thực phẩm của Á Châu vừa được tổ chức quốc tế chứng nhận đạt chuẩn ISO 22000:2018.",
    content: "Asia Food & Beverage vừa chính thức nhận chứng nhận ISO 22000:2018 từ tổ chức Bureau Veritas. Đây là chuẩn mực quốc tế về hệ thống quản lý an toàn thực phẩm, khẳng định cam kết của Á Châu trong việc đảm bảo chất lượng và an toàn cho người tiêu dùng.",
    category: "Tin tức",
    date: "28/08/2026",
    author: "Phòng Sản Xuất",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop",
  },
  {
    id: 5,
    title: "Thông báo: Nghỉ lễ Quốc Khánh 2/9",
    excerpt: "Công ty thông báo lịch nghỉ lễ Quốc Khánh 2/9 và an toàn trong dịp nghỉ lễ.",
    content: "Kính gửi toàn thể cán bộ nhân viên, Nhân dịp Quốc Khánh 2/9, Công ty thông báo lịch nghỉ lễ như sau: Nghỉ từ ngày 01/09/2026 đến hết ngày 02/09/2026 (2 ngày). Ngày 03/09/2026 (Thứ Ba) đi làm bình thường. Chúc toàn thể CBNV và gia đình có kỳ nghỉ lễ vui vẻ, an toàn và sức khỏe!",
    category: "Thông báo",
    date: "25/08/2026",
    author: "Phòng Nhân Sự",
    image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&h=400&fit=crop",
  },
  {
    id: 6,
    title: "Á Châu ra mắt sản phẩm nước dừa cao cấp",
    excerpt: "Dòng sản phẩm Coconut Premium mới của Á Châu chính thức ra mắt thị trường với hương vị tươi mát tự nhiên.",
    content: "Asia Food & Beverage chính thức ra mắt dòng sản phẩm Coconut Premium – nước dừa nguyên chất cao cấp vào ngày 20/08/2026. Sản phẩm được chắt lọc từ những trái dừa tươi ngon nhất, không chất bảo quản, phù hợp cho người tiêu dùng hiện đại quan tâm đến sức khỏe.",
    category: "Tin tức",
    date: "20/08/2026",
    author: "Phòng Marketing",
    image: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=600&h=400&fit=crop",
  },
];
