import { test, testAuthenticatedPage } from "../helpers/auth-helper"

test("amazon page loads correctly with proper authentication", async ({
  page,
}) => {
  await testAuthenticatedPage(page, "/amazon")
})
