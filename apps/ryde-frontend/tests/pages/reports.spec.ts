import { test, testAuthenticatedPage } from "../helpers/auth-helper"

test("reports page loads correctly with proper authentication", async ({
  page,
}) => {
  await testAuthenticatedPage(page, "/reports")
})
