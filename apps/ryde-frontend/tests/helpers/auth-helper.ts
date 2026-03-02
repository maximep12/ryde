import { test, expect, type Page } from "@playwright/test"

export async function authenticateUser(page: Page): Promise<void> {
  const expectedToken = process.env.TEST_FRONT_AUTH_TOKEN

  if (!expectedToken) {
    throw new Error("TEST_FRONT_AUTH_TOKEN environment variable is required")
  }

  await page.goto(`/${expectedToken}`)
  await page.waitForURL("**/commercial")

  expect(page.url()).toBe("http://localhost:3000/commercial")

  const storedToken = await page.evaluate(() =>
    window.sessionStorage.getItem("token"),
  )

  const storedRole = await page.evaluate(() =>
    window.sessionStorage.getItem("role"),
  )

  expect(storedToken).toBe(expectedToken)
  expect(storedRole).not.toBeNull()
  expect(storedRole).toBe("admin")
}

export async function getAuthToken(page: Page): Promise<string> {
  const token = await page.evaluate(() =>
    window.sessionStorage.getItem("token"),
  )
  return token!
}

export async function getAuthRole(page: Page): Promise<string> {
  const role = await page.evaluate(() => window.sessionStorage.getItem("role"))
  return role!
}

export async function testAuthenticatedPage(
  page: Page,
  url: string,
): Promise<void> {
  await authenticateUser(page)

  if (url !== "/commercial") await page.goto(url)

  await expect(page).toHaveURL(url)
  await expect(page).toHaveTitle(/Ryde/)

  await expect(page.locator("text='Updates'")).toBeVisible()

  if (url !== "/fileUpload") {
    await expect(page.locator("iframe")).toBeVisible()
    await expect(page.locator("iframe")).toHaveAttribute("src", /metabase/)

    const iframe = page.frameLocator("iframe")
    await expect(
      iframe.getByRole("button", { name: "document icon Export" }),
    ).toBeVisible()
  }

  const token = await getAuthToken(page)
  const role = await getAuthRole(page)

  expect(token).toBeTruthy()
  expect(role).toBe("admin")
}

export { test, expect }
