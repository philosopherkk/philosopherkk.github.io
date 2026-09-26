import { expect, test } from '@playwright/test'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('privacy screen and touch target', async ({ page }) => {
  await page.goto('/safeshare/')
  await expect(page).toHaveTitle('SafeShare MD')
  await expect(page.getByRole('heading', { level: 1, name: 'SafeShare MD' })).toBeVisible()

  const privacy = page.getByRole('button', { name: 'Privacy' })
  await privacy.click()
  await expect(
    page.getByText('Nothing leaves your phone except the redacted image you choose to share.'),
  ).toBeVisible()
  await expect(page.getByText(/airplane mode/i)).toBeVisible()

  const box = await privacy.boundingBox()
  if (!box) throw new Error('Privacy button has no box')
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.width).toBeGreaterThanOrEqual(44)
})

test('picker error paths stay on the page and hide the file name', async ({ page }) => {
  const pageErrors: string[] = []
  const leaked: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  page.on('request', (request) => {
    const url = new URL(request.url())
    const sameOrigin = url.origin === 'http://127.0.0.1:4173'
    if (request.method() !== 'GET' || !sameOrigin) {
      leaked.push(`${request.method()} ${request.url()}`)
    }
  })

  await page.goto('/safeshare/')
  await page.getByRole('button', { name: 'Home' }).click()

  const rejectedName = 'patient-chan-report.heic'
  const cameraChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Take photo', exact: true }).click()
  await (
    await cameraChooser
  ).setFiles({
    name: rejectedName,
    mimeType: 'image/heic',
    buffer: Buffer.from('not-a-photo'),
  })

  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  const imageError = await alert.innerText()
  expect(imageError).toContain('could not be read')
  expect(imageError).not.toContain(rejectedName)
  expect(imageError.toLowerCase()).not.toContain('patient')
  expect(imageError).not.toContain('not-a-photo')
  await expect(page).toHaveTitle('SafeShare MD')
  expect(page.url()).not.toContain('patient')
  expect(page.url()).not.toContain('.heic')

  const plainName = 'Chan-Tai-Man.txt'
  const fileChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await fileChooser
  ).setFiles({
    name: plainName,
    mimeType: 'text/plain',
    buffer: Buffer.from('hello secret text'),
  })
  await expect(alert).toContainText('not supported')
  const typeError = await alert.innerText()
  expect(typeError).not.toContain(plainName)
  expect(typeError).not.toContain('Chan')
  expect(typeError).not.toContain('hello')
  expect(pageErrors).toEqual([])
  expect(leaked).toEqual([])
})

function onePagePdf(): Buffer {
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  const add = (content: string) => {
    offsets.push(body.length)
    body += `${offsets.length} 0 obj\n${content}\nendobj\n`
  }
  const stream = 'BT /F1 12 Tf 20 100 Td (ABC) Tj ET'
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  add(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  )
  add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const xrefAt = body.length
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  body += `${xref}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return Buffer.from(body)
}

test('a chosen image opens on the review screen', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  await page.goto('/safeshare/')

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: 'page.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  })

  await expect(page.getByRole('heading', { level: 2, name: 'Review' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible()
  await expect(page.getByText('1 page loaded on this phone.')).toBeVisible()
  expect(page.url()).not.toContain('page.png')
  expect(pageErrors).toEqual([])
})

test('a one-page pdf opens on the review screen', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  await page.goto('/safeshare/')

  const filename = 'lab-page.pdf'
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose image / PDF', exact: true }).click()
  await (
    await chooser
  ).setFiles({
    name: filename,
    mimeType: 'application/pdf',
    buffer: onePagePdf(),
  })

  await expect(page.getByRole('heading', { level: 2, name: 'Review' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.locator('body').innerText()).not.toContain(filename)
  expect(await page.locator('body').innerText()).not.toContain('ABC')
  expect(page.url()).not.toContain(filename)
  expect(pageErrors).toEqual([])
})
