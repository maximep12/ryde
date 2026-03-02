import {
  test,
  expect,
  authenticateUser,
  getAuthToken,
  getAuthRole,
} from "./helpers/auth-helper"

test("token storage verification", async ({ page }) => {
  await authenticateUser(page)

  expect(page.url()).toBe("http://localhost:3000/commercial")

  const token = await getAuthToken(page)
  const role = await getAuthRole(page)

  expect(token).toBe(process.env.TEST_FRONT_AUTH_TOKEN)
  expect(role).toBe("admin")

  const storedToken = await page.evaluate(() =>
    window.sessionStorage.getItem("token"),
  )

  const storedRole = await page.evaluate(() =>
    window.sessionStorage.getItem("role"),
  )

  expect(storedToken).toBe(token)
  expect(storedRole).toBe(role)
})

test("user gets kicked out after session storage is cleared", async ({
  page,
}) => {
  await authenticateUser(page)

  expect(page.url()).toBe("http://localhost:3000/commercial")

  const token = await getAuthToken(page)
  const role = await getAuthRole(page)

  expect(token).toBeTruthy()
  expect(role).toBe("admin")

  await page.evaluate(() => window.sessionStorage.clear())

  await page.reload()

  await page.waitForURL("**/unauthorized")
  expect(page.url()).toBe("http://localhost:3000/unauthorized")

  await expect(
    page.locator("text=The page you tried to reach is unavailable."),
  ).toBeVisible()
  await expect(
    page.locator(
      "text=Visit the link you were sent to validate your identity and get access to more.",
    ),
  ).toBeVisible()
})
