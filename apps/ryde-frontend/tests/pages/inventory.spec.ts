import { test, testAuthenticatedPage } from "../helpers/auth-helper"

test("inventory page loads correctly with proper authentication", async ({
  page,
}) => {
  await testAuthenticatedPage(page, "/inventory")
})
