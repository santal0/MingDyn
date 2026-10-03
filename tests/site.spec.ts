import { expect, test } from '@playwright/test'

test('overview, assets and original workbook work under the Pages subpath', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '一朝制度，循迹而读。' })).toBeVisible()
  await expect(page.locator('.stat-card').first()).toContainText('554')
  const download = await request.get('Data.xlsx')
  expect(download.ok()).toBeTruthy()
  expect((await download.body()).subarray(0, 2).toString()).toBe('PK')
  expect(errors).toEqual([])
})

test('search crosses office, era and family records, with useful empty state', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('textbox', { name: '搜索全部资料' }).fill('朱祁镇')
  await page.getByRole('button', { name: '检索', exact: true }).click()
  await expect(page.locator('.search-results')).toContainText('正统')
  await expect(page.locator('.search-results')).toContainText('天顺')
  await page.getByRole('textbox', { name: '检索关键词' }).fill('不可能存在的官职xyz')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await expect(page.getByRole('heading', { name: '没有找到匹配的条目' })).toBeVisible()
})

test('institution filters survive reload and source links reach original cells', async ({
  page,
}) => {
  await page.goto('./#/institutions')
  await page.getByRole('combobox', { name: '机构分类' }).selectOption('中央机构')
  await page.getByRole('textbox', { name: '筛选官职' }).fill('户部')
  await page.getByRole('combobox', { name: '官职品级' }).selectOption('正二品')
  await expect(page.locator('.office-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.office-table')).toContainText('户部尚书')
  await page.reload()
  await expect(page.getByRole('textbox', { name: '筛选官职' })).toHaveValue('户部')
  await page.getByRole('link', { name: '户部尚书', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('户部尚书')
  await page.getByRole('link', { name: 'B70', exact: true }).click()
  await expect(page.locator('.focused-cell')).toContainText('户部尚书')
  await expect(page.locator('.focused-cell')).toContainText('Sheet1!B70')
})

test('comparison has a three-item limit and an accessible close action', async ({ page }) => {
  await page.goto('./#/institutions?category=中央机构&q=尚书')
  const checkboxes = page.locator('.office-table input[type=checkbox]')
  for (let i = 0; i < 3; i++) await checkboxes.nth(i).check()
  await expect(checkboxes.nth(3)).toBeDisabled()
  await page.getByRole('button', { name: '比较官职', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.comparison-table thead th')).toHaveCount(4)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('two reigns link to the same emperor, and family branches expand', async ({ page }) => {
  await page.goto('./#/timeline')
  await page.getByRole('textbox', { name: '筛选帝王年表' }).fill('朱祁镇')
  const rows = page.locator('.timeline-row')
  await expect(rows).toHaveCount(2)
  expect(await rows.nth(0).getAttribute('href')).toBe(await rows.nth(1).getAttribute('href'))
  await rows.first().click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('朱祁镇')
  await expect(page.locator('.reign-detail')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.reign-detail')).toHaveCount(2)
  await page.goto('./#/families')
  await page.getByRole('button', { name: '展开朱棣后裔', exact: true }).click()
  await expect(page.locator('.depth-1').getByText('朱高炽', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '放大谱系' }).click()
  await expect(page.locator('.zoom-controls')).toContainText('125%')
})

test('generation character search and exam links use real records', async ({ page }) => {
  await page.goto('./#/families?tab=generations&q=燕王房')
  await expect(page.locator('.generation-card')).toHaveCount(1)
  await page.getByRole('button', { name: '燕王房第3字 祁', exact: true }).click()
  await expect(page.locator('.character-results')).toContainText('朱祁镇')
  await page.goto('./#/systems?tab=exams')
  await page.locator('.exam-steps').getByRole('button', { name: /殿试/ }).click()
  await expect(page.locator('.exam-content')).toContainText('状元')
  await page.getByRole('link', { name: '查阅修撰', exact: true }).click()
  await expect(page.locator('.office-table')).toContainText('史馆修撰')
})

test('source issues retain duplicate records and aliases', async ({ page }) => {
  await page.goto('./#/sources?tab=issues')
  await page.getByRole('combobox', { name: '问题类型' }).selectOption('人名异写')
  await expect(page.locator('.issue-card')).toHaveCount(2)
  await page.getByRole('combobox', { name: '问题类型' }).selectOption('重复条目')
  await expect(page.locator('.issue-grid')).toContainText('尚宝司')
  await page.goto('./#/sources?cell=F71')
  await expect(page.getByText('所属合并区域：F70:F111')).toBeVisible()
  await page.getByRole('link', { name: '查看起始单元格' }).click()
  await expect(page.locator('.focused-cell')).toContainText('财政')
})

test('main routes fit the viewport and mobile navigation closes', async ({ page }, testInfo) => {
  for (const route of ['', 'institutions', 'timeline', 'families', 'systems', 'sources']) {
    await page.goto(`./#/${route}`)
    await expect(page.locator('h1')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, `page overflow on ${route}`).toBeLessThanOrEqual(1)
  }
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: '打开导航', exact: true }).click()
    await expect(page.locator('.sidebar')).toHaveClass(/is-open/)
    await page
      .locator('.sidebar')
      .getByRole('link', { name: /官制机构/ })
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('官制机构')
    await expect(page.locator('.sidebar')).not.toHaveClass(/is-open/)
  }
})

test('catalogue loading error can be recovered', async ({ page }) => {
  await page.route('**/data/catalogue.json', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  )
  await page.goto('./')
  await expect(page.getByRole('heading', { name: '资料加载失败' })).toBeVisible()
  await page.unroute('**/data/catalogue.json')
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(page.getByRole('heading', { name: '一朝制度，循迹而读。' })).toBeVisible()
})
