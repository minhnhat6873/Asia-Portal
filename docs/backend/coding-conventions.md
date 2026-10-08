# Quy ước viết code backend

Cập nhật lần cuối: 2026-10-07. File nguồn đã đọc: `backend/tsconfig.json`, `backend/src/controllers/**`, `backend/src/services/**`, `backend/src/repositories/**`, `backend/src/models/**`, `backend/src/interfaces/**`, `backend/src/validates/**`, `backend/src/middlewares/**`, `backend/tests/**`.

## TypeScript và định dạng

- `strict: true` trong [backend/tsconfig.json](/D:/Vscode/Asia-Portal/backend/tsconfig.json:8); dùng `import type` cho kiểu, ví dụ [account.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/account.controller.ts:1).
- Tập giá trị hữu hạn là `as const`, sau đó suy type bằng `typeof ARR[number]`: [permission-group.interface.ts](/D:/Vscode/Asia-Portal/backend/src/interfaces/permission-group.interface.ts:1).
- Controller gõ `Request<Params, ResBody, ReqBody, Query>`, chẳng hạn `Request<{ id: string }, unknown, UpdateAdminAccountInput>` tại [account.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/account.controller.ts:40).
- Mã hiện dùng dấu nháy kép, `;`, trailing comma trong danh sách nhiều dòng, indent 2 spaces. Một vài dòng dài/format không đồng đều là hiện trạng, không phải chuẩn đã được kiểm tra bằng formatter.

## Controller

Controller mỏng: lấy input, gọi service, trả HTTP; lỗi bất đồng bộ luôn `next(error)`. Logic phụ trợ duy nhất đáng chú ý là controller nhân viên ghi audit sau create/update/delete/restore ([employee.controller.ts](/D:/Vscode/Asia-Portal/backend/src/controllers/admin/employee.controller.ts:23)).

```ts
// Rút gọn từ backend/src/controllers/admin/dashboard.controller.ts:5
export async function getDashboardSummary(_request: Request, response: Response, next: NextFunction) {
  try {
    const summary = await adminDashboardService.getSummary();
    response.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}
```

## Service

Export object có tên, kiểm tra quy tắc nghiệp vụ/ID, ném `AppError(statusCode, message)`; không thao tác `Request`/`Response`. `ensureValidId` dùng `mongoose.isValidObjectId`, ví dụ [employee.service.ts](/D:/Vscode/Asia-Portal/backend/src/services/admin/employee.service.ts:13).

```ts
// Rút gọn từ backend/src/services/admin/permission-group.service.ts:56
ensureValidId(id);
const group = await permissionGroupRepository.updateById(id, data);
if (!group) throw new AppError(404, "Không tìm thấy nhóm quyền");
return toResponse(group);
```

## Repository và schema

Repository chỉ đóng gói Mongoose; truy vấn đọc dùng `.lean()`, trường nhạy cảm dùng `select`, danh sách nhận `skip/limit/sort`. Nhân viên xóa mềm bằng `isDeleted`, chỉ `permanentlyDeleteById` xóa bản ghi đã ở thùng rác.

```ts
// Rút gọn từ backend/src/repositories/admin/employee.repository.ts:50
return EmployeeModel.findOneAndUpdate(
  { _id: id, isDeleted: { $ne: true } }, data,
  { new: true, runValidators: true },
).lean();
```

Schema có `timestamps`, `versionKey: false`, tái sử dụng model qua `models.X || model(...)`; khai báo index và `select: false` cho password/hash OTP.

```ts
// Rút gọn từ backend/src/models/account.model.ts:24
password: { type: String, required: true, select: false },
// ...
const AccountModel = models.Admin || model<Account>("Admin", accountSchema);
```

## Validate, auth, upload

- Joi schema nằm ở `validates/admin`; `validateBody` dùng `abortEarly: false`, `stripUnknown: true` và thay `request.body` bằng value ([validate.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/validate.middleware.ts:4)). `validateQuery` từ chối field lạ.
- Thông báo validation chủ yếu tiếng Việt; auth validate tự đặt message tiếng Việt tại [auth.validate.ts](/D:/Vscode/Asia-Portal/backend/src/validates/admin/auth.validate.ts:18).
- Route đặt `requirePermissions` hoặc role/auth trước controller. Upload dùng Multer/Cloudinary; middleware validate upload xóa asset mới khi body không hợp lệ ([employee-upload.middleware.ts](/D:/Vscode/Asia-Portal/backend/src/middlewares/employee-upload.middleware.ts:22)).

```ts
// Rút gọn từ backend/src/validates/admin/employee.validate.ts:35
export const createEmployeeSchema = Joi.object({
  employeeCode: employeeFields.employeeCode.required(),
  // ...
  gender: employeeFields.gender.required(),
});
```

## Test

Jest + ts-jest; unit test mock repository ở đầu file, dùng `jest.mocked`, clear mock từng test. Middleware test dựng `Request`/`Response` tối thiểu bằng `jest.fn()`.

```ts
// Rút gọn từ backend/tests/employee-permission.test.ts:5
const response = { status: jest.fn(), json: jest.fn() };
response.status.mockReturnValue(response);
requirePermissions("employees:delete")(requestMock([]), responseMock(), next);
```

