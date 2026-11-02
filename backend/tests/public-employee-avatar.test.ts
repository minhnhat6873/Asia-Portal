jest.mock("../src/models/employee.model", () => ({ __esModule: true, default: { find: jest.fn(), findOne: jest.fn() } }));
import EmployeeModel from "../src/models/employee.model";
import { userEmployeeRepository } from "../src/repositories/user/employee.repository";

it("excludes original images from every public employee query", () => {
  const query = { select: jest.fn(), sort: jest.fn(), skip: jest.fn(), limit: jest.fn(), lean: jest.fn() };
  for (const fn of Object.values(query)) fn.mockReturnValue(query);
  jest.mocked(EmployeeModel.find).mockReturnValue(query as never);
  jest.mocked(EmployeeModel.findOne).mockReturnValue(query as never);
  userEmployeeRepository.findAll({ filter: {}, skip: 0, limit: 10, sort: {} });
  userEmployeeRepository.findAllForSearch({}, {});
  userEmployeeRepository.findById("507f1f77bcf86cd799439011");
  expect(query.select).toHaveBeenCalledTimes(3);
  for (const [projection] of query.select.mock.calls) {
    expect(projection.split(" ")).toEqual(expect.arrayContaining(["-avatarOriginal", "-avatarOriginalPublicId"]));
  }
});
