import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createRoleManagementFixtures } = require('../../tests/helpers/roleManagementFixtures');

let fixtures;

test.beforeAll(async () => {
  fixtures = await createRoleManagementFixtures();
});

test.afterAll(async () => {
  if (fixtures) await fixtures.cleanup();
});

async function signIn(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  const submitButton = page.getByRole('button', { name: 'Đăng nhập' });
  await submitButton.hover();
  await page.waitForTimeout(200);
  await submitButton.click();
}

test('admin đổi role trên giao diện và thấy thay đổi đã lưu sau khi tải lại', async ({ page }) => {
  await signIn(page, fixtures.adminEmail, fixtures.password);
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/admin/roles');
  await expect(page.getByRole('heading', { name: 'Vai trò & phân quyền' })).toBeVisible();

  const targetRow = page.getByRole('row').filter({ hasText: fixtures.targetEmail });
  await expect(targetRow).toBeVisible();
  await targetRow.getByLabel(`Vai trò mới cho ${fixtures.targetEmail}`).selectOption('mechanic');
  await targetRow.getByRole('button', {
    name: `Lưu vai trò cho ${fixtures.targetEmail}`,
  }).click();

  await expect(page.getByRole('dialog', { name: 'Xác nhận đổi vai trò' })).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận đổi vai trò' }).click();
  await expect(targetRow).toContainText('Thợ sửa chữa');
  await expect(page.getByRole('status').filter({ hasText: 'Đã cập nhật vai trò' })).toBeVisible();

  await page.reload();
  const reloadedTargetRow = page.getByRole('row').filter({ hasText: fixtures.targetEmail });
  await expect(reloadedTargetRow).toContainText('Thợ sửa chữa');
  await expect(reloadedTargetRow.getByLabel(`Vai trò mới cho ${fixtures.targetEmail}`))
    .toHaveValue('mechanic');
});

test('tài khoản role thường không mở được trang quản lý role', async ({ page }) => {
  await signIn(page, fixtures.targetEmail, fixtures.password);
  await expect(page).not.toHaveURL(/\/login$/);

  await page.goto('/admin/roles');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Vai trò & phân quyền' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Vai trò & phân quyền' })).toHaveCount(0);
});
