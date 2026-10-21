import { test } from "node:test";
import assert from "node:assert/strict";
import { protectedScreen, homeScreen } from "../../frontend/src/lib/navigation.js";

test("unverified URL screen/role choices cannot select another role's dashboard", () => {
  assert.equal(protectedScreen("student", "superadmin-dashboard"), "student-dashboard");
  assert.equal(protectedScreen("student", "technician-queue"), "student-dashboard");
  assert.equal(protectedScreen("admin", "user-management"), "admin-dashboard");
  assert.equal(protectedScreen("technician", "admin-dashboard"), "technician-queue");
  assert.equal(protectedScreen("superadmin", "user-management"), "user-management");
  assert.equal(protectedScreen("student", "room-reservation"), "room-reservation");
});
test("verified roles resolve their correct home screens", () => {
  assert.deepEqual([homeScreen("student"), homeScreen("technician"), homeScreen("admin"), homeScreen("superadmin")], ["student-dashboard", "technician-queue", "admin-dashboard", "superadmin-dashboard"]);
});
