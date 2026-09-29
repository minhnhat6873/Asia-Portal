import { Employee, MediaPost, UserAccount } from '../types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    code: 'ACF0001',
    fullName: 'Phạm An Khánh',
    email: 'nguyenvana@wana.com',
    phone: '0901 234 567',
    department: 'Phòng IT',
    position: 'IT',
    status: 'active',
    joinDate: '01/06/2022',
    birthDate: '15/03/1995',
    location: 'Hồ Chí Minh',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    bio: 'Chuyên viên kỹ thuật quản trị hệ thống hạ tầng mạng nội bộ, máy chủ và hỗ trợ người dùng tại văn phòng Hồ Chí Minh.'
  },
  {
    id: 'emp-2',
    code: 'ACF0002',
    fullName: 'Lê Hoàng Yến Nhi',
    email: 'nhi.le@asiafnb.com',
    phone: '0918 334 789',
    department: 'Phòng Marketing',
    position: 'Trưởng phòng Truyền thông',
    status: 'active',
    joinDate: '10/08/2021',
    birthDate: '22/11/1993',
    location: 'Hồ Chí Minh',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    bio: 'Chủ trì các chiến dịch truyền thông đa phương tiện, quản trị thương hiệu Á Châu trên báo chí và các kênh truyền thông số.'
  },
  {
    id: 'emp-3',
    code: 'ACF0003',
    fullName: 'Trần Đặng Minh Quân',
    email: 'quan.tran@asiafnb.com',
    phone: '0903 128 456',
    department: 'Ban Giám Đốc',
    position: 'Giám Đốc Vận Hành',
    status: 'active',
    joinDate: '15/03/2020',
    birthDate: '08/05/1986',
    location: 'Bình Dương',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bio: 'Hơn 15 năm kinh nghiệm quản trị chuỗi cung ứng và vận hành các nhà máy chiết rót đồ uống quy mô lớn.'
  },
  {
    id: 'emp-4',
    code: 'ACF0004',
    fullName: 'Nguyễn Văn Tuấn',
    email: 'tuan.nguyen@asiafnb.com',
    phone: '0937 452 901',
    department: 'Phòng R&D',
    position: 'Chuyên viên R&D',
    status: 'probation',
    joinDate: '01/08/2026',
    birthDate: '14/09/1998',
    location: 'Long An',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    bio: 'Nghiên cứu và phát triển công thức đồ uống giải khát từ nông sản nhiệt đới Việt Nam.'
  }
];

export const INITIAL_MEDIA_POSTS: MediaPost[] = [
  {
    id: 'media-team-building-2026',
    title: 'Team Building 2026 – Cùng nhau mạnh hơn',
    category: 'Sự kiện',
    summary: 'Chương trình Team Building thường niên 2026 của Á Châu đã diễn ra thành công rực rỡ tại Vũng Tàu với hơn 200 nhân viên tham gia.',
    content: 'Chương trình Team Building thường niên 2026 của Á Châu đã diễn ra thành công rực rỡ tại khu resort Vũng Tàu từ ngày 05 đến 07/09/2026. Hơn 200 nhân viên đã tham gia các hoạt động gắn kết đội nhóm, thi đấu thể thao và chia sẻ những khoảnh khắc đáng nhớ cùng nhau. Ban Giám Đốc đã có những phát biểu truyền cảm hứng và trao thưởng cho các cá nhân, tập thể xuất sắc trong năm qua.',
    coverImage: '/assets/images/home-2.png',
    authorDepartment: 'Phòng Nhân Sự',
    publishDate: '10/09/2026',
    status: 'published'
  },
  {
    id: 'media-1',
    title: 'Á Châu mở rộng dây chuyền sản xuất mới',
    category: 'Tin tức',
    summary: 'Á Châu vừa khánh thành nhà máy sản xuất mới tại Bình Dương, nâng công suất lên 50 triệu sản phẩm/năm.',
    content: 'Ngày 05/09/2026, Asia Food & Beverage chính thức khánh thành dây chuyền sản xuất thứ 3 tại nhà máy Bình Dương. Đây là bước đầu tư chiến lược nhằm đáp ứng nhu cầu thị trường ngày càng tăng, đặc biệt tại các thị trường xuất khẩu Đông Nam Á. Dây chuyền mới được trang bị công nghệ hiện đại, tự động hóa cao, giúp nâng tổng công suất lên 50 triệu sản phẩm/năm.',
    coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80',
    authorDepartment: 'Phòng Marketing',
    publishDate: '05/09/2026',
    status: 'published'
  },
  {
    id: 'media-2',
    title: 'Á Châu đạt chứng nhận ISO 22000:2018',
    category: 'Tin tức',
    summary: 'Hệ thống quản lý an toàn thực phẩm của Asia Food & Beverage đạt tiêu chuẩn quốc tế ISO 22000:2018.',
    content: 'Ngày 28/08/2026, tổ chức kiểm định quốc tế đã trao chứng nhận ISO 22000:2018 cho quy trình vận hành nhà máy của Á Châu, khẳng định chất lượng đạt chuẩn an toàn vệ sinh thực phẩm cao nhất.',
    coverImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
    authorDepartment: 'Phòng Quản Lý Chất Lượng',
    publishDate: '28/08/2026',
    status: 'published'
  },
  {
    id: 'media-3',
    title: 'Á Châu ra mắt sản phẩm nước dừa cao cấp',
    category: 'Tin tức',
    summary: 'Dòng sản phẩm nước dừa nguyên chất đóng lon tiện lợi chiết xuất từ dừa xiêm Bến Tre chính thức lên kệ.',
    content: 'Ngày 20/08/2026, Á Châu ra mắt thị trường dòng nước dừa cao cấp 100% tự nhiên không chất bảo quản, bổ sung nguồn điện giải tự nhiên dồi dào cho người tiêu dùng năng động.',
    coverImage: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=1000&q=80',
    authorDepartment: 'Phòng Marketing',
    publishDate: '20/08/2026',
    status: 'published'
  }
];

/**
 * Seed accounts for the "Phân quyền quản lý" tab, carried over from the
 * standalone `asia-f&b-beverage-admin` project so the approval workflow has
 * realistic demo data on first open (one approved admin, two pending
 * registrations, one approved media manager, one rejected request).
 */
export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'password123',
    fullName: 'admin',
    email: 'admin@asiafnb.com',
    phone: '0901 000 888',
    department: 'Ban Giám Đốc & IT',
    status: 'approved',
    role: 'admin',
    permissions: {
      canViewDashboard: true,
      canManageEmployees: true,
      canManageMedia: true,
      canManagePermissions: true,
      canExportData: true,
    },
    createdAt: '01/01/2026',
    approvedAt: '01/01/2026',
    approvedBy: 'Hệ thống tự động',
  },
  {
    id: 'user-pending-1',
    username: 'trandat',
    password: 'password123',
    fullName: 'Trần Quốc Đạt',
    email: 'dat.tran@asiafnb.com',
    phone: '0912 345 678',
    department: 'Phòng Marketing',
    status: 'pending',
    role: 'media_manager',
    permissions: {
      canViewDashboard: true,
      canManageEmployees: false,
      canManageMedia: true,
      canManagePermissions: false,
      canExportData: false,
    },
    createdAt: '22/09/2026',
    registrationReason:
      'Nhân viên mới gia nhập bộ phận Truyền thông số, cần quyền đăng bài viết báo chí và sự kiện.',
  },
  {
    id: 'user-pending-2',
    username: 'lethimai',
    password: 'password123',
    fullName: 'Lê Thị Mai',
    email: 'mai.le@asiafnb.com',
    phone: '0988 765 432',
    department: 'Phòng Nhân Sự',
    status: 'pending',
    role: 'hr_manager',
    permissions: {
      canViewDashboard: true,
      canManageEmployees: true,
      canManageMedia: false,
      canManagePermissions: false,
      canExportData: true,
    },
    createdAt: '21/09/2026',
    registrationReason:
      'Chuyên viên tuyển dụng & hồ sơ nhân sự, cần quyền quản lý danh sách và hồ sơ nhân viên.',
  },
  {
    id: 'user-approved-1',
    username: 'nhi.le',
    password: 'password123',
    fullName: 'Lê Hoàng Yến Nhi',
    email: 'nhi.le@asiafnb.com',
    phone: '0918 334 789',
    department: 'Phòng Marketing',
    status: 'approved',
    role: 'media_manager',
    permissions: {
      canViewDashboard: true,
      canManageEmployees: false,
      canManageMedia: true,
      canManagePermissions: false,
      canExportData: false,
    },
    createdAt: '15/08/2026',
    approvedAt: '16/08/2026',
    approvedBy: 'Quản Trị Viên Hệ Thống',
  },
  {
    id: 'user-rejected-1',
    username: 'hoangnam',
    password: 'password123',
    fullName: 'Nguyễn Hoàng Nam',
    email: 'nam.nguyen@external.com',
    phone: '0945 112 233',
    department: 'Đối tác bên ngoài',
    status: 'rejected',
    role: 'viewer',
    permissions: {
      canViewDashboard: false,
      canManageEmployees: false,
      canManageMedia: false,
      canManagePermissions: false,
      canExportData: false,
    },
    createdAt: '10/09/2026',
    rejectedAt: '11/09/2026',
    rejectedBy: 'Quản Trị Viên Hệ Thống',
    rejectReason: 'Chưa có hợp đồng cộng tác viên chính thức với công ty.',
  },
];
