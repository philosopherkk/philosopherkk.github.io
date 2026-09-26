import { expect, test } from '@playwright/test'

test('home, review, and privacy screens', async ({ page }) => {
  await page.goto('/safeshare/')
  await expect(page.getByRole('heading', { level: 1, name: 'SafeShare MD' })).toBeVisible()

  await page.getByRole('button', { name: 'Take photo' }).click()
  await expect(page.getByRole('status')).toContainText('Nothing leaves this phone.')

  await page.getByRole('button', { name: 'Review' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Review' })).toBeVisible()

  const privacy = page.getByRole('button', { name: 'Privacy' })
  await privacy.click()
  await expect(
    page.getByText('Nothing leaves your phone except the redacted image you choose to share.'),
  ).toBeVisible()
  await expect(page.getByText(/airplane mode/i)).toBeVisible()

  const box = await privacy.boundingBox()
  if (!box) {
    throw new Error('Privacy button has no box')
  }
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.width).toBeGreaterThanOrEqual(44)
})
