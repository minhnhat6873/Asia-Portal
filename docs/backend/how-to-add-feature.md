# Checklist thêm tính năng backend

Cập nhật lần cuối: 2026-10-07. File nguồn đã đọc: `backend/src/interfaces/**`, `backend/src/models/**`, `backend/src/repositories/**`, `backend/src/services/**`, `backend/src/validates/**`, `backend/src/controllers/**`, `backend/src/routes/**`, `backend/src/middlewares/**`, `backend/tests/**`.

Dùng thứ tự này cho một domain API mới; chỉ bỏ bước khi không áp dụng và ghi rõ lý do trong PR.

1. **Interface** — tạo `src/interfaces/<domain>.interface.ts`; định nghĩa input, entity, response và mảng `as const` cho enum. Nếu cần `Request.admin`, dùng kiểu mở rộng đã có ở `src/types/express.d.ts`.
2. **Model** — tạo `src/models/<domain>.model.ts`; schema typed, `timestamps`, `versionKey: false`, index cần truy vấn, `select: false` cho secret; export `models.X || model(...)`.
3. **Repository** — tạo `src/repositories/admin|user/<domain>.repository.ts`; chỉ chứa Mongoose, `.lean()` cho đọc, select dữ liệu theo audience, filter soft delete/pagination nếu domain cần.
4. **Service** — tạo `src/services/admin|user/<domain>.service.ts`; export `const ...Service = {}`, kiểm tra ObjectId/quy tắc/trùng lặp, ném `AppError`; map `_id` sang `id` nếu contract chọn dạng đó.
5. **Validate** — tạo `src/validates/admin/<domain>.validate.ts` bằng Joi và message tiếng Việt; body qua `validateBody`, query qua `validateQuery`.
6. **Controller** — tạo `src/controllers/admin|user/<domain>.controller.ts`; gõ `Request` đầy đủ, mỏng, `try/catch → next(error)`, response `{ success: true, message?, data? }`. Nếu là sự kiện cần trace, gọi `auditLogService` theo quy ước hiện có.
7. **Route** — tạo `src/routes/admin|user/<domain>.route.ts`; đặt validate/auth/role/permission/upload trước controller, rồi mount ở `src/routes/index.route.ts`. Public route cần cân nhắc select/filter dữ liệu riêng.
8. **Test** — thêm `tests/<domain>.test.ts`; mock repository bằng `jest.mock`, test happy path, validation/permission và lỗi nghiệp vụ quan trọng. Không có test integration HTTP hiện hữu để làm mẫu trong repo.
9. **Tài liệu** — cập nhật `docs/backend/endpoints.md`, `api-response.md` khi contract mới, `auth-and-permissions.md` khi thêm auth/quyền/OTP, `known-issues.md` nếu phát hiện nợ kỹ thuật; cập nhật `structure.md` khi thêm tầng/module.

## Bộ tệp thường chạm

```text
src/interfaces/<domain>.interface.ts
src/models/<domain>.model.ts
src/repositories/{admin|user}/<domain>.repository.ts
src/services/{admin|user}/<domain>.service.ts
src/validates/admin/<domain>.validate.ts
src/controllers/{admin|user}/<domain>.controller.ts
src/routes/{admin|user}/<domain>.route.ts
src/routes/index.route.ts
tests/<domain>.test.ts
docs/backend/{endpoints,api-response,auth-and-permissions,structure}.md
```

Trước khi merge: chạy `cd backend && yarn build && yarn test`; kiểm tra thứ tự middleware và kiểm tra response không rò field dành cho admin sang `/user/*`.

